// ============================================================================
// QUESTION BANK (2026-11-21): what a teacher can do with questions in the bank.
//   - edit / delete: only questions THEY added (injected_by.faculty_id), in their subject
//   - saved:         a private "My saved questions" list per teacher
//   - reports:       "Report a mistake" on any question of their subject; the teacher who
//                    added it (or any same-subject teacher) can mark it fixed
// Questions added by a teacher are seen by all teachers of the same subject (as before).
// ============================================================================

const fs = require('fs');
const crypto = require('crypto');
const { inMemoryStore } = require('../config/database');
const dataPaths = require('../config/dataPaths');
const injection = require('./questionInjectionService');
const { sanitizeQuestionPayload } = require('./llmQuestionEngine');

const META_FILE = dataPaths.runtimePath('question_bank_meta.json');
const DIFFICULTIES = ['EASY', 'MEDIUM', 'HARD'];
const REASONS = ['WRONG_ANSWER', 'TYPO', 'WRONG_CHAPTER', 'UNCLEAR', 'DUPLICATE', 'OTHER'];

function fail(status, message) { const e = new Error(message); e.status = status; return e; }
function clean(v, max) { return String(v == null ? '' : v).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '').trim().slice(0, max); }
function subjectOf(key) {
  const k = String(key || '').toUpperCase();
  if (/PHYS/.test(k)) return 'PHYSICS';
  if (/CHEM/.test(k)) return 'CHEMISTRY';
  if (/BIO/.test(k)) return 'BIOLOGY';
  if (/MATH/.test(k)) return 'MATHEMATICS';
  if (/SCIENCE/.test(k)) return 'SCIENCE';
  return k;
}

// Saved lists and reports live in the store (saved to PostgreSQL when configured) and a small file.
function meta() {
  if (!inMemoryStore.questionBankMeta) {
    let m = null;
    try { m = JSON.parse(fs.readFileSync(META_FILE, 'utf8')); } catch (e) { m = null; }
    inMemoryStore.questionBankMeta = m && typeof m === 'object' ? m : { saved: [], reports: [] };
  }
  const m = inMemoryStore.questionBankMeta;
  if (!Array.isArray(m.saved)) m.saved = [];
  if (!Array.isArray(m.reports)) m.reports = [];
  return m;
}
function saveMeta() {
  try {
    const tmp = META_FILE + '.' + process.pid + '.tmp';
    fs.mkdirSync(require('path').dirname(META_FILE), { recursive: true });
    fs.writeFileSync(tmp, JSON.stringify(meta()));
    fs.renameSync(tmp, META_FILE);
  } catch (e) { console.warn('[QUESTION BANK] meta not saved:', e.message); }
}

function teacherOf(body) {
  const t = (body && body.teacher) || {};
  const id = clean(t.id, 80);
  const subjectKey = subjectOf(t.subjectKey || t.subject);
  if (!id || !subjectKey) throw fail(401, 'Teacher details are missing.');
  return { id, name: clean(t.name, 80), subjectKey };
}

// Every copy of a question (it can sit in more than one bank list).
function copies(id) {
  const out = [];
  const banks = inMemoryStore.subjectBanks || {};
  Object.keys(banks).forEach(k => { (banks[k] || []).forEach((q, i) => { if (q && q.id === id) out.push({ list: banks[k], i }); }); });
  (inMemoryStore.questions || []).forEach((q, i) => { if (q && q.id === id) out.push({ list: inMemoryStore.questions, i }); });
  return out;
}
function find(id) {
  const c = copies(String(id || ''));
  if (!c.length) throw fail(404, 'Question not found.');
  return c[0].list[c[0].i];
}
function ownerId(q) { return (q.injected_by && q.injected_by.faculty_id) || ''; }
function subjectOfQuestion(q) { return subjectOf(q.subjectKey || q.subject || (q.injected_by && q.injected_by.faculty_subject)); }
function assertSubject(q, t) {
  const qs = subjectOfQuestion(q);
  if (qs && t.subjectKey && qs !== t.subjectKey && !(qs === 'SCIENCE' && ['PHYSICS', 'CHEMISTRY', 'BIOLOGY'].includes(t.subjectKey))) {
    throw fail(403, 'This question belongs to another subject.');
  }
}
function assertOwner(q, t) {
  assertSubject(q, t);
  if (!ownerId(q) || ownerId(q) !== t.id) throw fail(403, 'Only the teacher who added this question can change it.');
}

// --------------------------------------------------------------- edit --
function update(id, body) {
  const t = teacherOf(body);
  const q = find(id);
  assertOwner(q, t);
  const c = body.changes || {};
  const next = Object.assign({}, q);
  if (c.question_latex !== undefined) {
    next.question_latex = clean(c.question_latex, 8000);
    if (next.question_latex.length < 5) throw fail(400, 'The question text is too short.');
  }
  if (c.options !== undefined) {
    const opts = (Array.isArray(c.options) ? c.options : []).map((o, i) => ({ key: 'ABCD'[i], latex: clean(o && o.latex, 1500), is_correct: Boolean(o && o.is_correct) })).filter(o => o.latex).slice(0, 4);
    if (opts.length && opts.length < 2) throw fail(400, 'Give at least two options, or none for a written answer.');
    if (opts.length && opts.filter(o => o.is_correct).length !== 1) throw fail(400, 'Mark exactly one option as correct.');
    next.options_latex = opts; next.options = opts;
    next.question_format = opts.length ? 'MCQ_SINGLE' : (/MCQ/.test(String(q.question_format || '')) ? 'SHORT_ANSWER' : q.question_format || 'SHORT_ANSWER');
    next.correct_answer = opts.length ? opts.find(o => o.is_correct).key : null;
    next.correct_answer_latex = opts.length ? opts.find(o => o.is_correct).latex : next.correct_answer_latex;
  }
  if (c.correct_answer_latex !== undefined && !(next.options_latex || []).length) next.correct_answer_latex = clean(c.correct_answer_latex, 3000);
  if (c.solution_latex !== undefined) next.solution_latex = clean(c.solution_latex, 12000);
  if (c.chapter !== undefined && clean(c.chapter, 160)) { next.chapter_name = clean(c.chapter, 160); next.chapter = next.chapter_name; }
  if (c.topic !== undefined) next.topic = clean(c.topic, 160) || next.topic;
  if (c.difficulty !== undefined) { const d = String(c.difficulty).toUpperCase(); if (!DIFFICULTIES.includes(d)) throw fail(400, 'Difficulty must be Easy, Medium or Hard.'); next.difficulty = d; }
  if (c.marks !== undefined) { const m = Number(c.marks); if (!(m > 0 && m <= 20)) throw fail(400, 'Marks must be between 1 and 20.'); next.marks = m; next.marks_weightage = m; }
  next.edited_at = new Date().toISOString();
  next.edited_by = t.name || t.id;
  const finalQ = sanitizeQuestionPayload(next);
  copies(q.id).forEach(x => { x.list[x.i] = finalQ; });
  injection.rewritePersistedCustomQuestions(list => {
    const at = list.findIndex(x => x.id === q.id);
    if (at === -1) list.unshift(finalQ); else list[at] = finalQ;
    return list;
  });
  return finalQ;
}

function remove(id, body) {
  const t = teacherOf(body);
  const q = find(id);
  assertOwner(q, t);
  const banks = inMemoryStore.subjectBanks || {};
  Object.keys(banks).forEach(k => { banks[k] = (banks[k] || []).filter(x => !x || x.id !== q.id); });
  if (Array.isArray(inMemoryStore.questions)) inMemoryStore.questions = inMemoryStore.questions.filter(x => !x || x.id !== q.id);
  injection.rewritePersistedCustomQuestions(list => list.filter(x => x.id !== q.id));
  const m = meta();
  m.saved = m.saved.filter(s => s.questionId !== q.id);
  m.reports = m.reports.filter(r => r.questionId !== q.id);
  saveMeta();
  return { removed: q.id };
}

// -------------------------------------------------------------- saved --
function savedIds(teacherId) {
  const id = clean(teacherId, 80);
  return meta().saved.filter(s => s.teacherId === id).map(s => s.questionId);
}
function setSaved(body) {
  const t = teacherOf(body);
  const qid = clean(body.questionId, 120);
  find(qid);
  const m = meta();
  m.saved = m.saved.filter(s => !(s.teacherId === t.id && s.questionId === qid));
  if (body.saved !== false) m.saved.push({ teacherId: t.id, questionId: qid, at: new Date().toISOString() });
  saveMeta();
  return { saved: body.saved !== false, savedIds: savedIds(t.id) };
}

// ------------------------------------------------------------ reports --
function report(body) {
  const t = teacherOf(body);
  const q = find(clean(body.questionId, 120));
  assertSubject(q, t);
  const reason = REASONS.includes(String(body.reason || '').toUpperCase()) ? String(body.reason).toUpperCase() : 'OTHER';
  const note = clean(body.note, 600);
  if (reason === 'OTHER' && note.length < 3) throw fail(400, 'Say what is wrong with the question.');
  const m = meta();
  if (m.reports.some(r => r.questionId === q.id && r.reporterId === t.id && r.status === 'OPEN')) throw fail(409, 'You have already reported this question.');
  const r = { id: 'qr_' + crypto.randomBytes(6).toString('hex'), questionId: q.id, subjectKey: subjectOfQuestion(q) || t.subjectKey, reason, note, reporterId: t.id, reporterName: t.name, ownerId: ownerId(q), status: 'OPEN', at: new Date().toISOString() };
  m.reports.push(r);
  saveMeta();
  return r;
}
function reports(teacherId, subjectKey) {
  const sk = subjectOf(subjectKey);
  return meta().reports.filter(r => r.status === 'OPEN' && (!sk || r.subjectKey === sk || (r.subjectKey === 'SCIENCE' && ['PHYSICS', 'CHEMISTRY', 'BIOLOGY'].includes(sk))));
}
function resolve(reportId, body) {
  const t = teacherOf(body);
  const r = meta().reports.find(x => x.id === reportId);
  if (!r) throw fail(404, 'Report not found.');
  if (r.subjectKey && r.subjectKey !== t.subjectKey && r.subjectKey !== 'SCIENCE') throw fail(403, 'This report belongs to another subject.');
  r.status = 'FIXED';
  r.fixedBy = t.name || t.id;
  r.fixedAt = new Date().toISOString();
  saveMeta();
  return r;
}

// ------------------------------------------------------------------ AI help (2026-11-24) --
// A question's solution is "thin" when it is missing, very short or a placeholder line.
function solutionIsThin(q) {
  const s = String((q && q.solution_latex) || '').replace(/\s+/g, ' ').trim();
  if (s.length < 90) return true;
  return /solution attached|detailed step-by-step solution|see solution|refer (to )?ncert/i.test(s) && s.length < 200;
}
function stepsToLatex(steps, answer) {
  return steps.map((st, i) => `Step ${i + 1}: ${st.title}\n${st.text}`).join('\n\n') + (answer ? `\n\nAnswer: ${answer}` : '');
}
function applySolution(id, sol) {
  copies(id).forEach(c => {
    const q = c.list[c.i];
    q.solution_latex = stepsToLatex(sol.steps, sol.final_answer);
    q.solution_steps = sol.steps;
    q.solution_ai = true;
  });
}
let solutionsApplied = false;
// Puts saved AI solutions back on the built-in questions after a restart (they are not in the bank files).
function applySavedSolutions() {
  if (solutionsApplied) return;
  solutionsApplied = true;
  const sols = meta().solutions || {};
  Object.keys(sols).forEach(id => applySolution(id, sols[id]));
}
async function detailedSolution(id, body) {
  const t = teacherOf(body);
  const q = find(id);
  if (!q) throw fail(404, 'Question not found.');
  const m = meta();
  m.solutions = m.solutions || {};
  if (m.solutions[id] && !body.force) return { solution: m.solutions[id], question: find(id), cached: true };
  if (!body.force && !solutionIsThin(q)) return { solution: null, question: q, cached: true };
  const opts = Array.isArray(q.options_latex) ? q.options_latex.map(o => `${o.key}) ${o.latex}`).join('\n') : '';
  const correct = (Array.isArray(q.options_latex) && (q.options_latex.find(o => o.is_correct) || {}).key) || q.correct_answer || q.correct_answer_latex || '';
  const gemini = require('./geminiClient');
  const out = ((await gemini.generateJson({
    temperature: 0.2,
    systemInstruction: 'You are an experienced Indian school teacher (CBSE / JEE / NEET). Write clear, correct, student-friendly worked solutions. Use LaTeX between $ signs for maths. Return JSON only.',
    parts: [{ text: `QB_DETAILED_SOLUTION\nWrite a detailed step-by-step solution for this ${q.subject || 'Physics'} question (Class ${q.grade || 12}, chapter: ${q.chapter_name || q.chapter || ''}).\nQuestion: ${q.question_latex}\n${opts ? 'Options:\n' + opts + '\n' : ''}${correct ? 'The correct answer is: ' + correct + '\n' : ''}${q.solution_latex ? 'Short solution already given: ' + q.solution_latex + '\n' : ''}Give 3 to 7 steps. Each step: a short title and the working (what law or formula, why, then the numbers with units). Do not change the correct answer.\nReturn JSON: {"steps":[{"title":"...","text":"..."}],"final_answer":"...","concept":"one line on the idea used"}` }]
  })) || {}).data || {};
  const steps = (Array.isArray(out && out.steps) ? out.steps : []).map(st => ({ title: clean(st.title, 120), text: clean(st.text, 2000) })).filter(st => st.text).slice(0, 10);
  if (!steps.length) throw fail(422, 'The AI did not return a solution. Please try again.');
  const sol = { steps, final_answer: clean(out.final_answer, 400), concept: clean(out.concept, 300), at: new Date().toISOString(), by: t.id };
  m.solutions[id] = sol;
  applySolution(id, sol);
  saveMeta();
  if (q.injected_by) injection.rewritePersistedCustomQuestions(list => list.map(x => (x.id === id ? Object.assign({}, x, { solution_latex: stepsToLatex(steps, sol.final_answer), solution_steps: steps, solution_ai: true }) : x)));
  return { solution: sol, question: find(id), cached: false };
}

// Drafts new questions for a chapter (for chapters with few questions). Nothing is saved here:
// the teacher reviews the drafts and saves the ones they keep through the normal add-question import.
async function generateDrafts(body) {
  const t = teacherOf(body);
  const count = Math.max(1, Math.min(10, Number(body.count) || 5));
  const chapter = clean(body.chapter, 160);
  if (!chapter) throw fail(400, 'Choose a chapter first.');
  const grade = clean(body.grade || '12', 4);
  const mode = String(body.mode || 'BOARD').toUpperCase() === 'COMPETITIVE' ? 'COMPETITIVE' : 'BOARD';
  const difficulty = DIFFICULTIES.includes(String(body.difficulty || '').toUpperCase()) ? String(body.difficulty).toUpperCase() : 'MIXED';
  const kind = ['MIXED', 'NUMERICAL'].includes(String(body.kind || '').toUpperCase()) ? String(body.kind).toUpperCase() : 'MCQ';
  const gemini = require('./geminiClient');
  const out = ((await gemini.generateJson({
    temperature: 0.5,
    systemInstruction: 'You are an expert Indian question setter. Every question must be correct, unambiguous and match the NCERT syllabus of the class. Use LaTeX between $ signs. Return JSON only.',
    parts: [{ text: `QB_GENERATE_QUESTIONS COUNT=${count}\nWrite ${count} new ${t.subjectKey.toLowerCase()} questions for Class ${grade}, chapter "${chapter}"${body.topic ? ', topic "' + clean(body.topic, 160) + '"' : ''}.\nStyle: ${mode === 'COMPETITIVE' ? 'JEE/NEET single-correct MCQs, +4/-1' : 'CBSE / HP Board exam style'}. Difficulty: ${difficulty}. ${kind === 'MCQ' ? 'All multiple choice with 4 options.' : kind === 'NUMERICAL' ? 'All numerical-answer questions (the answer is one number; leave options empty and put the number in "answer").' : 'Mix of multiple choice (4 options) and short written questions.'}\nReturn JSON: {"questions":[{"question":"...","options":["...","...","...","..."] (empty for written),"answer":"A|B|C|D or the written answer","solution":"step-by-step working","topic":"...","difficulty":"EASY|MEDIUM|HARD","marks":1}]}` }]
  })) || {}).data || {};
  const qs = (Array.isArray(out && out.questions) ? out.questions : []).slice(0, count).map(x => {
    const options = (Array.isArray(x.options) ? x.options : []).map(o => clean(o, 1500)).filter(Boolean).slice(0, 4);
    const isMcq = options.length === 4;
    const key = String(x.answer || '').trim().toUpperCase().replace(/[^A-D]/g, '').slice(0, 1);
    return {
      question_latex: clean(x.question, 4000),
      options_latex: isMcq ? options.map((o, i) => ({ key: 'ABCD'[i], latex: o, is_correct: 'ABCD'[i] === key })) : [],
      correct_answer: isMcq ? key : null,
      correct_answer_latex: isMcq ? (options['ABCD'.indexOf(key)] || '') : clean(x.answer, 2000),
      question_format: isMcq ? 'MCQ_SINGLE' : (kind === 'NUMERICAL' ? 'NUMERICAL' : 'SHORT_ANSWER'),
      solution_latex: clean(x.solution, 6000),
      chapter_name: chapter, chapter, topic: clean(x.topic, 160) || clean(body.topic, 160) || chapter,
      difficulty: DIFFICULTIES.includes(String(x.difficulty || '').toUpperCase()) ? String(x.difficulty).toUpperCase() : 'MEDIUM',
      marks: Math.max(1, Math.min(20, Number(x.marks) || (isMcq ? 1 : 3))),
      ai_generated: true
    };
  }).filter(x => x.question_latex.length >= 5 && (x.options_latex.length ? x.correct_answer : x.correct_answer_latex));
  if (!qs.length) throw fail(422, 'The AI did not return usable questions. Please try again.');
  return { questions: qs };
}

module.exports = { update, remove, savedIds, setSaved, report, reports, resolve, REASONS, subjectOf, detailedSolution, generateDrafts, applySavedSolutions, solutionIsThin };
