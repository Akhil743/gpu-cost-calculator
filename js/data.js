/*
 * Prices and hardware specs. Everything the calculator knows lives here.
 *
 * To update prices: change the numbers, change `asOf`, and keep each `source` pointing
 * at the page the number came from. Prices are USD per 1M tokens (models) or per GPU-hour (GPUs).
 */
(function (root) {
  const DATA = {
    asOf: '2026-10-29',

    sources: {
      openai: { name: 'OpenAI API pricing', url: 'https://developers.openai.com/api/docs/pricing' },
      anthropic: { name: 'Anthropic API pricing', url: 'https://platform.claude.com/docs/en/about-claude/pricing' },
      google: { name: 'Gemini API pricing', url: 'https://ai.google.dev/gemini-api/docs/pricing' },
      together: { name: 'Together AI pricing', url: 'https://www.together.ai/pricing' },
      lambda: { name: 'Lambda GPU cloud pricing', url: 'https://lambda.ai/pricing' },
      runpod: { name: 'RunPod GPU pricing', url: 'https://www.runpod.io/pricing' },
      nvidia: { name: 'NVIDIA data-centre GPU datasheets', url: 'https://www.nvidia.com/en-us/data-center/' },
    },

    // Standard (on-demand) tier, short-context prices. `cached` = cached-input / cache-hit price.
    // `batchInput`/`batchOutput` = the provider's asynchronous batch tier (null when not offered).
    models: [
      { id: 'gpt-6-astra', name: 'GPT-6 Astra', provider: 'OpenAI', tier: 'Flagship', input: 10.0, cached: 1.0, output: 50.0, batchInput: 5.0, batchOutput: 25.0, source: 'openai' },
      { id: 'gpt-6.1-sol', name: 'GPT-6.1 Sol', provider: 'OpenAI', tier: 'Mid', input: 2.0, cached: 0.1, output: 10.0, batchInput: 1.0, batchOutput: 5.0, source: 'openai' },
      { id: 'gpt-6.1-terra', name: 'GPT-6.1 Terra', provider: 'OpenAI', tier: 'Mid', input: 1.0, cached: 0.05, output: 5.0, batchInput: 0.5, batchOutput: 2.5, source: 'openai' },
      { id: 'gpt-6-luna', name: 'GPT-6 Luna', provider: 'OpenAI', tier: 'Small', input: 0.1, cached: 0.01, output: 0.5, batchInput: 0.05, batchOutput: 0.25, source: 'openai' },

      { id: 'claude-fable-5.1', name: 'Claude Fable 5.1', provider: 'Anthropic', tier: 'Flagship', input: 10.0, cached: 0.25, output: 50.0, batchInput: 5.0, batchOutput: 25.0, source: 'anthropic' },
      { id: 'claude-opus-5.5', name: 'Claude Opus 5.5', provider: 'Anthropic', tier: 'Large', input: 4.0, cached: 0.2, output: 20.0, batchInput: 2.0, batchOutput: 10.0, source: 'anthropic' },
      { id: 'claude-sonnet-5.5', name: 'Claude Sonnet 5.5', provider: 'Anthropic', tier: 'Mid', input: 2.0, cached: 0.1, output: 10.0, batchInput: 1.0, batchOutput: 5.0, source: 'anthropic' },
      { id: 'claude-haiku-5.5', name: 'Claude Haiku 5.5', provider: 'Anthropic', tier: 'Small', input: 0.1, cached: 0.01, output: 0.5, batchInput: 0.05, batchOutput: 0.25, source: 'anthropic',
        longContext: { above: 100000, input: 0.5, cached: 0.05, output: 2.5 } },

      { id: 'gemini-4-argon', name: 'Gemini 4 Argon', provider: 'Google', tier: 'Flagship', input: 2.0, cached: 0.1, output: 10.0, batchInput: 1.0, batchOutput: 5.0, source: 'google',
        change: { from: '2026-12-01', input: 4.0, output: 20.0 } },
      { id: 'gemini-3.8-flash', name: 'Gemini 3.8 Flash', provider: 'Google', tier: 'Mid', input: 0.75, cached: 0.075, output: 3.75, batchInput: 0.375, batchOutput: 1.875, source: 'google',
        change: { from: '2027-01-01', input: 1.5, output: 7.5 } },
      { id: 'gemini-3.5-flash-lite', name: 'Gemini 3.5 Flash-Lite', provider: 'Google', tier: 'Small', input: 0.3, cached: 0.03, output: 2.5, batchInput: 0.15, batchOutput: 1.25, source: 'google' },
      { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', provider: 'Google', tier: 'Small', input: 0.3, cached: 0.03, output: 2.5, batchInput: 0.15, batchOutput: 1.25, source: 'google' },

      { id: 'deepseek-v4-pro', name: 'DeepSeek V4 Pro', provider: 'Open weights (Together)', tier: 'Flagship', input: 1.32, cached: 0.13, output: 3.96, batchInput: null, batchOutput: null, source: 'together' },
      { id: 'deepseek-v4.1-flash', name: 'DeepSeek V4.1 Flash', provider: 'Open weights (Together)', tier: 'Small', input: 0.3, cached: 0.006, output: 1.2, batchInput: null, batchOutput: null, source: 'together' },
      { id: 'qwen3-235b', name: 'Qwen3 235B A22B', provider: 'Open weights (Together)', tier: 'Mid', input: 0.2, cached: null, output: 0.6, batchInput: null, batchOutput: null, source: 'together' },
      { id: 'gpt-oss-120b', name: 'gpt-oss-120B', provider: 'Open weights (Together)', tier: 'Small', input: 0.15, cached: null, output: 0.6, batchInput: null, batchOutput: null, source: 'together' },
    ],

    // Dense (no sparsity) tensor throughput from NVIDIA datasheets. bandwidth in TB/s, memory in GB.
    // Prices: on-demand $/GPU-hour. `null` where the provider does not list that GPU.
    gpus: [
      { id: 'b200', name: 'B200', memory: 180, bandwidth: 8.0, bf16: 2250, fp8: 4500, prices: { lambda: 6.69, runpodSecure: 7.99, runpodCommunity: 5.98 } },
      { id: 'h200', name: 'H200', memory: 141, bandwidth: 4.8, bf16: 989, fp8: 1979, prices: { lambda: null, runpodSecure: 5.29, runpodCommunity: 3.59 } },
      { id: 'h100-sxm', name: 'H100 SXM', memory: 80, bandwidth: 3.35, bf16: 989, fp8: 1979, prices: { lambda: 3.99, runpodSecure: 3.99, runpodCommunity: 2.69 } },
      { id: 'h100-pcie', name: 'H100 PCIe', memory: 80, bandwidth: 2.0, bf16: 756, fp8: 1513, prices: { lambda: 3.29, runpodSecure: 2.89, runpodCommunity: 1.99 } },
      { id: 'a100-80', name: 'A100 SXM 80 GB', memory: 80, bandwidth: 2.039, bf16: 312, fp8: null, prices: { lambda: 2.79, runpodSecure: 1.79, runpodCommunity: 1.39 } },
      { id: 'l40s', name: 'L40S', memory: 48, bandwidth: 0.864, bf16: 362, fp8: 733, prices: { lambda: null, runpodSecure: 1.09, runpodCommunity: 0.79 } },
      { id: 'l4', name: 'L4', memory: 24, bandwidth: 0.3, bf16: 121, fp8: 242, prices: { lambda: null, runpodSecure: 0.59, runpodCommunity: 0.44 } },
    ],

    priceSources: [
      { id: 'runpodSecure', name: 'RunPod Secure Cloud', source: 'runpod' },
      { id: 'runpodCommunity', name: 'RunPod Community Cloud', source: 'runpod' },
      { id: 'lambda', name: 'Lambda on-demand', source: 'lambda' },
    ],

    // Open-weights models you could serve yourself. Architecture from each model's public config;
    // kvBytes = KV-cache bytes per token at 16-bit (2 × layers × KV heads × head dim × 2 bytes).
    // `apiModel` links to the same model's hosted price above, for a like-for-like comparison.
    // `precision` is the format the model is usually served in (gpt-oss ships in 4-bit MXFP4).
    openModels: [
      { id: 'llama-8b', name: 'Llama 3.1 8B (dense)', totalB: 8.03, activeB: 8.03, layers: 32, kvHeads: 8, headDim: 128, apiModel: null, precision: 'fp8' },
      { id: 'llama-70b', name: 'Llama 3.3 70B (dense)', totalB: 70.6, activeB: 70.6, layers: 80, kvHeads: 8, headDim: 128, apiModel: null, precision: 'fp8' },
      { id: 'gpt-oss-20b', name: 'gpt-oss-20B (MoE, 3.6B active)', totalB: 20.9, activeB: 3.6, layers: 24, kvHeads: 8, headDim: 64, apiModel: null, precision: 'int4' },
      { id: 'gpt-oss-120b', name: 'gpt-oss-120B (MoE, 5.1B active)', totalB: 116.8, activeB: 5.1, layers: 36, kvHeads: 8, headDim: 64, apiModel: 'gpt-oss-120b', precision: 'int4' },
      { id: 'qwen3-235b', name: 'Qwen3 235B (MoE, 22B active)', totalB: 235, activeB: 22, layers: 94, kvHeads: 4, headDim: 128, apiModel: 'qwen3-235b', precision: 'fp8' },
    ],

    // Workload presets for the token calculator.
    workloads: [
      { id: 'support', name: 'Support chatbot', requestsPerDay: 20000, inputTokens: 1500, outputTokens: 300, cachedShare: 0.6, batchShare: 0, mau: 50000 },
      { id: 'rag', name: 'RAG over documents', requestsPerDay: 5000, inputTokens: 6000, outputTokens: 500, cachedShare: 0.3, batchShare: 0, mau: 5000 },
      { id: 'agent', name: 'Coding agent', requestsPerDay: 2000, inputTokens: 40000, outputTokens: 2500, cachedShare: 0.8, batchShare: 0, mau: 400 },
      { id: 'batch', name: 'Nightly summaries', requestsPerDay: 100000, inputTokens: 2500, outputTokens: 200, cachedShare: 0, batchShare: 1, mau: 0 },
      { id: 'ytchat', name: 'YouTube Chat AI', requestsPerDay: 1000, inputTokens: 3000, outputTokens: 350, cachedShare: 0.5, batchShare: 0, mau: 2000 },
    ],
  };

  root.COST_DATA = DATA;
  if (typeof module !== 'undefined') module.exports = DATA;
})(typeof window !== 'undefined' ? window : globalThis);
