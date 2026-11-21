// ============================================================================
// NCERT LIBRARY (2026-11-19)
// Whole NCERT books are uploaded once as PDFs and shown page by page exactly as
// printed (the browser renders them with pdf.js, loading only the pages it needs
// through HTTP range requests). The server stores the file and a small record;
// it never parses the PDF, so uploads are cheap.
// AI help works on the text the student selected (or the visible page), sent by
// the browser, capped in size, answered without long "thinking", and cached by
// content so the same page never costs tokens twice. Without AI, a simple
// summary and quiz are made from the text itself.
// ============================================================================

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const dataPaths = require('../config/dataPaths');
const gemini = require('./geminiClient');

const DIR = path.join(path.dirname(dataPaths.runtimePath('x.json')), 'ncert_books');
const INDEX = path.join(DIR, 'books.json');
const AI_CACHE = path.join(DIR, 'ai_cache.json');
const MAX_CACHE = 3000;
const ID_RE = /^bk_[a-f0-9]{16}$/;

function fail(status, message) { const e = new Error(message); e.status = status; return e; }
function ensureDir() { fs.mkdirSync(DIR, { recursive: true }); }
function readJson(file, dflt) { try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e) { return dflt; } }
function writeJson(file, data) {
  ensureDir();
  const tmp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(data));
  fs.renameSync(tmp, file);
}
function clean(v, max) { return String(v == null ? '' : v).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '').trim().slice(0, max); }

// rename() fails across drives (e.g. Windows temp folder on C:, project on D:): copy instead.
function moveFile(from, to) {
  try { fs.renameSync(from, to); } catch (err) {
    if (err.code !== 'EXDEV' && err.code !== 'EPERM') throw err;
    fs.copyFileSync(from, to);
    fs.unlink(from, () => {});
  }
}
function uploadDir() { const d = path.join(DIR, 'incoming'); fs.mkdirSync(d, { recursive: true }); return d; }

let books = null;
function all() { if (!books) books = readJson(INDEX, []); return books; }
function save() { writeJson(INDEX, books); }
function publicBook(b) {
  return { id: b.id, title: b.title, classNo: b.classNo, subject: b.subject, language: b.language, pages: b.pages, sizeBytes: b.sizeBytes, hasCover: Boolean(b.cover), uploadedBy: b.uploadedByName || '', uploadedById: b.uploadedBy || '', uploadedAt: b.uploadedAt };
}

function list({ classNo, subject } = {}) {
  return all()
    .filter(b => (!classNo || String(b.classNo) === String(classNo)) && (!subject || b.subject.toLowerCase() === String(subject).toLowerCase()))
    .sort((a, b) => (a.classNo - b.classNo) || a.subject.localeCompare(b.subject) || a.title.localeCompare(b.title))
    .map(publicBook);
}

function get(id) {
  if (!ID_RE.test(String(id))) throw fail(404, 'Book not found.');
  const b = all().find(x => x.id === id);
  if (!b) throw fail(404, 'Book not found.');
  return b;
}
function pdfPath(id) { const b = get(id); return path.join(DIR, `${b.id}.pdf`); }
function cover(id) {
  const b = get(id);
  if (!b.cover) throw fail(404, 'No cover.');
  const m = /^data:(image\/(?:jpeg|png|webp));base64,(.+)$/.exec(b.cover);
  if (!m) throw fail(404, 'No cover.');
  return { type: m[1], data: Buffer.from(m[2], 'base64') };
}

// tempPath: the uploaded file on disk (multer). meta comes from the uploader's browser.
function add(tempPath, meta, uploader) {
  const fd = fs.openSync(tempPath, 'r');
  const head = Buffer.alloc(5);
  fs.readSync(fd, head, 0, 5, 0);
  fs.closeSync(fd);
  if (head.toString('latin1') !== '%PDF-') { fs.unlink(tempPath, () => {}); throw fail(400, 'That file is not a PDF.'); }
  const classNo = parseInt(meta.classNo, 10);
  if (!(classNo >= 1 && classNo <= 12)) { fs.unlink(tempPath, () => {}); throw fail(400, 'Choose the class (1 to 12).'); }
  const subject = clean(meta.subject, 60);
  if (!subject) { fs.unlink(tempPath, () => {}); throw fail(400, 'Enter the subject.'); }
  const coverData = /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(String(meta.cover || '')) && String(meta.cover).length < 400000 ? String(meta.cover) : '';
  ensureDir();
  const id = 'bk_' + crypto.randomBytes(8).toString('hex');
  moveFile(tempPath, path.join(DIR, `${id}.pdf`));
  const rec = {
    id,
    title: clean(meta.title, 120) || `Class ${classNo} ${subject}`,
    classNo,
    subject,
    language: /^(en|hi)$/.test(meta.language) ? meta.language : 'en',
    pages: Math.max(0, Math.min(5000, parseInt(meta.pages, 10) || 0)),
    sizeBytes: fs.statSync(path.join(DIR, `${id}.pdf`)).size,
    cover: coverData,
    uploadedBy: uploader.id || '',
    uploadedByName: clean(uploader.name, 80),
    uploadedAt: new Date().toISOString()
  };
  all().push(rec);
  save();
  return publicBook(rec);
}

function remove(id, user) {
  const b = get(id);
  if (user.role !== 'principal' && (!user.id || user.id !== b.uploadedBy)) throw fail(403, 'Only the teacher who uploaded this book (or the principal) can remove it.');
  books = all().filter(x => x.id !== id);
  save();
  fs.unlink(path.join(DIR, `${id}.pdf`), () => {});
  return { removed: id };
}

// ------------------------------------------------------------------- AI help --
let cache = null;
function cacheGet(key) { if (!cache) cache = readJson(AI_CACHE, {}); return cache[key]; }
function cachePut(key, value) {
  if (!cache) cache = readJson(AI_CACHE, {});
  cache[key] = { v: value, at: Date.now() };
  const keys = Object.keys(cache);
  if (keys.length > MAX_CACHE) keys.sort((a, b) => cache[a].at - cache[b].at).slice(0, keys.length - MAX_CACHE).forEach(k => { delete cache[k]; });
  clearTimeout(cachePut.t);
  cachePut.t = setTimeout(() => { try { writeJson(AI_CACHE, cache); } catch (e) { console.warn('[NCERT LIBRARY] cache not saved:', e.message); } }, 1500);
}

const LANG = { en: 'simple English', hinglish: 'simple Hinglish (Hindi in Roman script mixed with English, like an Indian teacher talks)', hi: 'simple Hindi (Devanagari)' };
// Answer limits leave room so a reply is never cut off half-way (a cut reply cannot be read).
const ACTIONS = {
  summary: {
    tokens: 1600,
    ask: () => 'Summarise this NCERT text for revision (if it spans several pages, cover every page in order). Return JSON {"title": "short heading", "points": [4 to 12 short points in order, each one line, keep every definition, law and formula], "terms": [up to 5 {"term", "meaning"}], "formulas": [formulas from the text in LaTeX with $...$, or []]}.'
  },
  quiz: {
    tokens: n => 500 + n * 260,
    ask: n => `Make a quiz ONLY from this NCERT text. Return JSON {"questions": [${n} objects {"q": "question", "options": [4 short options], "answer": index 0-3, "why": "one line reason from the text"}]}. Cover all parts of the text evenly, mix recall and understanding, options must be plausible, maths in LaTeX with $...$.`
  },
  explain: {
    tokens: 1600,
    ask: () => 'Explain this NCERT text to a student who finds it hard. Return JSON {"title": "short heading", "simple": [3 to 6 lines in plain words, step by step, explain every new word], "example": "one everyday example from an Indian student\'s life", "remember": "one line to remember"}. Maths in LaTeX with $...$.'
  },
  figure: {
    tokens: 1800,
    ask: () => 'The image is a figure from the NCERT textbook; the page text is given only for context. Explain the FIGURE to a student. Return JSON {"title": "what the figure is", "what": "one or two lines: what it shows and why it is in the chapter", "parts": [every labelled part, symbol, arrow or axis: {"label", "meaning"}], "steps": [3 to 6 lines on how to read and understand it, in order], "remember": "one line"}. Maths in LaTeX with $...$.'
  },
  figure_quiz: {
    tokens: n => 500 + n * 260,
    ask: n => `The image is a figure from the NCERT textbook; the page text is given for context. Make ${n} MCQs that test understanding of THIS FIGURE. Return JSON {"questions": [objects {"q", "options": [4], "answer": index 0-3, "why": "one line"}]}. Maths in LaTeX with $...$.`
  },
  figure_ask: {
    tokens: 1400,
    ask: (n, question) => `The image is a figure from the NCERT textbook; the page text is given for context. The student asks about the figure: "${question}". Answer exactly that. Return JSON {"title": "short heading", "simple": [2 to 6 lines answering step by step], "example": "an everyday example if it helps, else empty", "remember": "one line"}. Maths in LaTeX with $...$.`
  }
};
const RESULT_KIND = { summary: 'summary', quiz: 'quiz', explain: 'explain', figure: 'figure', figure_quiz: 'quiz', figure_ask: 'explain' };

function sentences(text) {
  return String(text).replace(/\s+/g, ' ').split(/(?<=[.?!])\s+(?=[A-Z0-9(])/).map(s => s.trim()).filter(s => s.length > 25 && s.length < 400);
}
// Without AI: pick the sentences that carry the most frequent content words.
function offline(action, text, count) {
  const sents = sentences(text);
  const stop = new Set('the a an of to in is are was were be been and or for with as by on at from that this these those it its which their there they we you he she can may will also into than then such each other more most some any not only but have has had our your'.split(' '));
  const freq = {};
  sents.forEach(s => s.toLowerCase().match(/[a-z][a-z-]{3,}/g)?.forEach(w => { if (!stop.has(w)) freq[w] = (freq[w] || 0) + 1; }));
  const score = s => (s.toLowerCase().match(/[a-z][a-z-]{3,}/g) || []).reduce((n, w) => n + (freq[w] || 0), 0) / Math.sqrt(s.length);
  const ranked = sents.map((s, i) => ({ s, i, sc: score(s) })).sort((a, b) => b.sc - a.sc);
  if (action === 'summary' || action === 'explain') {
    const top = ranked.slice(0, 6).sort((a, b) => a.i - b.i).map(x => x.s);
    return action === 'summary'
      ? { title: 'Key points from this part', points: top, terms: [], formulas: [], offline: true }
      : { title: 'This part in short', simple: top.slice(0, 5), example: '', remember: top[0] || '', offline: true };
  }
  const words = Object.keys(freq).sort((a, b) => freq[b] - freq[a]).filter(w => w.length > 4).slice(0, 40);
  const questions = [];
  for (const x of ranked) {
    if (questions.length >= (count || 5)) break;
    const w = words.find(k => new RegExp(`\\b${k}\\b`, 'i').test(x.s));
    if (!w) continue;
    const others = words.filter(k => k !== w).sort(() => Math.random() - 0.5).slice(0, 3);
    if (others.length < 3) break;
    const options = [w, ...others].sort(() => Math.random() - 0.5);
    questions.push({ q: 'Fill in the blank: ' + x.s.replace(new RegExp(`\\b${w}\\b`, 'i'), '______'), options, answer: options.indexOf(w), why: x.s });
    words.splice(words.indexOf(w), 1);
  }
  return { questions, offline: true };
}

function aiEnabled() { return Boolean(process.env.GEMINI_API_KEY); }

// Says in plain words why the AI could not answer (shown to the student, also logged).
function reasonFor(err) {
  const m = String((err && err.message) || '');
  if (err && err.code === 'AI_NOT_CONFIGURED') return 'AI is not set up on the server (GEMINI_API_KEY is missing).';
  if (/HTTP 429|quota|RESOURCE_EXHAUSTED/i.test(m)) return 'the school\'s AI limit is used up for now (Gemini quota). It resets soon.';
  if (/HTTP 40[13]|API key|PERMISSION_DENIED|API_KEY_INVALID/i.test(m)) return 'the AI key on the server was refused (check GEMINI_API_KEY).';
  if (/HTTP 5\d\d|UNAVAILABLE|overloaded/i.test(m)) return 'Google\'s AI service is overloaded right now.';
  if (/timed out|abort|504/i.test(m)) return 'the AI took too long to answer.';
  if (/fetch failed|ENOTFOUND|ECONN|network/i.test(m)) return 'the server could not reach Google\'s AI service (internet or firewall).';
  if (/JSON|empty answer|parse/i.test(m)) return 'the AI answer came back incomplete.';
  return 'the AI service gave an error.';
}

async function ai({ action, text, language, bookId, page, pages, count, image, question, context }) {
  const spec = ACTIONS[action];
  if (!spec) throw fail(400, 'Unknown action.');
  if (bookId) get(bookId);
  const isFigure = /^figure/.test(action);
  const img = isFigure && /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(String(image || '')) && String(image).length < 1600000 ? String(image) : '';
  if (isFigure && !img) throw fail(400, 'Draw a box around the figure first.');
  if (Array.isArray(pages) && pages.length > 5) throw fail(400, 'Choose at most 5 pages for one quiz.');
  const multi = Array.isArray(pages) && pages.length > 1;
  let body = clean(text, multi ? 15000 : 6000).replace(/\s+/g, ' ');
  // Only a heading or a word selected: explain that topic using the rest of the page.
  const pageText = clean(context, 4000).replace(/\s+/g, ' ');
  let focus = '';
  if (!isFigure && body.length < 40) {
    if (body.replace(/[^A-Za-z\u0900-\u097F0-9]/g, '').length < 2) throw fail(400, 'Select a heading, a sentence or a paragraph first.');
    if (pageText.length < 40) throw fail(400, 'Select a little more text (at least a sentence or two).');
    focus = body;
    body = pageText;
  }
  const n = /quiz/.test(action) ? Math.max(3, Math.min(15, parseInt(count, 10) || 5)) : 0;
  const q = action === 'figure_ask' ? clean(question, 300) : '';
  if (action === 'figure_ask' && q.length < 3) throw fail(400, 'Type your question about the figure.');
  const lang = LANG[language] ? language : 'en';
  const key = crypto.createHash('sha1').update(`${action}|${lang}|${n}|${q}|${focus}|${body}|${img}`).digest('hex');
  const hit = cacheGet(key);
  if (hit) return Object.assign({ cached: true }, hit.v);
  const fallback = reason => Object.assign(isFigure && action !== 'figure_quiz'
    ? { title: 'About this figure', what: 'Reading a figure needs the AI helper, which is not available right now.', parts: [], steps: sentences(body).filter(x => /fig/i.test(x)).slice(0, 4), remember: '', simple: [] }
    : offline(RESULT_KIND[action], body, n || 5), { offline: true, reason });
  if (!aiEnabled()) return fallback('AI is not set up on the server (GEMINI_API_KEY is missing).');
  try {
    const where = multi ? ` (pages ${pages.map(x => parseInt(x, 10)).join(', ')})` : (page ? ` (page ${parseInt(page, 10) || ''})` : '');
    const lead = focus ? `The student selected only this heading or term: "${focus}". Teach THAT topic, using the page text below as the source (ignore parts of the page about other topics).\n` : '';
    const parts = [{ text: `${lead}${spec.ask(n, q)}\n\nNCERT text${where}:\n<<<${body || '(no text on this part of the page)'}>>>` }];
    if (img) parts.push(gemini.inlinePart(img));
    const { data } = await gemini.generateJson({
      systemInstruction: `You help Indian school students study from their NCERT textbook. Use only the given material plus basic school knowledge. Write in ${LANG[lang]}. Reply with JSON only.`,
      parts,
      kind: img ? 'vision' : 'text',
      temperature: /quiz/.test(action) ? 0.5 : 0.3,
      maxOutputTokens: (typeof spec.tokens === 'function' ? spec.tokens(n) : spec.tokens) + (multi && !n ? 900 : 0),
      timeoutMs: img || multi ? 40000 : 25000
    });
    const out = tidy(RESULT_KIND[action], data, n);
    if (!out) throw new Error('empty answer');
    cachePut(key, out);
    return out;
  } catch (err) {
    const reason = reasonFor(err);
    console.warn(`[NCERT LIBRARY] AI help failed (${reason}):`, err.message);
    return fallback(reason);
  }
}

function tidy(action, d, n) {
  if (!d || typeof d !== 'object') return null;
  const s = (v, n) => clean(v, n);
  const arr = (v, n, m) => (Array.isArray(v) ? v : []).map(x => s(x, m)).filter(Boolean).slice(0, n);
  if (action === 'summary') {
    const points = arr(d.points, 14, 300);
    if (!points.length) return null;
    return { title: s(d.title, 120), points, terms: (Array.isArray(d.terms) ? d.terms : []).slice(0, 6).map(t => ({ term: s(t && t.term, 60), meaning: s(t && t.meaning, 220) })).filter(t => t.term), formulas: arr(d.formulas, 6, 200) };
  }
  if (action === 'figure') {
    const steps = arr(d.steps, 7, 320);
    if (!steps.length && !d.what) return null;
    return { title: s(d.title, 120), what: s(d.what, 400), parts: (Array.isArray(d.parts) ? d.parts : []).slice(0, 12).map(t => ({ label: s(t && t.label, 60), meaning: s(t && t.meaning, 240) })).filter(t => t.label), steps, remember: s(d.remember, 240) };
  }
  if (action === 'explain') {
    const simple = arr(d.simple, 7, 320);
    if (!simple.length) return null;
    return { title: s(d.title, 120), simple, example: s(d.example, 400), remember: s(d.remember, 240) };
  }
  const questions = (Array.isArray(d.questions) ? d.questions : []).map(q => {
    const options = arr(q && q.options, 4, 200);
    const answer = parseInt(q && q.answer, 10);
    return options.length === 4 && answer >= 0 && answer < 4 && s(q.q, 400) ? { q: s(q.q, 400), options, answer, why: s(q.why, 300) } : null;
  }).filter(Boolean).slice(0, n || 6);
  return questions.length ? { questions } : null;
}

module.exports = { uploadDir, list, get, pdfPath, cover, add, remove, ai, offline, DIR, ID_RE };
