// Run with: node --test
const test = require('node:test');
const assert = require('node:assert/strict');
const E = require('../js/engine.js');
const D = require('../js/data.js');

const byId = (list, id) => list.find((x) => x.id === id);
const close = (actual, expected, tol = 1e-9) => assert.ok(Math.abs(actual - expected) <= tol, `${actual} ≉ ${expected}`);

const plain = { input: 2, cached: 0.2, output: 10, batchInput: 1, batchOutput: 5 };
const base = { inputTokens: 1000, outputTokens: 100, cachedShare: 0, batchShare: 0 };

test('request cost is tokens × price per million', () => {
  close(E.requestCost(plain, base).total, (1000 * 2 + 100 * 10) / 1e6);
});

test('cached input uses the cached price', () => {
  const c = E.requestCost(plain, { ...base, cachedShare: 0.5 });
  close(c.input, (500 * 2) / 1e6);
  close(c.cached, (500 * 0.2) / 1e6);
});

test('batch tier halves the bill when every request is batched', () => {
  const rt = E.requestCost(plain, base).total;
  const bt = E.requestCost(plain, { ...base, batchShare: 1 }).total;
  close(bt, rt / 2);
});

test('models without a batch tier are not discounted', () => {
  const noBatch = { input: 2, cached: null, output: 10, batchInput: null, batchOutput: null };
  close(E.requestCost(noBatch, { ...base, batchShare: 1 }).total, E.requestCost(noBatch, base).total);
});

test('long prompts switch to long-context prices', () => {
  const haiku = byId(D.models, 'claude-haiku-5.5');
  const c = E.requestCost(haiku, { ...base, inputTokens: 150000 });
  assert.equal(c.longContext, true);
  close(c.input, (150000 * 0.5) / 1e6);
});

test('comparison is sorted cheapest first and includes every model', () => {
  const rows = E.compareModels(D.models, { ...base, requestsPerDay: 1000, mau: 100 });
  assert.equal(rows.length, D.models.length);
  for (let i = 1; i < rows.length; i++) assert.ok(rows[i - 1].monthly <= rows[i].monthly);
  close(rows[0].monthly, rows[0].perRequest.total * 1000 * 30, 1e-9);
});

test('KV cache per token matches the published Llama 3.1 8B shape', () => {
  assert.equal(E.kvBytesPerToken(byId(D.openModels, 'llama-8b'), 'bf16'), 131072); // 128 KiB
});

test('8B model fits on one H100 and is memory-bandwidth bound', () => {
  const r = E.selfHost(byId(D.openModels, 'llama-8b'), byId(D.gpus, 'h100-sxm'),
    { precision: 'bf16', inputTokens: 1500, outputTokens: 300, gpuPrice: 3.99 });
  assert.equal(r.feasible, true);
  assert.equal(r.gpusPerReplica, 1);
  assert.equal(r.boundBy, 'memory bandwidth');
  assert.ok(r.decodeTokensPerSec > 1000 && r.decodeTokensPerSec < 10000, `${r.decodeTokensPerSec} tok/s`);
});

test('70B at 16-bit needs four 80 GB GPUs', () => {
  const r = E.selfHost(byId(D.openModels, 'llama-70b'), byId(D.gpus, 'h100-sxm'),
    { precision: 'bf16', inputTokens: 1500, outputTokens: 300, gpuPrice: 3.99 });
  assert.equal(r.gpusPerReplica, 4);
});

test('a bigger model costs more per token to serve than a smaller one', () => {
  const gpu = byId(D.gpus, 'h100-sxm');
  const o = { precision: 'fp8', inputTokens: 1500, outputTokens: 300, gpuPrice: 3.99 };
  const small = E.selfHost(byId(D.openModels, 'llama-8b'), gpu, o);
  const big = E.selfHost(byId(D.openModels, 'llama-70b'), gpu, o);
  assert.ok(big.costPerMillionOutput > small.costPerMillionOutput * 3);
});

test('break-even: null when the API is cheaper than self-hosting at any volume', () => {
  const sh = { replicaPerMonth: 3000, capacityPerDay: 10000 };
  assert.equal(E.breakEven(sh, 0.001), null); // $10/day max on the API vs $100/day for the replica
  close(E.breakEven(sh, 0.05), 2000);       // $3000 / (30 × $0.05)
});

test('one replica at full capacity costs exactly its monthly price', () => {
  const r = E.selfHost(byId(D.openModels, 'gpt-oss-120b'), byId(D.gpus, 'h100-sxm'),
    { precision: 'int4', inputTokens: 2000, outputTokens: 400, gpuPrice: 3.99 });
  close(r.costPerRequest * r.capacityPerDay * 30, r.replicaPerMonth, 1e-6);
});

test('training estimate reproduces Meta’s Llama 3.1 405B GPU-hours within 5%', () => {
  // Llama 3 paper: 405B params, 15.6T tokens on H100s. Model card: 30.84M H100 GPU-hours.
  const t = E.training(405, 405, 15.6e12, byId(D.gpus, 'h100-sxm'), { mfu: 0.35, gpuPrice: 2.5 });
  const reported = 30.84e6;
  assert.ok(Math.abs(t.gpuHours - reported) / reported < 0.05, `${(t.gpuHours / 1e6).toFixed(2)}M GPU-hours`);
});

test('every model and GPU has a source and complete prices', () => {
  for (const m of D.models) {
    assert.ok(D.sources[m.source], `${m.id} source`);
    for (const k of ['input', 'output']) assert.ok(m[k] > 0, `${m.id} ${k}`);
  }
  for (const g of D.gpus) {
    assert.ok(g.memory > 0 && g.bandwidth > 0 && g.bf16 > 0, g.id);
    assert.ok(Object.values(g.prices).some((p) => p > 0), `${g.id} price`);
  }
  for (const m of D.openModels) if (m.apiModel) assert.ok(byId(D.models, m.apiModel), `${m.id} → ${m.apiModel}`);
});
