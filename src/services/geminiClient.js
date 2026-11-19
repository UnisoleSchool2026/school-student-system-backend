// ============================================================================
// Shared Google Gemini REST client
// ----------------------------------------------------------------------------
// - Finds the models this API key can actually use (ListModels, cached) and
//   ranks them for the job, so a renamed or retired model never breaks a
//   feature. GEMINI_VISION_MODEL / GEMINI_TEXT_MODEL override the choice.
// - A model that does not exist (404) is skipped at once instead of waiting
//   for a timeout.
// - GEMINI_API_BASE points the client at another host (used by the offline
//   test server in scripts/mock_gemini_server.js).
// ============================================================================

const DEFAULT_BASE = 'https://generativelanguage.googleapis.com';
const LIST_TTL_MS = 30 * 60 * 1000;
const FALLBACK = {
  vision: ['gemini-flash-latest', 'gemini-2.5-flash', 'gemini-pro-latest', 'gemini-flash-lite-latest'],
  text: ['gemini-flash-latest', 'gemini-2.5-flash', 'gemini-flash-lite-latest']
};

let listCache = { at: 0, key: '', models: null };

function apiBase() {
  return String(process.env.GEMINI_API_BASE || DEFAULT_BASE).replace(/\/+$/, '');
}

function apiKey() {
  return String(process.env.GEMINI_API_KEY || '').trim();
}

async function fetchJson(url, options = {}, timeoutMs = 30000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, Object.assign({}, options, { signal: controller.signal }));
    const text = await res.text();
    let body = null;
    try { body = text ? JSON.parse(text) : null; } catch (e) { body = null; }
    if (!res.ok) {
      const err = new Error(`Gemini HTTP ${res.status}: ${(body && body.error && body.error.message) || text.slice(0, 300)}`);
      err.status = res.status;
      throw err;
    }
    return body;
  } catch (err) {
    if (err.name === 'AbortError') {
      const e = new Error(`Gemini request timed out after ${Math.round(timeoutMs / 1000)} s.`);
      e.status = 504;
      throw e;
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

// Names (without "models/") of the models that support generateContent for this key.
async function listModels(key = apiKey()) {
  if (!key) return [];
  if (listCache.models && listCache.key === key && Date.now() - listCache.at < LIST_TTL_MS) return listCache.models;
  try {
    const body = await fetchJson(`${apiBase()}/v1beta/models?pageSize=200&key=${encodeURIComponent(key)}`, {}, 10000);
    const all = body && body.models ? body.models : [];
    const names = list => list.map(m => String(m.name || '').replace(/^models\//, '')).filter(Boolean);
    const models = names(all.filter(m => (m.supportedGenerationMethods || []).includes('generateContent')));
    const live = names(all.filter(m => (m.supportedGenerationMethods || []).includes('bidiGenerateContent')));
    listCache = { at: Date.now(), key, models, live };
    return models;
  } catch (err) {
    console.warn('[GEMINI] Could not list models:', err.message);
    return [];
  }
}

// The voice-teacher model this key can use: a native-audio Live model, the proven 2.5 one first.
async function liveModelFor(key = apiKey()) {
  await listModels(key);
  const live = (listCache.key === key && listCache.live) || [];
  const audio = live.filter(n => /native-audio/.test(n) && !/thinking/.test(n));
  const rank = n => (versionOf(n) === 2.5 ? 100 : 60 - Math.abs(versionOf(n) - 3)) + (/latest/.test(n) ? 3 : 0) - (/preview/.test(n) ? 1 : 0);
  const pick = audio.sort((a, b) => rank(b) - rank(a))[0] || live.find(n => /flash/.test(n));
  return pick || null;
}

function versionOf(name) {
  const m = /gemini-(\d+(?:\.\d+)?)/.exec(name);
  return m ? Number(m[1]) : 0;
}

// Ranks general-purpose Gemini models for a job ("vision" reads photos, "text" writes lessons).
// Ranks general-purpose Gemini models. Older, proven "flash" models come first: they answer
// fastest and are rarely overloaded. The newest models are tried after them, "pro" last.
function rankModels(names, kind) {
  const usable = names.filter(n => /^gemini/.test(n) && !/(tts|image|embedding|live|audio|robotics|computer-use|aqa|learnlm|gemma)/.test(n));
  const score = n => {
    const v = versionOf(n);
    let s;
    if (/pro/.test(n)) s = kind === 'vision' ? 45 : 30;
    else if (/lite/.test(n)) s = 50;
    else if (v === 2.5) s = 100;
    else if (v === 2) s = 90;
    else if (/flash-latest/.test(n)) s = 80;
    else if (/flash/.test(n)) s = 70 - Math.max(0, v - 3) * 2; // newer flash: after the proven ones
    else s = 20;
    if (/(preview|exp|experimental)/.test(n)) s -= 25;
    if (/-\d{3,}$/.test(n)) s -= 1; // pinned dated builds rank just below their alias
    return s;
  };
  return usable.sort((a, b) => score(b) - score(a));
}

// A model that was overloaded or too slow is skipped for a few minutes.
const resting = new Map();
function rest(model, err) {
  if (err && (err.status === 503 || err.status === 429 || err.status === 504 || /timed out/i.test(err.message))) resting.set(model, Date.now() + 5 * 60000);
}
function isResting(model) { const t = resting.get(model); return Boolean(t && t > Date.now()); }

async function modelsFor(kind, key = apiKey()) {
  const override = kind === 'vision' ? process.env.GEMINI_VISION_MODEL : (process.env.GEMINI_TEXT_MODEL || process.env.GEMINI_MODEL);
  const listed = rankModels(await listModels(key), kind);
  const order = [];
  [override, ...listed.slice(0, 4), ...FALLBACK[kind]].forEach(m => {
    const name = String(m || '').replace(/^models\//, '').trim();
    if (name && order.indexOf(name) === -1) order.push(name);
  });
  const awake = order.filter(m => !isResting(m));
  return (awake.length ? awake : order).slice(0, 4);
}

// Parses JSON a model returned, tolerating ```json fences and text around the object.
function parseModelJson(raw) {
  const text = String(raw || '').trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '');
  try { return JSON.parse(text); } catch (e) { /* fall through */ }
  const start = Math.min(...['{', '['].map(c => { const i = text.indexOf(c); return i === -1 ? Infinity : i; }));
  const end = Math.max(text.lastIndexOf('}'), text.lastIndexOf(']'));
  if (start !== Infinity && end > start) {
    try { return JSON.parse(text.slice(start, end + 1)); } catch (e) { /* fall through */ }
  }
  throw new Error('The AI reply was not valid JSON.');
}

// Calls generateContent with the best available model, moving to the next one on failure.
// parts: [{ text }] or [{ inlineData: { mimeType, data } }]. Returns { data, model }.
// No long "thinking" before answering: students should not wait. Gemini 2.5 uses a token budget,
// Gemini 3+ a level. If a model refuses the setting, the call is retried once without it.
function thinkingFor(model) {
  const v = versionOf(model);
  if (v >= 3) return { thinkingLevel: 'low' };
  if ((v >= 2.5 || v === 0) && !/pro/.test(model)) return { thinkingBudget: 0 };
  return null;
}

// timeoutMs is the TOTAL time allowed across all models tried, not per model.
async function generateJson({ parts, systemInstruction, kind = 'text', temperature = 0.3, timeoutMs = 60000, key = apiKey(), maxOutputTokens }) {
  if (!key) {
    const err = new Error('GEMINI_API_KEY is not configured on the server.');
    err.code = 'AI_NOT_CONFIGURED';
    throw err;
  }
  const deadline = Date.now() + timeoutMs;
  const models = await modelsFor(kind, key);
  let lastError = null;
  for (const model of models) {
    const left = deadline - Date.now();
    if (left < 3000) break;
    // No single model may use up all the time: leave room to try the next one.
    const perModel = Math.min(left, kind === 'vision' ? 22000 : 14000);
    try {
      const body = {
        contents: [{ role: 'user', parts }],
        generationConfig: Object.assign({ responseMimeType: 'application/json', temperature }, maxOutputTokens ? { maxOutputTokens } : {})
      };
      const thinking = thinkingFor(model);
      if (thinking) body.generationConfig.thinkingConfig = thinking;
      if (systemInstruction) body.systemInstruction = { parts: [{ text: systemInstruction }] };
      const url = `${apiBase()}/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}`;
      const post = b => fetchJson(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(b) }, perModel);
      let json;
      try {
        json = await post(body);
      } catch (err) {
        if (!thinking || err.status !== 400 || !/thinking/i.test(err.message)) throw err;
        delete body.generationConfig.thinkingConfig;
        json = await post(body);
      }
      const textOut = (((json || {}).candidates || [])[0] || {}).content;
      const raw = textOut && Array.isArray(textOut.parts) ? textOut.parts.map(p => p.text || '').join('') : '';
      if (!raw) throw new Error(`${model} returned an empty answer.`);
      return { data: parseModelJson(raw), model };
    } catch (err) {
      lastError = err;
      rest(model, err);
      console.warn(`[GEMINI] ${model} failed: ${err.message}`);
      if (err.status === 401 || err.status === 403) break; // bad key: other models will fail the same way
    }
  }
  throw lastError || new Error('No Gemini model could answer.');
}

// Splits a data URL into { mimeType, data } for inlineData.
function inlinePart(dataUrl, fallbackMime = 'image/jpeg') {
  const s = String(dataUrl || '');
  const m = /^data:([^;,]+);base64,(.*)$/s.exec(s);
  return { inlineData: { mimeType: m ? m[1] : fallbackMime, data: m ? m[2] : s } };
}

module.exports = { apiBase, apiKey, listModels, liveModelFor, rankModels, modelsFor, generateJson, parseModelJson, inlinePart };
