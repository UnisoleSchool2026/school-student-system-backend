/* =============================================================================
   TESTS & DPPs (2026-11-24)
   One place for teachers to build, publish and manage tests and DPPs.
   - build(): picks questions from the bank for one or more chapters (and topics), from the
     sources the teacher ticks (board PYQs, NCERT & Exemplar, practice, teacher-added, AI).
       Board mode   : counts per marks (1, 2, 3, 4, 5 marks)
       Competitive  : counts per difficulty (Easy / Medium / Hard), +4 / -1 marking
       Full length  : JEE (Physics, Chemistry, Maths) or NEET (Physics, Chemistry, Biology)
     Missing questions are drafted by AI only when the teacher ticked the AI source.
   - publish(): the same draft goes out as a TEST or a DPP (DPP: MCQ + numerical only),
     to the whole class or chosen students, with the scheduling options.
   - list / take back / publish again / extend / change students / attempts / report.
   Tests live in inMemoryStore.assessments, DPPs in teacherDppService (unchanged stores).
   ========================================================================== */
const crypto = require('crypto');
const { inMemoryStore } = require('../config/database');
const content = require('./canonicalContentService');
const schedule = require('./scheduleService');
const dpp = require('./teacherDppService');
const bankFilter = require('./bankFilter');

const BANK_OF = { PHYSICS: 'senior_physics', CHEMISTRY: 'senior_chemistry', MATHEMATICS: 'senior_mathematics', BIOLOGY: 'senior_biology', CLASS10_MATHEMATICS: 'class10_math_pyq_ncert', CLASS10_SCIENCE: 'class10_science' };
const NAME_OF = { PHYSICS: 'Physics', CHEMISTRY: 'Chemistry', MATHEMATICS: 'Mathematics', BIOLOGY: 'Biology', CLASS10_MATHEMATICS: 'Mathematics', CLASS10_SCIENCE: 'Science' };
const FULL_LENGTH = {
  JEE: { subjects: ['PHYSICS', 'CHEMISTRY', 'MATHEMATICS'], perSubject: { MCQ: 20, NUMERICAL: 5 }, minutes: 180 },
  NEET: { subjects: ['PHYSICS', 'CHEMISTRY', 'BIOLOGY'], perSubject: { MCQ: 45 }, biologyMcq: 90, minutes: 200 }
};
const BOARD_TYPES = ['MCQ', 'AR', 'SHORT', 'LONG', 'CASE', 'NUMERICAL'];
const COMP_TYPES = ['MCQ', 'MULTI', 'NUMERICAL'];
const SOURCES = ['PYQ', 'NCERT', 'PRACTICE', 'TEACHER', 'AI'];

function fail(status, message) { const e = new Error(message); e.status = status; return e; }
function clean(v, max) { return String(v == null ? '' : v).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '').trim().slice(0, max || 200); }
function norm(s) { return String(s || '').toLowerCase().replace(/^(chapter|ch)\s*\d+\s*[:.\-]?\s*/, '').replace(/[^a-z0-9]+/g, ' ').trim(); }
function shuffle(list) { const a = list.slice(); for (let i = a.length - 1; i > 0; i--) { const j = crypto.randomInt(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; }

// --------------------------------------------------------------- classify --
function optionsOf(q) { return Array.isArray(q.options_latex) ? q.options_latex.filter(o => o && String(o.latex || '').trim()) : []; }
function keyOf(q) {
  const opts = optionsOf(q);
  if (!opts.length) return null;
  const marked = opts.filter(o => o.is_correct);
  if (marked.length === 1) return marked[0].key;
  const k = String(q.correct_answer || '').trim().toUpperCase().replace(/^\(?(?:OPTION\s*)?([A-D])\)?\.?$/, '$1');
  if (/^[A-D]$/.test(k)) return k;
  const t = String(q.correct_answer_latex || '').replace(/\s+/g, '').toLowerCase();
  const hit = t && opts.find(o => String(o.latex).replace(/\s+/g, '').toLowerCase() === t);
  return hit ? hit.key : null;
}
function typeOf(q) {
  const f = String(q.question_format || q.question_type || '').toUpperCase();
  if (/MULTI/.test(f)) return 'MULTI';
  if (/NUMERIC|INTEGER/.test(f) && !optionsOf(q).length) return 'NUMERICAL';
  if (/ASSERT/.test(f)) return 'AR';
  if (/CASE|PASSAGE|COMPREHENSION/.test(f)) return 'CASE';
  if (optionsOf(q).length >= 2) return 'MCQ';
  if (/LONG|DERIV|ESSAY/.test(f)) return 'LONG';
  return 'SHORT';
}
function sourceOf(q) {
  if (q.injected_by && q.injected_by.faculty_id) return 'TEACHER';
  const src = String(q.question_source || q.source_category || '').toUpperCase();
  const app = String(q.pyq_appearance || '').toUpperCase();
  if (/NCERT|EXEMPLAR/.test(src)) return 'NCERT';
  if (/PYQ/.test(src) || /(CBSE|JEE|NEET|HP)[^0-9]{0,30}20\d\d/.test(app)) return 'PYQ';
  return 'PRACTICE';
}
function diffOf(q) { const d = String(q.difficulty || 'MEDIUM').toUpperCase(); return ['EASY', 'MEDIUM', 'HARD'].includes(d) ? d : 'MEDIUM'; }
function marksOf(q) { return Number(q.marks || q.marks_weightage) || (diffOf(q) === 'EASY' ? 1 : diffOf(q) === 'HARD' ? 5 : 3); }
function autoCheckable(q) { const t = typeOf(q); return (t === 'NUMERICAL' && String(q.correct_answer_latex || q.correct_answer || '').trim()) || Boolean(keyOf(q)); }
function chapterMatch(q, chapters) {
  if (!chapters || !chapters.length) return true;
  return chapters.some(c => {
    const cs = String(c);
    if (/^\d+$/.test(cs) && q.chapter_number !== undefined && String(q.chapter_number) === cs) return true;
    const a = norm(cs), b = norm(q.chapter_name || q.chapter);
    return a && b && (a === b || b.indexOf(a) !== -1 || a.indexOf(b) !== -1);
  });
}

// One subject's questions for this class and board / stream.
function pool({ subjectKey, grades, mode, board, stream, chapters, topics, sources, types }) {
  const list = (inMemoryStore.subjectBanks || {})[BANK_OF[subjectKey]] || [];
  const ctx = { mode, board: mode === 'BOARD' ? board : undefined, stream: mode === 'COMPETITIVE' ? stream : undefined };
  const seen = new Set();
  return list.filter(q => {
    if (!q || !q.id || seen.has(q.id)) return false;
    seen.add(q.id);
    if ((q.status || 'APPROVED') !== 'APPROVED') return false;
    if (grades && grades.length && !grades.includes(String(q.grade || '12'))) return false;
    if (mode && !content.matchesModeContext(content.classifyQuestion(q, BANK_OF[subjectKey]), ctx)) return false;
    if (mode === 'BOARD' && !bankFilter.keepForBoard(q, board)) return false;
    if (!chapterMatch(q, chapters)) return false;
    if (topics && topics.length && !topics.includes(topicIdOf(q, subjectKey) || 'other')) return false;
    if (sources && sources.length && !sources.includes(sourceOf(q))) return false;
    if (types && types.length && !types.includes(typeOf(q))) return false;
    if (mode === 'COMPETITIVE' && !autoCheckable(q)) return false;
    return true;
  });
}

// ------------------------------------------------- syllabus topics --
// Bank questions carry their own short topic labels; teachers pick syllabus topics instead.
// Each question is matched to the syllabus topic of its chapter that shares the most words.
const STOP = new Set('the of and in a an to for on with by from is are its at as or law laws its using use find what which when how between'.split(' '));
function words(t) { return String(t || '').toLowerCase().replace(/\$[^$]*\$/g, ' ').replace(/[^a-z0-9 ]+/g, ' ').split(/\s+/).filter(w => w.length > 2 && !STOP.has(w)); }
function stem(w) { return w.replace(/(ies|es|s|ing|ed|al|ic|ity)$/, ''); }
const topicCache = new Map();
function syllabusTopicsFor(subjectKey, grade, chapterName) {
  const k = `${subjectKey}|${grade}|${norm(chapterName)}`;
  if (topicCache.has(k)) return topicCache.get(k);
  let topics = [];
  try {
    const tax = require('./curriculumTaxonomy').getSubjectTaxonomy(subjectKey);
    const ch = ((tax && tax.chapters) || []).find(c => String(c.grade) === String(grade) && (norm(c.chapterName) === norm(chapterName) || norm(chapterName).indexOf(norm(c.chapterName)) !== -1 || norm(c.chapterName).indexOf(norm(chapterName)) !== -1));
    topics = ((ch && ch.topics) || []).map(t => ({ id: t.id, name: t.topicName, bag: new Set(words(t.topicName + ' ' + (t.subtopics || []).join(' ')).map(stem)) }));
  } catch (e) { topics = []; }
  topicCache.set(k, topics);
  return topics;
}
function topicIdOf(q, subjectKey) {
  const topics = syllabusTopicsFor(subjectKey, q.grade || '12', q.chapter_name || q.chapter);
  if (!topics.length) return null;
  const mine = words(`${q.topic || ''} ${q.subtopic || ''} ${q.topic || ''} ${String(q.question_latex || '').slice(0, 240)}`).map(stem);
  let best = null, score = 0;
  topics.forEach(t => { let n = 0; mine.forEach(w => { if (t.bag.has(w)) n += 1; }); if (n > score) { score = n; best = t; } });
  return best ? best.id : null;
}

// Picks n questions spread over the chapters (round robin), never repeating.
function pickSpread(cands, n, used) {
  const byCh = new Map();
  shuffle(cands).forEach(q => { if (used.has(q.id)) return; const k = norm(q.chapter_name || q.chapter) || 'x'; if (!byCh.has(k)) byCh.set(k, []); byCh.get(k).push(q); });
  const lanes = Array.from(byCh.values());
  const out = [];
  while (out.length < n && lanes.some(l => l.length)) {
    lanes.forEach(l => { if (out.length < n && l.length) { const q = l.shift(); if (!used.has(q.id)) { used.add(q.id); out.push(q); } } });
  }
  return out;
}

// The question as it goes into a test or DPP.
function toItem(q, extra) {
  const t = typeOf(q);
  const key = keyOf(q);
  return Object.assign({
    id: q.id, source_question_id: q.id, subjectKey: q.subjectKey || null,
    question_latex: q.question_latex, options_latex: optionsOf(q).map(o => ({ key: o.key, latex: o.latex, is_correct: o.key === key })),
    correct_answer: key || (t === 'NUMERICAL' ? String(q.correct_answer_latex || q.correct_answer || '').replace(/\$/g, '').trim() : null),
    correct_answer_latex: q.correct_answer_latex || '', solution_latex: q.solution_latex || '',
    question_type: t === 'MCQ' ? 'MCQ_SINGLE' : t === 'MULTI' ? 'MCQ_MULTI' : t, question_format: q.question_format || null, type: t,
    chapter_name: q.chapter_name || q.chapter || '', topic: q.topic || '', difficulty: diffOf(q), marks: marksOf(q),
    source: sourceOf(q), pyq_appearance: q.pyq_appearance || '', ai_generated: Boolean(q.ai_generated)
  }, extra || {});
}

async function aiFill({ teacher, subjectKey, grade, mode, chapter, need, difficulty, marks, kind }) {
  if (need <= 0) return [];
  const bank = require('./questionBankService');
  const out = await bank.generateDrafts({ teacher: { id: teacher.id, subjectKey, name: teacher.name }, chapter, count: Math.min(10, need), grade, mode, difficulty, kind: kind === 'NUMERICAL' ? 'NUMERICAL' : (mode === 'COMPETITIVE' || (marks || 1) === 1 ? 'MCQ' : 'MIXED') });
  return (out.questions || []).map((q, i) => Object.assign(q, { id: `ai_${Date.now().toString(36)}_${i}_${crypto.randomBytes(2).toString('hex')}`, subjectKey, grade, marks: marks || q.marks, difficulty: difficulty && difficulty !== 'MIXED' ? difficulty : q.difficulty, ai_generated: true, status: 'APPROVED' }));
}

function teacherOf(body) {
  const t = (body && body.teacher) || {};
  if (!t.id || !(t.subjectKey || t.subject)) throw fail(401, 'Teacher details are missing.');
  return { id: clean(t.id, 80), name: clean(t.name || t.full_name, 80), subjectKey: String(t.subjectKey || t.subject).toUpperCase(), subjectName: clean(t.subjectName || t.subject, 40) };
}

// ------------------------------------------------------------------ build --
async function build(body = {}) {
  const teacher = teacherOf(body);
  const mode = String(body.mode || 'BOARD').toUpperCase() === 'COMPETITIVE' ? 'COMPETITIVE' : 'BOARD';
  const board = clean(body.board || 'CBSE', 20).toUpperCase();
  const stream = clean(body.stream || 'JEE', 20).toUpperCase().indexOf('NEET') !== -1 ? 'NEET' : 'JEE';
  const grade = clean(body.grade || '12', 4);
  const sources = (Array.isArray(body.sources) && body.sources.length ? body.sources : ['PYQ', 'NCERT', 'PRACTICE', 'TEACHER']).map(s => String(s).toUpperCase()).filter(s => SOURCES.includes(s));
  const bankSources = sources.filter(s => s !== 'AI');
  const useAi = sources.includes('AI');
  const chapters = (Array.isArray(body.chapters) ? body.chapters : []).map(c => clean(c, 160)).filter(Boolean);
  const topics = (Array.isArray(body.topics) ? body.topics : []).map(c => clean(c, 160)).filter(Boolean);
  const allowed = mode === 'COMPETITIVE' ? COMP_TYPES : BOARD_TYPES;
  const types = (Array.isArray(body.types) && body.types.length ? body.types : allowed).map(t => String(t).toUpperCase()).filter(t => allowed.includes(t));
  if (!types.length) throw fail(400, 'Choose at least one question type.');
  if (!bankSources.length && !useAi) throw fail(400, 'Choose at least one question source.');
  const used = new Set((body.excludeIds || []).map(String));
  const notes = [];
  let items = [];

  if (body.fullLength) {
    if (mode !== 'COMPETITIVE') throw fail(400, 'Full-length tests are for Competitive Prep (JEE / NEET).');
    const fl = FULL_LENGTH[stream];
    const mix = body.difficultyMix || { EASY: 30, MEDIUM: 50, HARD: 20 };
    const grades = grade === '11' ? ['11'] : ['11', '12'];
    for (const sk of fl.subjects) {
      const perType = sk === 'BIOLOGY' && fl.biologyMcq ? { MCQ: fl.biologyMcq } : fl.perSubject;
      for (const t of Object.keys(perType)) {
        const want = perType[t];
        const cands = pool({ subjectKey: sk, grades, mode, stream, sources: bankSources.length ? bankSources : null, types: [t] });
        const got = [];
        ['EASY', 'MEDIUM', 'HARD'].forEach(d => { const n = Math.round(want * (Number(mix[d]) || 0) / 100); got.push(...pickSpread(cands.filter(q => diffOf(q) === d), n, used)); });
        if (got.length < want) got.push(...pickSpread(cands, want - got.length, used));
        for (let tries = 0; useAi && got.length < want && tries < 3; tries++) {
          got.push(...await aiFill({ teacher, subjectKey: sk, grade, mode, chapter: `full syllabus of Class ${grades.join(' and ')} ${NAME_OF[sk]}`, need: want - got.length, difficulty: 'MIXED', kind: t }));
        }
        if (got.length < want) notes.push(`${NAME_OF[sk]}: only ${got.length} of ${want} ${t === 'NUMERICAL' ? 'numerical' : 'multiple-choice'} questions found${useAi ? '' : ' in the bank (tick "AI" as a source to fill the gap)'}.`);
        items.push(...got.slice(0, want).map(q => toItem(q, { subjectKey: sk, section: NAME_OF[sk], marks: 4, negative: 1 })));
      }
    }
    return finish(items, notes, { mode, fullLength: true, stream, minutes: fl.minutes });
  }

  const subjectKey = teacher.subjectKey;
  const grades = [grade];
  const base = { subjectKey, grades, mode, board, stream, chapters, topics, sources: bankSources.length ? bankSources : ['__none__'], types };
  const cands = bankSources.length ? pool(base) : [];

  if (mode === 'COMPETITIVE') {
    const want = body.difficulty || { EASY: 5, MEDIUM: 10, HARD: 5 };
    for (const d of ['EASY', 'MEDIUM', 'HARD']) {
      const n = Math.max(0, Math.min(60, Number(want[d]) || 0));
      const got = pickSpread(cands.filter(q => diffOf(q) === d), n, used);
      if (got.length < n && useAi) got.push(...await aiFill({ teacher, subjectKey, grade, mode, chapter: chapters[0] || 'mixed chapters', need: n - got.length, difficulty: d }));
      if (got.length < n) notes.push(`${d.charAt(0) + d.slice(1).toLowerCase()}: only ${got.length} of ${n} questions found${useAi ? '' : ' (tick "AI" as a source to fill the gap)'}.`);
      items.push(...got.slice(0, n).map(q => toItem(q, { marks: 4, negative: 1 })));
    }
  } else {
    const want = body.marks || { 1: 5, 2: 3, 3: 3, 5: 1 };
    for (const m of Object.keys(want).map(Number).filter(m => m > 0).sort((a, b) => a - b)) {
      const n = Math.max(0, Math.min(60, Number(want[m]) || 0));
      const got = pickSpread(cands.filter(q => marksOf(q) === m), n, used);
      if (got.length < n && useAi) got.push(...await aiFill({ teacher, subjectKey, grade, mode, chapter: chapters[0] || 'mixed chapters', need: n - got.length, marks: m }));
      if (got.length < n) notes.push(`${m}-mark: only ${got.length} of ${n} questions found${useAi ? '' : ' (tick "AI" as a source to fill the gap)'}.`);
      items.push(...got.slice(0, n).map(q => toItem(q, { marks: m })));
    }
  }
  return finish(items, notes, { mode });
}
function finish(items, notes, extra) {
  if (!items.length) throw fail(404, notes[0] || 'No questions match these choices. Choose more chapters or sources.');
  return Object.assign({
    questions: items,
    totalMarks: items.reduce((s, q) => s + (Number(q.marks) || 0), 0),
    dppReady: items.filter(q => q.type === 'MCQ' || q.type === 'NUMERICAL').length,
    notes
  }, extra);
}

// Other questions that could replace one question (same chapter, marks or difficulty).
function alternatives(body = {}) {
  const teacher = teacherOf(body);
  const q = body.question || {};
  const mode = String(body.mode || 'BOARD').toUpperCase() === 'COMPETITIVE' ? 'COMPETITIVE' : 'BOARD';
  const subjectKey = String(q.subjectKey || teacher.subjectKey).toUpperCase();
  const grades = body.fullLength ? ['11', '12'] : [clean(body.grade || '12', 4)];
  const exclude = new Set((body.excludeIds || []).map(String));
  const list = pool({ subjectKey, grades, mode, board: clean(body.board || 'CBSE', 20).toUpperCase(), stream: clean(body.stream || 'JEE', 20).toUpperCase(), chapters: q.chapter_name ? [q.chapter_name] : null, types: q.type ? [q.type] : null })
    .filter(x => !exclude.has(x.id) && (mode === 'COMPETITIVE' ? diffOf(x) === (q.difficulty || diffOf(x)) : marksOf(x) === (Number(q.marks) || marksOf(x))));
  return { alternatives: shuffle(list).slice(0, 6).map(x => toItem(x, mode === 'COMPETITIVE' ? { marks: 4, negative: 1, subjectKey, section: body.fullLength ? NAME_OF[subjectKey] : undefined } : {})) };
}

// Chapters for the builder: the syllabus list for this class (when we have it) plus every chapter
// the bank uses, each with how many questions it has for this board / stream, and its topics.
function chapters(query = {}) {
  const subjectKey = String(query.subjectKey || '').toUpperCase();
  if (!BANK_OF[subjectKey]) throw fail(400, 'Unknown subject.');
  const grade = clean(query.grade || '12', 4);
  const mode = String(query.mode || 'BOARD').toUpperCase() === 'COMPETITIVE' ? 'COMPETITIVE' : 'BOARD';
  const qs = pool({ subjectKey, grades: [grade], mode, board: String(query.board || 'CBSE').toUpperCase(), stream: String(query.stream || 'JEE').toUpperCase() });
  let syllabus = [];
  try {
    const { getSubjectTaxonomy } = require('./curriculumTaxonomy');
    const tax = getSubjectTaxonomy(subjectKey);
    syllabus = ((tax && tax.chapters) || []).filter(c => String(c.grade) === grade).map(c => ({ number: c.chapterNumber || null, name: c.chapterName || c.title }));
  } catch (e) { syllabus = []; }
  const out = syllabus.map(c => ({ number: c.number, name: c.name, count: 0, topics: {} }));
  const topicNames = {};
  qs.forEach(q => {
    const name = q.chapter_name || q.chapter || 'Other';
    let row = out.find(c => (q.chapter_number && c.number && String(c.number) === String(q.chapter_number)) || norm(c.name) === norm(name) || (norm(name) && norm(c.name) && (norm(name).indexOf(norm(c.name)) !== -1 || norm(c.name).indexOf(norm(name)) !== -1)));
    if (!row) { row = { number: q.chapter_number || null, name, count: 0, topics: {} }; out.push(row); }
    row.count += 1;
    const tid = topicIdOf(q, subjectKey) || 'other';
    row.topics[tid] = (row.topics[tid] || 0) + 1;
  });
  out.forEach(row => {
    syllabusTopicsFor(subjectKey, grade, row.name).forEach(t => { topicNames[t.id] = t.name; if (!(t.id in row.topics)) row.topics[t.id] = 0; });
  });
  out.sort((a, b) => (a.number || 99) - (b.number || 99));
  return { chapters: out.map(c => ({ number: c.number, name: c.name, count: c.count, topics: Object.keys(c.topics).filter(t => t !== 'other').map(t => ({ id: t, name: topicNames[t] || t, count: c.topics[t] })).concat(c.topics.other ? [{ id: 'other', name: 'Other questions in this chapter', count: c.topics.other }] : []) })), syllabusLoaded: syllabus.length > 0, total: qs.length };
}

// ---------------------------------------------------------------- publish --
function studentsIn(section) { return (inMemoryStore.users || []).filter(u => u.role === 'STUDENT' && String(u.section || '').toLowerCase() === String(section || '').toLowerCase()); }
function cleanStudentIds(ids, section) {
  if (!Array.isArray(ids) || !ids.length) return null;
  const inClass = new Set(studentsIn(section).map(s => s.id));
  const out = ids.map(String).filter(id => inClass.has(id));
  if (!out.length) throw fail(400, 'None of the chosen students are in this class.');
  return out;
}

function publish(body = {}) {
  const teacher = teacherOf(body);
  const kind = String(body.kind || 'TEST').toUpperCase() === 'DPP' ? 'DPP' : 'TEST';
  const section = clean(body.section, 40);
  const title = clean(body.title, 140);
  if (!section) throw fail(400, 'Choose the class.');
  if (!title) throw fail(400, 'Give the test a title.');
  const qs = Array.isArray(body.questions) ? body.questions : [];
  if (!qs.length) throw fail(400, 'Add at least one question.');
  const studentIds = cleanStudentIds(body.studentIds, section);
  const negative = body.negative === undefined ? null : Math.abs(Number(body.negative) || 0);

  if (kind === 'DPP') {
    const ok = qs.filter(q => (q.type === 'MCQ' || q.question_type === 'MCQ_SINGLE') ? keyOf(q) : (q.type === 'NUMERICAL' && String(q.correct_answer || '').trim()));
    if (!ok.length) throw fail(400, 'A DPP needs multiple-choice questions with a marked answer or numerical questions.');
    const created = dpp.create({
      teacher: { id: teacher.id, name: teacher.name, subjectKey: teacher.subjectKey, subjectName: teacher.subjectName },
      subjectKey: body.fullLength ? teacher.subjectKey : teacher.subjectKey, subjectName: teacher.subjectName, section, title,
      timeLimitMinutes: Number(body.durationMinutes) || 30, schedule: body.schedule || null,
      correctMarks: Number(body.correctMarks) || (body.mode === 'COMPETITIVE' ? 4 : 1), incorrectMarks: body.incorrectMarks !== undefined ? Number(body.incorrectMarks) : (body.mode === 'COMPETITIVE' ? -1 : 0),
      mode: body.mode || null, track: body.track || null, source: 'CUSTOM',
      questions: ok.map(q => (q.type === 'NUMERICAL' ? { question_latex: q.question_latex, question_type: 'NUMERICAL', numerical_answer: q.correct_answer, solution_latex: q.solution_latex, topic: q.topic, chapter_name: q.chapter_name, difficulty: q.difficulty, source_question_id: q.source_question_id || q.id } : q))
    });
    created.assignedStudentIds = studentIds;
    created.status = 'LIVE';
    created.chapterNames = Array.from(new Set(ok.map(q => q.chapter_name).filter(Boolean)));
    dpp._save();
    return { kind, item: summarize('DPP', created), left: qs.length - ok.length };
  }

  const sched = schedule.normalize(body.schedule, { defaultDuration: Number(body.durationMinutes) || 60 });
  const durationMinutes = sched && sched.mode === 'DURATION' ? sched.durationMinutes : (Number(body.durationMinutes) || (sched ? Math.round((Date.parse(sched.closesAt) - Date.parse(sched.opensAt)) / 60000) : 60));
  const chapterNames = Array.from(new Set(qs.map(q => q.chapter_name).filter(Boolean)));
  const a = {
    id: `asgn_${Date.now()}_${crypto.randomBytes(2).toString('hex')}`,
    title, description: clean(body.description, 400), teacherName: teacher.name, teacherId: teacher.id,
    grade: clean(body.grade || (section.match(/^\d+/) || ['12'])[0], 4), section, targetClass: section,
    board: body.mode === 'COMPETITIVE' ? clean(body.stream || 'JEE', 20) : clean(body.board || 'CBSE', 20), mode: body.mode || 'BOARD',
    subject: body.fullLength ? 'Full-length ' + clean(body.stream || 'JEE', 10) : (teacher.subjectName || NAME_OF[teacher.subjectKey] || teacher.subjectKey),
    subjectKey: teacher.subjectKey, teacherSubjectKey: teacher.subjectKey, fullLength: Boolean(body.fullLength),
    chapterName: chapterNames.join(', ').slice(0, 300), chapter: chapterNames[0] || '', topic: (body.topics || []).join(', ').slice(0, 300),
    durationMinutes, duration: `${durationMinutes} Mins`,
    totalMarks: qs.reduce((s, q) => s + (Number(q.marks) || 0), 0), negativeMarks: negative,
    schedule: sched, status: 'PUBLISHED', publishedAt: new Date().toISOString(), assignedStudentIds: studentIds,
    questions: qs.map((q, i) => ({
      id: `q_${Date.now().toString(36)}_${i + 1}`, source_question_id: q.source_question_id || q.id || null, subjectKey: q.subjectKey || null, section: q.section || null,
      topic: q.topic || q.chapter_name || '', subtopic: q.topic || '', grade: q.grade || null,
      question_type: q.question_type || 'MCQ_SINGLE', type: q.type || typeOf(q), difficulty: q.difficulty || 'MEDIUM', benchmark_time_seconds: Number(q.benchmark_time_seconds) || 90,
      question_latex: q.question_latex, options_latex: Array.isArray(q.options_latex) ? q.options_latex : [],
      correct_answer: q.correct_answer || null, correct_answer_latex: q.correct_answer_latex || '', solution_latex: q.solution_latex || '',
      marks: Number(q.marks) || 1, negative: q.negative !== undefined ? Number(q.negative) : negative, chapter_name: q.chapter_name || '', question_format: q.question_format || null
    })),
    createdAt: new Date().toISOString()
  };
  if (!inMemoryStore.assessments) inMemoryStore.assessments = [];
  inMemoryStore.assessments.unshift(a);
  return { kind, item: summarize('TEST', a) };
}

// ------------------------------------------------------------ live controls --
function findItem(kind, id) {
  dpp._store();
  if (kind === 'DPP') { const d = (inMemoryStore.teacherDpps || []).find(x => x.id === id); if (!d) throw fail(404, 'DPP not found.'); return d; }
  const a = (inMemoryStore.assessments || []).find(x => x.id === id);
  if (!a) throw fail(404, 'Test not found.');
  return a;
}
function ownCheck(item, teacher) {
  const sk = String(item.teacherSubjectKey || item.subjectKey || '').toUpperCase();
  if (sk && sk !== teacher.subjectKey) throw fail(403, 'This belongs to another subject.');
}
function stateOf(kind, item) {
  if (kind === 'DPP' ? item.status === 'WITHDRAWN' : item.status === 'DRAFT') return item.takenBackAt ? 'TAKEN_BACK' : 'DRAFT';
  if (!item.schedule) return 'LIVE';
  const s = schedule.stateOf(item.schedule);
  return s === 'OPEN' ? 'LIVE' : s === 'UPCOMING' ? 'SCHEDULED' : 'CLOSED';
}
function attemptsOf(kind, item) {
  const roster = studentsIn(item.section || item.targetClass);
  const assigned = item.assignedStudentIds && item.assignedStudentIds.length ? roster.filter(s => item.assignedStudentIds.includes(s.id)) : roster;
  let done;
  if (kind === 'DPP') {
    const latest = new Map();
    (inMemoryStore.teacherDppAttempts || []).filter(a => a.dppId === item.id).forEach(a => latest.set(a.studentId, a));
    done = latest;
  } else {
    const latest = new Map();
    (inMemoryStore.submissions || []).filter(s => s.assessmentId === item.id).slice().reverse().forEach(s => latest.set(s.studentId, s));
    done = latest;
  }
  const max = kind === 'DPP' ? item.questions.length * item.marking.correct : Number(item.totalMarks) || 0;
  return assigned.map(s => {
    const a = done.get(s.id);
    if (!a) return { studentId: s.id, name: s.full_name, roll: s.roll_number || '', attempted: false };
    return kind === 'DPP'
      ? { studentId: s.id, name: s.full_name, roll: s.roll_number || '', attempted: true, score: a.score, maxScore: max, percent: a.percent, correct: a.correctCount, wrong: a.wrongCount, skipped: a.unattempted, timeSeconds: a.timeTakenSeconds, submittedAt: a.submittedAt }
      : { studentId: s.id, name: s.full_name, roll: s.roll_number || '', attempted: true, score: a.totalScore, maxScore: max, percent: a.percentage, correct: (a.questionBreakdown || []).filter(x => x.isCorrect).length, wrong: (a.questionBreakdown || []).filter(x => x.selectedOption && !x.isCorrect).length, skipped: (a.questionBreakdown || []).filter(x => !x.selectedOption).length, timeSeconds: a.totalTimeSpentSeconds, submittedAt: a.submittedAt };
  });
}
function summarize(kind, item) {
  const att = attemptsOf(kind, item);
  const done = att.filter(x => x.attempted);
  return {
    kind, id: item.id, title: item.title, section: item.section || item.targetClass, subject: item.subject, subjectKey: item.subjectKey,
    chapterName: item.chapterName || (item.chapterNames || []).join(', '), questionCount: (item.questions || []).length,
    totalMarks: kind === 'DPP' ? item.questions.length * item.marking.correct : item.totalMarks,
    durationMinutes: kind === 'DPP' ? item.timeLimitMinutes : item.durationMinutes,
    schedule: item.schedule || null, state: stateOf(kind, item), assignedStudentIds: item.assignedStudentIds || null,
    attempted: done.length, assigned: att.length, avgPercent: done.length ? Math.round(done.reduce((s, x) => s + (Number(x.percent) || 0), 0) / done.length) : null,
    createdAt: item.createdAt, publishedAt: item.publishedAt || item.createdAt, takenBackAt: item.takenBackAt || null, fullLength: Boolean(item.fullLength),
    mode: String(item.mode || '').toUpperCase() || (/JEE|NEET/i.test(String(item.board || '')) ? 'COMPETITIVE' : 'BOARD'),
    negative: kind === 'DPP' ? Math.abs(Number(item.marking && item.marking.incorrect) || 0) : (item.negativeMarks || 0)
  };
}
function list(query = {}) {
  dpp._store();
  const sk = String(query.subjectKey || '').toUpperCase();
  if (!sk) throw fail(400, 'subjectKey is required.');
  const sec = String(query.section || '').toLowerCase();
  const tests = (inMemoryStore.assessments || []).filter(a => String(a.teacherSubjectKey || a.subjectKey || '').toUpperCase() === sk && a.questions && a.questions.length && (!sec || String(a.section || a.targetClass || '').toLowerCase() === sec) && (a.status !== 'DRAFT' || a.takenBackAt));
  const dpps = (inMemoryStore.teacherDpps || []).filter(d => String(d.subjectKey || '').toUpperCase() === sk && (!sec || String(d.section || '').toLowerCase() === sec));
  const items = tests.map(a => summarize('TEST', a)).concat(dpps.map(d => summarize('DPP', d)));
  items.sort((a, b) => String(b.publishedAt || '').localeCompare(String(a.publishedAt || '')));
  return { items };
}
function save(kind) { if (kind === 'DPP') dpp._save(); }
function takeBack(kind, id, body) {
  const t = teacherOf(body); const item = findItem(kind, id); ownCheck(item, t);
  if (kind === 'DPP') item.status = 'WITHDRAWN'; else item.status = 'DRAFT';
  item.takenBackAt = new Date().toISOString();
  save(kind);
  return { item: summarize(kind, item) };
}
function republish(kind, id, body) {
  const t = teacherOf(body); const item = findItem(kind, id); ownCheck(item, t);
  if (body.schedule !== undefined) item.schedule = schedule.normalize(body.schedule, { defaultDuration: Number(kind === 'DPP' ? item.timeLimitMinutes : item.durationMinutes) || 30 });
  if (kind === 'DPP') item.status = 'LIVE'; else item.status = 'PUBLISHED';
  item.takenBackAt = null; item.publishedAt = new Date().toISOString();
  save(kind);
  return { item: summarize(kind, item) };
}
function extend(kind, id, body) {
  const t = teacherOf(body); const item = findItem(kind, id); ownCheck(item, t);
  const s = item.schedule;
  const add = Math.max(0, Math.min(7 * 24 * 60, Number(body.addMinutes) || 0));
  const newClose = body.closesAt ? Date.parse(body.closesAt) : null;
  if (!s) {
    if (!newClose) throw fail(400, 'This test has no end time. Give the new closing time.');
    item.schedule = schedule.normalize({ mode: 'WINDOW', opensAt: new Date().toISOString(), closesAt: new Date(newClose).toISOString() }, {});
  } else {
    const close = newClose || (Date.parse(s.closesAt) + add * 60000);
    if (!Number.isFinite(close) || close <= Date.now()) throw fail(400, 'The new closing time must be in the future.');
    if (close <= Date.parse(s.opensAt)) throw fail(400, 'The closing time must be after the opening time.');
    s.closesAt = new Date(close).toISOString();
    if (body.durationMinutes && s.mode === 'DURATION') s.durationMinutes = Math.max(5, Math.min(600, Number(body.durationMinutes)));
  }
  if (kind === 'DPP' && item.status === 'WITHDRAWN') item.status = 'LIVE';
  if (kind === 'TEST' && item.status === 'DRAFT') item.status = 'PUBLISHED';
  item.takenBackAt = null;
  save(kind);
  return { item: summarize(kind, item) };
}
function setStudents(kind, id, body) {
  const t = teacherOf(body); const item = findItem(kind, id); ownCheck(item, t);
  item.assignedStudentIds = cleanStudentIds(body.studentIds, item.section || item.targetClass);
  save(kind);
  return { item: summarize(kind, item) };
}
function attempts(kind, id, query) {
  const item = findItem(kind, id);
  if (String(query.subjectKey || '').toUpperCase() !== String(item.teacherSubjectKey || item.subjectKey || '').toUpperCase()) throw fail(403, 'This belongs to another subject.');
  const rows = attemptsOf(kind, item);
  return { item: summarize(kind, item), students: rows, roster: studentsIn(item.section || item.targetClass).map(s => ({ id: s.id, name: s.full_name, roll: s.roll_number || '' })) };
}

// Per-question statistics: right / wrong / skipped and which option students chose.
function report(kind, id, query) {
  const base = attempts(kind, id, query);
  const item = findItem(kind, id);
  const sheets = [];
  if (kind === 'DPP') {
    const latest = new Map();
    (inMemoryStore.teacherDppAttempts || []).filter(a => a.dppId === id).forEach(a => latest.set(a.studentId, a));
    latest.forEach(a => sheets.push({ studentId: a.studentId, answer: qid => a.answers[qid] || null }));
  } else {
    const latest = new Map();
    (inMemoryStore.submissions || []).filter(s => s.assessmentId === id).slice().reverse().forEach(s => latest.set(s.studentId, s));
    latest.forEach(s => sheets.push({ studentId: s.studentId, answer: (qid, i) => { const b = (s.questionBreakdown || []).find(x => x.questionId === qid) || (s.questionBreakdown || [])[i] || {}; return b.selectedOption || null; }, correct: (qid, i) => { const b = (s.questionBreakdown || []).find(x => x.questionId === qid) || (s.questionBreakdown || [])[i] || {}; return Boolean(b.isCorrect); }, time: (qid, i) => { const b = (s.questionBreakdown || []).find(x => x.questionId === qid) || (s.questionBreakdown || [])[i] || {}; return Number(b.timeSpentSeconds) || null; } }));
  }
  const questions = (item.questions || []).map((q, i) => {
    const qid = q.id;
    const isDpp = kind === 'DPP';
    const opts = isDpp ? (q.options || []).map(o => ({ key: o.key, latex: o.latex })) : (q.options_latex || []).map(o => ({ key: o.key, latex: o.latex }));
    const key = isDpp ? q.correctAnswer : (keyOf(q) || q.correct_answer);
    const counts = {}; opts.forEach(o => { counts[o.key] = 0; });
    let right = 0, wrong = 0, skipped = 0, timeSum = 0, timeN = 0;
    sheets.forEach(sh => {
      const ans = sh.answer(qid, i);
      if (!ans) { skipped += 1; return; }
      if (counts[ans] !== undefined) counts[ans] += 1;
      const ok = sh.correct ? sh.correct(qid, i) : (q.type === 'NUMERICAL' ? Math.abs(Number(ans) - Number(q.correctAnswer)) <= Math.max(0.01, Math.abs(Number(q.correctAnswer)) * 0.01) : ans === key);
      if (ok) right += 1; else wrong += 1;
      if (sh.time) { const tt = sh.time(qid, i); if (tt) { timeSum += tt; timeN += 1; } }
    });
    const n = sheets.length;
    const wrongOpts = Object.keys(counts).filter(k => k !== key).sort((a, b) => counts[b] - counts[a]);
    return {
      index: i + 1, id: qid, question_latex: isDpp ? q.questionLatex : q.question_latex, options: opts, correctAnswer: key,
      solution_latex: isDpp ? q.solutionLatex : q.solution_latex, topic: q.topic || q.chapterName || q.chapter_name || '', chapter: q.chapter_name || q.chapterName || '',
      marks: isDpp ? item.marking.correct : q.marks, difficulty: q.difficulty || 'MEDIUM',
      attempted: n, right, wrong, skipped,
      rightPct: n ? Math.round((right / n) * 100) : null, wrongPct: n ? Math.round((wrong / n) * 100) : null, skippedPct: n ? Math.round((skipped / n) * 100) : null,
      optionCounts: counts, mostChosenWrong: wrongOpts.length && counts[wrongOpts[0]] ? wrongOpts[0] : null,
      avgTimeSeconds: timeN ? Math.round(timeSum / timeN) : null
    };
  });
  return Object.assign(base, { questions });
}

module.exports = { chapters, build, alternatives, publish, list, takeBack, republish, extend, setStudents, attempts, report, keyOf, typeOf, FULL_LENGTH };
