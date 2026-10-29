/* Wires the inputs to CostEngine and renders results. No framework, no build step. */
(function () {
  const D = window.COST_DATA;
  const E = window.CostEngine;
  const $ = (id) => document.getElementById(id);
  const byId = (list, id) => list.find((x) => x.id === id);

  // ---------- formatting ----------
  function money(x) {
    if (x == null || !isFinite(x)) return '—';
    if (x >= 1e6) return '$' + (x / 1e6).toFixed(x >= 1e7 ? 1 : 2) + 'M';
    if (x >= 1000) return '$' + Math.round(x).toLocaleString('en-US');
    if (x >= 100) return '$' + x.toFixed(0);
    if (x >= 1) return '$' + x.toFixed(2);
    if (x === 0) return '$0';
    const decimals = Math.min(8, 1 - Math.floor(Math.log10(x)));
    return '$' + x.toFixed(decimals);
  }
  const num = (n) => (isFinite(n) ? Math.round(n).toLocaleString('en-US') : '—');
  const approx = (n) => num(Number(n.toPrecision(2))); // estimates: two significant figures
  function compact(n) {
    if (n >= 1e12) return (n / 1e12).toFixed(n >= 1e13 ? 0 : 1) + 'T';
    if (n >= 1e9) return (n / 1e9).toFixed(n >= 1e10 ? 0 : 1) + 'B';
    if (n >= 1e6) return (n / 1e6).toFixed(n >= 1e7 ? 0 : 1) + 'M';
    if (n >= 1e3) return (n / 1e3).toFixed(n >= 1e4 ? 0 : 1) + 'K';
    return String(Math.round(n));
  }
  function sci(x) {
    const e = Math.floor(Math.log10(x));
    const sup = String(e).split('').map((c) => '⁰¹²³⁴⁵⁶⁷⁸⁹'['0123456789'.indexOf(c)] || c).join('');
    return (x / 10 ** e).toFixed(1) + ' × 10' + sup;
  }
  const pct = (x) => Math.round(x * 100) + '%';
  const axisMoney = (x) => '$' + (x >= 1000 ? compact(x) : String(Math.round(x)));
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  function card(k, v, s, win) {
    return `<div class="card${win ? ' win' : ''}"><div class="k">${esc(k)}</div><div class="v">${v}</div>${s ? `<div class="s">${s}</div>` : ''}</div>`;
  }
  function value(id, fallback) {
    const v = parseFloat($(id).value);
    return isFinite(v) ? v : fallback;
  }
  const longDate = (iso) => new Date(iso + 'T00:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });

  // ---------- setup ----------
  $('asof').textContent = `Prices as of ${longDate(D.asOf)} · sources in Method`;

  const providers = [...new Set(D.models.map((m) => m.provider))];
  $('providers').innerHTML = providers
    .map((p, i) => `<label><input type="checkbox" id="prov${i}" data-provider="${esc(p)}" checked> ${esc(p.replace(' (Together)', ''))}</label>`)
    .join('');

  $('presets').innerHTML = D.workloads
    .map((w) => `<button type="button" class="chip" data-preset="${w.id}" aria-pressed="false">${esc(w.name)}</button>`)
    .join('');

  const fill = (sel, items, label = (x) => x.name) => {
    $(sel).innerHTML = items.map((x) => `<option value="${x.id}">${esc(label(x))}</option>`).join('');
  };
  fill('openModel', D.openModels);
  fill('memModel', D.openModels);
  fill('gpu', D.gpus, (g) => `${g.name} · ${g.memory} GB`);
  fill('trainGpu', D.gpus, (g) => g.name);
  fill('compareModel', D.models, (m) => `${m.name} (${m.provider.replace(' (Together)', ', hosted')})`);
  $('gpu').value = 'h100-sxm';
  $('trainGpu').value = 'h100-sxm';
  $('openModel').value = 'gpt-oss-120b';
  $('precision').value = 'int4';
  $('memModel').value = 'llama-70b';
  $('compareModel').value = 'gpt-oss-120b';

  $('sourceList').innerHTML = Object.values(D.sources)
    .map((s) => `<li><a href="${s.url}" target="_blank" rel="noopener">${esc(s.name)}</a></li>`)
    .join('') + `<li>Checked on ${longDate(D.asOf)}.</li>`;

  function gpuPriceOptions() {
    const gpu = byId(D.gpus, $('gpu').value);
    const opts = D.priceSources.filter((s) => gpu.prices[s.id] != null);
    const current = $('priceSource').value;
    $('priceSource').innerHTML = opts.map((s) => `<option value="${s.id}">${esc(s.name)}</option>`).join('') + '<option value="custom">Custom</option>';
    $('priceSource').value = opts.some((s) => s.id === current) || current === 'custom' ? current : opts[0].id;
    if ($('priceSource').value !== 'custom') $('gpuPrice').value = gpu.prices[$('priceSource').value];
  }
  gpuPriceOptions();

  // ---------- workload (shared by the API and self-host tabs) ----------
  function workload() {
    return {
      requestsPerDay: Math.max(1, value('requestsPerDay', 1)),
      inputTokens: Math.max(1, value('inputTokens', 1)),
      outputTokens: Math.max(1, value('outputTokens', 1)),
      cachedShare: value('cachedShare', 0) / 100,
      batchShare: value('batchShare', 0) / 100,
      mau: Math.max(0, value('mau', 0)),
    };
  }

  function applyPreset(id) {
    const w = byId(D.workloads, id);
    if (!w) return;
    $('requestsPerDay').value = w.requestsPerDay;
    $('inputTokens').value = w.inputTokens;
    $('outputTokens').value = w.outputTokens;
    $('cachedShare').value = Math.round(w.cachedShare * 100);
    $('batchShare').value = Math.round(w.batchShare * 100);
    $('mau').value = w.mau;
  }
  function markPreset() {
    const w = workload();
    document.querySelectorAll('[data-preset]').forEach((b) => {
      const p = byId(D.workloads, b.dataset.preset);
      const match = p.requestsPerDay === w.requestsPerDay && p.inputTokens === w.inputTokens && p.outputTokens === w.outputTokens &&
        Math.round(p.cachedShare * 100) === Math.round(w.cachedShare * 100) && Math.round(p.batchShare * 100) === Math.round(w.batchShare * 100) && p.mau === w.mau;
      b.setAttribute('aria-pressed', String(match));
    });
  }

  // ---------- API tab ----------
  function renderApi() {
    const w = workload();
    const shown = new Set([...document.querySelectorAll('[data-provider]')].filter((c) => c.checked).map((c) => c.dataset.provider));
    const models = D.models.filter((m) => shown.has(m.provider));
    if (!models.length) {
      $('apiCards').innerHTML = '';
      $('apiRows').innerHTML = '<tr><td colspan="6" class="l">Pick at least one provider.</td></tr>';
      $('apiInsight').textContent = '';
      $('apiNotes').innerHTML = '';
      return;
    }
    const rows = E.compareModels(models, w);
    const cheapest = rows[0];
    const priciest = rows[rows.length - 1];
    const frontier = rows.find((r) => r.model.tier === 'Flagship');
    const median = rows[Math.floor(rows.length / 2)];
    const monthlyTokens = (w.inputTokens + w.outputTokens) * w.requestsPerDay * E.DAYS_PER_MONTH;

    $('apiCards').innerHTML = [
      card('Cheapest', money(cheapest.monthly) + '<small style="font-size:.5em"> /mo</small>', `${esc(cheapest.model.name)} · ${money(cheapest.perRequest.total)} a request`, true),
      frontier ? card('Cheapest flagship', money(frontier.monthly) + '<small style="font-size:.5em"> /mo</small>', esc(frontier.model.name)) : '',
      card('Spread', (priciest.monthly / cheapest.monthly).toFixed(0) + '×', 'priciest vs cheapest'),
      card('Tokens a month', compact(monthlyTokens), `${compact(w.requestsPerDay * E.DAYS_PER_MONTH)} requests`),
    ].join('');

    // Insight: what the choice of model and caching are worth.
    const noCache = E.requestCost(median.model, { ...w, cachedShare: 0 }).total;
    const cacheSaving = noCache > 0 ? 1 - median.perRequest.total / noCache : 0;
    const outShare = median.perRequest.total > 0 ? median.perRequest.output / median.perRequest.total : 0;
    let text = `At ${num(w.requestsPerDay)} requests a day, ${cheapest.model.name} costs ${money(cheapest.monthly)} a month`;
    text += frontier && frontier !== cheapest ? ` and ${frontier.model.name} ${money(frontier.monthly)}. ` : '. ';
    text += `On a mid-priced model like ${median.model.name}, output is ${pct(outShare)} of the bill`;
    text += w.cachedShare > 0 ? ` and caching saves ${pct(cacheSaving)}.` : '; caching a shared prompt prefix would cut the input share.';
    $('apiInsight').textContent = text;

    $('apiRows').innerHTML = rows.map((r, i) => {
      const p = r.perRequest;
      const seg = (part, color) => (p.total > 0 ? `<span style="width:${(part / p.total) * 100}%;background:var(${color})"></span>` : '');
      const flags = [
        r.model.change ? `<span class="flag" title="Price change scheduled">↑ ${esc(r.model.change.from.slice(0, 7))}</span>` : '',
        p.longContext ? '<span class="flag" title="Long-context prices apply">long ctx</span>' : '',
      ].join('');
      return `<tr class="${i === 0 ? 'best' : ''}">
        <td class="l"><a href="${D.sources[r.model.source].url}" target="_blank" rel="noopener">${esc(r.model.name)}</a>${flags}<span class="prov">${esc(r.model.provider)}</span></td>
        <td class="opt">${esc(r.model.tier)}</td>
        <td>${money(p.total)}</td>
        <td><strong>${money(r.monthly)}</strong></td>
        <td>${r.perUser == null ? '—' : money(r.perUser)}</td>
        <td class="l opt"><div class="bar" role="img" aria-label="Input ${pct(p.input / p.total)}, cached ${pct(p.cached / p.total)}, output ${pct(p.output / p.total)}">${seg(p.input, '--seg-input')}${seg(p.cached, '--seg-cached')}${seg(p.output, '--seg-output')}</div></td>
      </tr>`;
    }).join('');

    const notes = models.filter((m) => m.change).map((m) =>
      `<span>↑ ${esc(m.name)} rises to ${money(m.change.input)} input / ${money(m.change.output)} output per 1M tokens from ${longDate(m.change.from)}.</span>`);
    notes.push('<span>Prices are per 1M tokens on each provider\'s standard tier. Model names link to the pricing page each number came from.</span>');
    $('apiNotes').innerHTML = notes.join('');
  }

  // ---------- Self-host tab ----------
  function chartSvg(points, apiCostPerRequest, sh, current, be) {
    const W = 640, H = 300, L = 62, R = 14, T = 12, B = 34;
    const xMin = 100, xMax = 1e7;
    const api = (x) => x * E.DAYS_PER_MONTH * apiCostPerRequest;
    const self = (x) => E.selfHostMonthly(sh, x).monthly;
    const ys = points.flatMap((x) => [api(x), self(x)]);
    const yMin = Math.pow(10, Math.floor(Math.log10(Math.max(1, Math.min(...ys)))));
    const yMax = Math.pow(10, Math.ceil(Math.log10(Math.max(...ys))));
    const sx = (x) => L + ((Math.log10(x) - Math.log10(xMin)) / (Math.log10(xMax) - Math.log10(xMin))) * (W - L - R);
    const sy = (y) => T + (1 - (Math.log10(Math.max(y, yMin)) - Math.log10(yMin)) / (Math.log10(yMax) - Math.log10(yMin))) * (H - T - B);
    let g = '';
    for (let e = Math.log10(yMin); e <= Math.log10(yMax); e++) {
      const y = sy(10 ** e);
      g += `<line class="grid" x1="${L}" x2="${W - R}" y1="${y}" y2="${y}"/><text x="${L - 8}" y="${y + 4}" text-anchor="end">${axisMoney(10 ** e)}</text>`;
    }
    for (let e = 2; e <= 7; e++) {
      const x = sx(10 ** e);
      g += `<line class="grid" x1="${x}" x2="${x}" y1="${T}" y2="${H - B}"/><text x="${x}" y="${H - B + 18}" text-anchor="middle">${compact(10 ** e)}</text>`;
    }
    g += `<text x="${(L + W - R) / 2}" y="${H - 2}" text-anchor="middle">requests per day (log scale)</text>`;
    const path = (f) => points.map((x, i) => `${i ? 'L' : 'M'}${sx(x).toFixed(1)},${sy(f(x)).toFixed(1)}`).join('');
    g += `<path class="api" d="${path(api)}"/><path class="self" d="${path(self)}"/>`;
    if (current >= xMin && current <= xMax) g += `<line class="now" x1="${sx(current)}" x2="${sx(current)}" y1="${T}" y2="${H - B}"/><text x="${sx(current) + 4}" y="${T + 12}">you</text>`;
    if (be != null && be >= xMin && be <= xMax) g += `<circle class="dot" cx="${sx(be)}" cy="${sy(api(be))}" r="5"/>`;
    return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Monthly cost of the API and of self-hosting from 100 to 10 million requests a day">${g}</svg>`;
  }

  function renderSelf() {
    const w = workload();
    const m = byId(D.openModels, $('openModel').value);
    const gpu = byId(D.gpus, $('gpu').value);
    const apiModel = byId(D.models, $('compareModel').value);
    const gpuPrice = Math.max(0, value('gpuPrice', 0));
    $('selfWorkload').textContent = `Uses your workload from the first tab: ${num(w.requestsPerDay)} requests a day, ${num(w.inputTokens)} tokens in, ${num(w.outputTokens)} out.`;
    $('legendApi').textContent = `${apiModel.name} API`;

    const sh = E.selfHost(m, gpu, {
      precision: $('precision').value,
      kvPrecision: $('kvPrecision').value,
      concurrency: Math.max(1, value('concurrency', 32)),
      inputTokens: w.inputTokens,
      outputTokens: w.outputTokens,
      gpuPrice,
      utilisation: value('utilisation', 60) / 100,
      opsOverhead: value('opsOverhead', 0) / 100,
    });
    if (!sh.feasible) {
      $('selfInsight').textContent = `${m.name} does not fit: ${sh.reason} Try a bigger GPU or lower precision.`;
      $('selfCards').innerHTML = '';
      $('selfChart').innerHTML = '';
      $('selfNotes').innerHTML = '';
      return;
    }

    const apiReq = E.requestCost(apiModel, { ...w, batchShare: 0 }).total;
    const self = E.selfHostMonthly(sh, w.requestsPerDay);
    const apiMonthly = apiReq * w.requestsPerDay * E.DAYS_PER_MONTH;
    const be = E.breakEven(sh, apiReq);
    const selfWins = self.monthly < apiMonthly;

    const replica = `${sh.gpusPerReplica} × ${gpu.name}`;
    const apiLabel = apiModel.provider.includes('Together') ? `${apiModel.name} on Together` : apiModel.name;
    let text = `At ${num(w.requestsPerDay)} requests a day, ${apiLabel} costs ${money(apiMonthly)} a month; serving ${m.name.split(' (')[0]} yourself costs ${money(self.monthly)} on ${self.replicas > 1 ? self.replicas + ' replicas of ' : ''}${replica}. `;
    text += be == null
      ? 'The API stays cheaper at any volume: its price per request is below what this setup can reach even fully loaded.'
      : `Self-hosting wins above about ${approx(be)} requests a day.`;
    $('selfInsight').textContent = text;

    $('selfCards').innerHTML = [
      card('Replica', esc(replica), `${money(sh.replicaPerMonth)} a month, always on`),
      card('Throughput', num(sh.decodeTokensPerSec) + '<small style="font-size:.5em"> tok/s</small>', `${sh.batch} sequences · ${sh.boundBy}-bound`),
      card('Per 1M output tokens', money(sh.costPerMillionOutput), `API list price ${money(apiModel.output)}`),
      card('Per request', money(sh.costPerRequest), `API ${money(apiReq)}`, sh.costPerRequest < apiReq),
      card('At your volume', money(self.monthly), `API ${money(apiMonthly)} a month`, selfWins),
      card('Break-even', be == null ? 'Never' : '≈ ' + compact(Number(be.toPrecision(2))), be == null ? 'API cheaper at any volume' : 'requests a day', be != null),
    ].join('');

    const points = [];
    for (let e = 2; e <= 7.0001; e += 0.02) points.push(10 ** e);
    $('selfChart').innerHTML = chartSvg(points, apiReq, sh, w.requestsPerDay, be);

    $('selfNotes').innerHTML = [
      `<span>Weights take ${sh.weightGB.toFixed(0)} GB; the KV cache is ${sh.kvPerTokenKB.toFixed(0)} KB per token, so ${sh.maxBatch} sequences of this length fit per replica.</span>`,
      `<span>The API side includes your cached-input share; the self-hosted side does not model prefix caching, so it is slightly pessimistic.</span>`,
      `<span>GPU price: ${esc(($('priceSource').selectedOptions[0] || {}).textContent || 'custom')}, ${money(gpuPrice)} per GPU-hour. See Method for every assumption.</span>`,
    ].join('');
  }

  // ---------- GPU sizing & training ----------
  function renderMem() {
    const m = byId(D.openModels, $('memModel').value);
    const mem = E.inferenceMemory(m, $('memPrecision').value, $('memKv').value, Math.max(1, value('memContext', 8192)), Math.max(1, value('memSeqs', 1)));
    $('memCards').innerHTML = [
      card('Weights', mem.weightsGB.toFixed(0) + ' GB', `${m.totalB}B parameters`),
      card('KV cache', mem.kvGB.toFixed(1) + ' GB', `${(E.kvBytesPerToken(m, $('memKv').value) / 1024).toFixed(0)} KB per token`),
      card('Total', mem.totalGB.toFixed(0) + ' GB', 'plus ~10% runtime headroom'),
    ].join('');
    $('memRows').innerHTML = D.gpus.map((g) => {
      const n = Math.ceil(mem.totalGB / (g.memory * 0.9));
      const price = g.prices.runpodSecure ?? g.prices.lambda;
      return `<tr><td class="l">${esc(g.name)}</td><td>${g.memory} GB</td><td>${n > 8 ? `${n} <span class="flag">multi-node</span>` : n}</td><td>${price != null ? money(price * n) : '—'}</td></tr>`;
    }).join('');
  }

  function renderTrain() {
    const gpu = byId(D.gpus, $('trainGpu').value);
    const total = Math.max(0.1, value('trainParams', 8));
    const active = Math.min(total, Math.max(0.1, value('trainActive', total)));
    const tokens = Math.max(1, value('trainTokens', 160)) * 1e9;
    const price = gpu.prices.runpodSecure ?? gpu.prices.lambda;
    const t = E.training(active, total, tokens, gpu, { mfu: value('trainMfu', 35) / 100, gpuPrice: price, gpus: Math.max(1, value('trainGpus', 256)) });
    $('trainCards').innerHTML = [
      card('Compute', sci(t.flops), 'FLOPs'),
      card('GPU-hours', compact(t.gpuHours), `${esc(gpu.name)} at ${value('trainMfu', 35)}% MFU`),
      card('Cost', money(t.cost), `at ${money(price)} per GPU-hour on demand`),
      card('Wall clock', t.days < 1 ? (t.days * 24).toFixed(1) + ' h' : t.days.toFixed(t.days < 10 ? 1 : 0) + ' days', `on ${num(value('trainGpus', 256))} GPUs`),
      card('Minimum GPUs', num(t.minGpusForState), `${t.stateGB.toFixed(0)} GB of optimizer state, fully sharded`),
    ].join('');
  }

  // ---------- tabs ----------
  const tabs = [...document.querySelectorAll('[role="tab"]')];
  function selectTab(name, focus) {
    tabs.forEach((t) => {
      const on = t.id === 'tab-' + name;
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
      $(t.getAttribute('aria-controls')).hidden = !on;
      if (on && focus) t.focus();
    });
    currentTab = name;
  }
  let currentTab = 'api';
  tabs.forEach((t, i) => {
    t.addEventListener('click', () => { selectTab(t.id.slice(4)); saveHash(); });
    t.addEventListener('keydown', (e) => {
      const d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
      if (d) { selectTab(tabs[(i + d + tabs.length) % tabs.length].id.slice(4), true); saveHash(); }
    });
  });
  document.querySelectorAll('[data-tab-link]').forEach((a) => a.addEventListener('click', (e) => {
    e.preventDefault(); selectTab(a.dataset.tabLink); saveHash(); window.scrollTo({ top: document.querySelector('.tabs').offsetTop - 8 });
  }));

  // ---------- shareable state in the URL hash ----------
  const stateIds = ['requestsPerDay', 'inputTokens', 'outputTokens', 'cachedShare', 'batchShare', 'mau', 'openModel', 'precision', 'kvPrecision', 'gpu', 'priceSource', 'gpuPrice', 'concurrency', 'utilisation', 'opsOverhead', 'compareModel', 'memModel', 'memPrecision', 'memKv', 'memContext', 'memSeqs', 'trainParams', 'trainActive', 'trainTokens', 'trainGpu', 'trainGpus', 'trainMfu'];
  function saveHash() {
    const p = new URLSearchParams({ t: currentTab });
    stateIds.forEach((id) => p.set(id, $(id).value));
    history.replaceState(null, '', '#' + p.toString());
  }
  function loadHash() {
    try {
      const p = new URLSearchParams(location.hash.slice(1));
      stateIds.forEach((id) => {
        if (!p.has(id)) return;
        const el = $(id), v = p.get(id);
        if (el.tagName === 'SELECT') {
          if (id === 'gpu') { el.value = v; gpuPriceOptions(); return; }
          if ([...el.options].some((o) => o.value === v)) el.value = v;
        } else if (isFinite(parseFloat(v))) {
          el.value = v;
        }
      });
      if (['api', 'self', 'gpu', 'method'].includes(p.get('t'))) selectTab(p.get('t'));
    } catch (_) { /* a malformed link just falls back to defaults */ }
  }
  document.querySelectorAll('[data-share]').forEach((b) => b.addEventListener('click', async () => {
    saveHash();
    const toast = b.parentElement.querySelector('[data-toast]');
    try { await navigator.clipboard.writeText(location.href); toast.textContent = 'Link copied'; } catch (_) { toast.textContent = 'Copy the address bar to share'; }
    toast.hidden = false;
    setTimeout(() => { toast.hidden = true; }, 2500);
  }));

  // ---------- events ----------
  function syncOutputs() {
    [['cachedShare', '%'], ['batchShare', '%'], ['utilisation', '%'], ['opsOverhead', '%'], ['trainMfu', '%']].forEach(([id, unit]) => {
      $(id + 'Out').textContent = $(id).value + unit;
    });
  }
  function renderAll() {
    syncOutputs();
    markPreset();
    renderApi();
    renderSelf();
    renderMem();
    renderTrain();
  }

  $('presets').addEventListener('click', (e) => {
    const b = e.target.closest('[data-preset]');
    if (!b) return;
    applyPreset(b.dataset.preset);
    renderAll();
    saveHash();
  });
  $('gpu').addEventListener('change', gpuPriceOptions);
  $('priceSource').addEventListener('change', () => {
    const gpu = byId(D.gpus, $('gpu').value);
    if ($('priceSource').value !== 'custom') $('gpuPrice').value = gpu.prices[$('priceSource').value];
  });
  $('gpuPrice').addEventListener('input', () => { $('priceSource').value = 'custom'; });
  $('openModel').addEventListener('change', () => {
    const m = byId(D.openModels, $('openModel').value);
    if (m.precision) $('precision').value = m.precision;
    if (m.apiModel) $('compareModel').value = m.apiModel;
  });
  $('chinchilla').addEventListener('click', () => {
    $('trainTokens').value = Math.round(20 * value('trainParams', 8));
    renderAll();
    saveHash();
  });
  document.querySelectorAll('main input, main select').forEach((el) => {
    el.addEventListener('input', () => { renderAll(); saveHash(); });
    el.addEventListener('change', () => { renderAll(); saveHash(); });
  });

  loadHash();
  renderAll();
})();
