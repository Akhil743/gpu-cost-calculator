/*
 * The maths. Pure functions only: no DOM, so they run in the browser and under `node --test`.
 * Every assumption is a named parameter with a default, and the Method section of the page
 * explains each one.
 */
(function (root) {
  const DAYS_PER_MONTH = 30;
  const SECONDS_PER_DAY = 86400;
  const BYTES_PER_PARAM = { bf16: 2, fp8: 1, int4: 0.5 };

  // ---------- API token costs ----------

  /**
   * Cost of one request on one hosted model.
   * workload: { inputTokens, outputTokens, cachedShare (0–1 of input tokens served from cache),
   *             batchShare (0–1 of requests sent through the batch tier) }
   */
  function requestCost(model, w) {
    const longCtx = model.longContext && w.inputTokens > model.longContext.above ? model.longContext : null;
    const rate = longCtx || model;
    const cachedRate = rate.cached == null ? rate.input : rate.cached;

    const freshIn = w.inputTokens * (1 - w.cachedShare);
    const cachedIn = w.inputTokens * w.cachedShare;
    const out = w.outputTokens;

    const realtime = {
      input: (freshIn * rate.input) / 1e6,
      cached: (cachedIn * cachedRate) / 1e6,
      output: (out * rate.output) / 1e6,
    };

    // Batch tier: providers halve input, cached input and output. Models without a batch tier
    // are charged the real-time price for the batched share.
    const hasBatch = model.batchInput != null && model.batchOutput != null && !longCtx;
    const batch = hasBatch
      ? {
          input: (freshIn * model.batchInput) / 1e6,
          cached: (cachedIn * cachedRate * (model.batchInput / model.input)) / 1e6,
          output: (out * model.batchOutput) / 1e6,
        }
      : realtime;

    const b = w.batchShare;
    const parts = {
      input: realtime.input * (1 - b) + batch.input * b,
      cached: realtime.cached * (1 - b) + batch.cached * b,
      output: realtime.output * (1 - b) + batch.output * b,
    };
    return {
      ...parts,
      total: parts.input + parts.cached + parts.output,
      longContext: Boolean(longCtx),
      batchApplied: hasBatch && b > 0,
    };
  }

  /** Monthly cost of a workload on every model, cheapest first. */
  function compareModels(models, w) {
    const monthlyRequests = w.requestsPerDay * DAYS_PER_MONTH;
    return models
      .map((model) => {
        const perRequest = requestCost(model, w);
        const monthly = perRequest.total * monthlyRequests;
        return {
          model,
          perRequest,
          per1k: perRequest.total * 1000,
          monthly,
          perUser: w.mau > 0 ? monthly / w.mau : null,
        };
      })
      .sort((a, b) => a.monthly - b.monthly);
  }

  // ---------- Self-hosting an open-weights model ----------

  /** KV-cache bytes per token at 16-bit: K and V for every layer and KV head. */
  function kvBytesPerToken(m, kvPrecision) {
    const bytes = kvPrecision === 'fp8' ? 1 : 2;
    return 2 * m.layers * m.kvHeads * m.headDim * bytes;
  }

  /**
   * Throughput and cost of serving one model replica.
   * opts: { precision, kvPrecision, gpusPerReplica ('auto' or a number), concurrency,
   *         inputTokens, outputTokens, gpuPrice ($/GPU-hour), bandwidthEfficiency, mfu,
   *         utilisation (average load as a share of capacity), opsOverhead (share added on top) }
   */
  function selfHost(m, gpu, o) {
    const opts = {
      precision: 'fp8', kvPrecision: 'bf16', gpusPerReplica: 'auto', concurrency: 32,
      bandwidthEfficiency: 0.7, mfu: 0.4, prefillMfu: 0.5, utilisation: 0.6, opsOverhead: 0,
      ...o,
    };
    const bpp = BYTES_PER_PARAM[opts.precision];
    const weightBytes = m.totalB * 1e9 * bpp;
    const kvPerToken = kvBytesPerToken(m, opts.kvPrecision);
    // Average tokens held in cache per sequence while it decodes: the prompt plus half the answer.
    const ctx = opts.inputTokens + opts.outputTokens / 2;
    const kvPerSeq = kvPerToken * ctx;
    const usableMemory = (n) => n * gpu.memory * 1e9 * 0.9; // 10% for activations and runtime

    // GPUs per replica: the smallest of 1, 2, 4, 8 that fits the weights plus 8 sequences of cache.
    let n = opts.gpusPerReplica;
    if (n === 'auto') {
      n = [1, 2, 4, 8].find((k) => usableMemory(k) >= weightBytes + 8 * kvPerSeq) || null;
    }
    if (!n) return { feasible: false, reason: 'Needs more than 8 GPUs of this type for one replica.' };
    if (usableMemory(n) <= weightBytes) {
      return { feasible: false, reason: 'The weights alone do not fit in this many GPUs.' };
    }

    const maxBatch = Math.floor((usableMemory(n) - weightBytes) / kvPerSeq);
    const batch = Math.max(0, Math.min(opts.concurrency, maxBatch));
    if (batch < 1) return { feasible: false, reason: 'No memory left for the KV cache at this context length.' };

    // Tensor parallelism across GPUs costs some efficiency.
    const scale = n === 1 ? 1 : n * 0.85;
    const bandwidth = gpu.bandwidth * 1e12 * scale * opts.bandwidthEfficiency;
    const flopsPeak = (opts.precision === 'bf16' || gpu.fp8 == null ? gpu.bf16 : gpu.fp8) * 1e12 * scale;

    // Decode step: read the weights the batch touches plus every sequence's KV cache, or compute,
    // whichever is slower. For mixture-of-experts models a batch touches more experts as it grows.
    const activeShare = m.activeB / m.totalB;
    const weightsRead = activeShare >= 1 ? weightBytes : weightBytes * Math.max(activeShare, 1 - Math.pow(1 - activeShare, batch));
    const memoryTime = (weightsRead + batch * kvPerSeq) / bandwidth;
    const computeTime = (2 * m.activeB * 1e9 * batch) / (flopsPeak * opts.mfu);
    const stepTime = Math.max(memoryTime, computeTime);
    const decodeTokensPerSec = batch / stepTime;

    // Prefill is compute-bound: 2 × active params FLOPs per prompt token.
    const prefillSeconds = (2 * m.activeB * 1e9 * opts.inputTokens) / (flopsPeak * opts.prefillMfu);
    const replicaSecondsPerRequest = prefillSeconds + opts.outputTokens / decodeTokensPerSec;

    const replicaPerHour = n * opts.gpuPrice * (1 + opts.opsOverhead);
    const replicaPerSecond = replicaPerHour / 3600;
    const costPerRequest = (replicaPerSecond * replicaSecondsPerRequest) / opts.utilisation;
    const capacityPerDay = (SECONDS_PER_DAY * opts.utilisation) / replicaSecondsPerRequest;

    return {
      feasible: true,
      gpusPerReplica: n,
      weightGB: weightBytes / 1e9,
      kvPerTokenKB: kvPerToken / 1024,
      maxBatch,
      batch,
      boundBy: memoryTime >= computeTime ? 'memory bandwidth' : 'compute',
      decodeTokensPerSec,
      prefillSeconds,
      replicaSecondsPerRequest,
      replicaPerHour,
      replicaPerMonth: replicaPerHour * 24 * DAYS_PER_MONTH,
      costPerRequest,
      costPerMillionOutput: (replicaPerSecond / (decodeTokensPerSec * opts.utilisation)) * 1e6,
      capacityPerDay,
    };
  }

  /** Monthly self-host cost at a request volume: whole replicas, at least one running 24/7. */
  function selfHostMonthly(sh, requestsPerDay, minReplicas = 1) {
    const replicas = Math.max(minReplicas, Math.ceil(requestsPerDay / sh.capacityPerDay));
    return { replicas, monthly: replicas * sh.replicaPerMonth };
  }

  /**
   * Requests/day at which self-hosting first costs no more than the API.
   * Returns null when the API stays cheaper at any volume (its price per request is below
   * self-hosting's fully loaded marginal cost).
   */
  function breakEven(sh, apiCostPerRequest) {
    // Volume where the API bill reaches one always-on replica's monthly cost. If that is beyond one
    // replica's capacity, every extra replica costs more than the API traffic it absorbs, so the
    // API never loses.
    const volume = sh.replicaPerMonth / (DAYS_PER_MONTH * apiCostPerRequest);
    return volume <= sh.capacityPerDay ? volume : null;
  }

  // ---------- Training ----------

  /**
   * Training compute with the standard 6·N·D rule (N = active parameters, D = tokens).
   * opts: { mfu, gpuPrice, gpus (cluster size) }
   */
  function training(activeB, totalB, tokens, gpu, o) {
    const opts = { mfu: 0.35, gpus: 1024, ...o };
    const flops = 6 * activeB * 1e9 * tokens;
    const perGpu = gpu.bf16 * 1e12 * opts.mfu;
    const gpuHours = flops / perGpu / 3600;
    // Mixed-precision Adam keeps ~16 bytes per parameter (weights, gradients, two moments, master copy)
    // before activations; fully sharded (ZeRO-3 / FSDP) this is the floor on GPU count.
    const stateBytes = 16 * totalB * 1e9;
    return {
      flops,
      gpuHours,
      cost: gpuHours * opts.gpuPrice,
      days: gpuHours / opts.gpus / 24,
      minGpusForState: Math.ceil(stateBytes / (gpu.memory * 1e9 * 0.8)),
      stateGB: stateBytes / 1e9,
    };
  }

  /** Inference memory: weights plus KV cache for `sequences` sequences of `contextTokens`. */
  function inferenceMemory(m, precision, kvPrecision, contextTokens, sequences) {
    const weightsGB = (m.totalB * 1e9 * BYTES_PER_PARAM[precision]) / 1e9;
    const kvGB = (kvBytesPerToken(m, kvPrecision) * contextTokens * sequences) / 1e9;
    return { weightsGB, kvGB, totalGB: weightsGB + kvGB };
  }

  const api = {
    DAYS_PER_MONTH, BYTES_PER_PARAM,
    requestCost, compareModels, kvBytesPerToken, selfHost, selfHostMonthly, breakEven, training, inferenceMemory,
  };
  root.CostEngine = api;
  if (typeof module !== 'undefined') module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
