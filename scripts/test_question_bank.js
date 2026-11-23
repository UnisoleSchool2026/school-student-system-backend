// TEST: Question Bank tools (2026-11-21). In-process, no network.
//   node scripts/test_question_bank.js
// Covers: add a typed question, edit/delete only your own, saved list, mistake reports, draft test from picks.
const fs = require('fs');
const os = require('os');
const path = require('path');
const assert = require('assert');
process.env.DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'qbank-test-'));
process.chdir(path.resolve(__dirname, '..'));

const express = require('express');
const { inMemoryStore, initDatabase } = require('../src/config/database');

let passed = 0, failed = 0;
async function check(name, fn) { try { await fn(); passed++; console.log(`  PASS  ${name}`); } catch (e) { failed++; console.log(`  FAIL  ${name}\n        ${e.message}`); } }

const PHY_A = { id: 'fac_phy_01', name: 'Dr. Vikram Sharma', subject: 'Physics', subjectName: 'Physics', subjectKey: 'PHYSICS', department: 'PHYSICS', role: 'TEACHER' };
const PHY_B = { id: 'fac_phy_02', name: 'Ms. Neha Verma', subject: 'Physics', subjectName: 'Physics', subjectKey: 'PHYSICS', department: 'PHYSICS', role: 'TEACHER' };
const CHEM = { id: 'fac_chem_01', name: 'Dr. Anil Gupta', subject: 'Chemistry', subjectName: 'Chemistry', subjectKey: 'CHEMISTRY', department: 'CHEMISTRY', role: 'TEACHER' };

(async () => {
  try { await initDatabase(); } catch (e) { /* in-memory */ }
  const app = express();
  app.use(express.json({ limit: '5mb' }));
  app.use('/api/questions', require('../src/routes/questions'));
  app.use('/api/question-bank', require('../src/routes/questionBank'));
  app.use('/api/assessments', require('../src/routes/assessments'));
  const server = app.listen(0);
  const base = `http://127.0.0.1:${server.address().port}`;
  const call = (method, url, body) => fetch(base + url, { method, headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined })
    .then(async r => ({ status: r.status, body: await r.json() }));

  let qid = null;
  await check('A teacher adds a typed multiple-choice question (marks, chapter, correct option kept)', async () => {
    const r = await call('POST', '/api/questions/inject', {
      teacher: PHY_A, targetSubject: 'Physics', targetSubjectKey: 'PHYSICS', subject: 'Physics', mode: 'BOARD', track: 'CBSE', grade: '12',
      category: 'PRACTICE', sourceType: 'text', action: 'APPROVE',
      questions: [{ question_latex: 'The SI unit of electric charge is', options_latex: [{ key: 'A', latex: 'ampere', is_correct: false }, { key: 'B', latex: 'coulomb', is_correct: true }, { key: 'C', latex: 'volt', is_correct: false }], correct_answer: 'B', question_format: 'MCQ_SINGLE', chapter_name: 'Electric Charges and Fields', chapter: 'Electric Charges and Fields', topic: 'Electric charge', difficulty: 'EASY', marks: 1, solution_latex: 'Charge is measured in coulomb.' }]
    });
    assert.strictEqual(r.status, 201, JSON.stringify(r.body));
    const q = r.body.question;
    qid = q.id;
    assert.strictEqual(q.injected_by.faculty_id, PHY_A.id);
    assert.ok(/Electric Charges/.test(q.chapter_name), 'chapter kept');
    const bank = (await call('GET', '/api/questions/injected-questions')).body;
    const list = bank.questions || bank.injectedQuestions || [];
    assert.ok(list.some(x => x.id === qid), 'question listed as teacher-added');
  });

  await check('Only the teacher who added it can edit it; bad edits are refused', async () => {
    let r = await call('PUT', `/api/question-bank/questions/${qid}`, { teacher: PHY_B, changes: { topic: 'X' } });
    assert.strictEqual(r.status, 403, 'colleague cannot edit');
    r = await call('PUT', `/api/question-bank/questions/${qid}`, { teacher: CHEM, changes: { topic: 'X' } });
    assert.ok(r.status === 403 || r.status === 404, 'other subject cannot edit');
    r = await call('PUT', `/api/question-bank/questions/${qid}`, { teacher: PHY_A, changes: { options: [{ latex: 'a', is_correct: true }, { latex: 'b', is_correct: true }] } });
    assert.strictEqual(r.status, 400, 'two correct options refused');
    r = await call('PUT', `/api/question-bank/questions/${qid}`, { teacher: PHY_A, changes: { question_latex: 'The SI unit of charge is', options: [{ latex: 'ampere', is_correct: false }, { latex: 'coulomb', is_correct: true }], marks: 2, difficulty: 'MEDIUM', topic: 'Charge' } });
    assert.strictEqual(r.status, 200, JSON.stringify(r.body));
    assert.strictEqual(r.body.question.question_latex, 'The SI unit of charge is');
    assert.strictEqual(Number(r.body.question.marks), 2);
    assert.strictEqual(r.body.question.options_latex.length, 2);
    assert.strictEqual(r.body.question.options_latex.find(o => o.is_correct).latex, 'coulomb');
    const saved = JSON.parse(fs.readFileSync(path.join(process.env.DATA_DIR, 'custom_injected_questions.json'), 'utf8'));
    assert.strictEqual(saved.find(x => x.id === qid).topic, 'Charge', 'edit saved to disk');
  });

  await check('Saved list is private to each teacher', async () => {
    let r = await call('POST', '/api/question-bank/saved', { teacher: PHY_B, questionId: qid, saved: true });
    assert.strictEqual(r.status, 200, JSON.stringify(r.body));
    assert.deepStrictEqual(r.body.savedIds, [qid]);
    assert.deepStrictEqual((await call('GET', `/api/question-bank/saved?teacherId=${PHY_A.id}`)).body.savedIds, []);
    assert.deepStrictEqual((await call('GET', `/api/question-bank/saved?teacherId=${PHY_B.id}`)).body.savedIds, [qid]);
    r = await call('POST', '/api/question-bank/saved', { teacher: PHY_B, questionId: qid, saved: false });
    assert.deepStrictEqual(r.body.savedIds, []);
  });

  let repId = null;
  await check('A colleague reports a mistake; same-subject teachers see it and can mark it fixed', async () => {
    let r = await call('POST', '/api/question-bank/reports', { teacher: PHY_B, questionId: qid, reason: 'OTHER', note: '' });
    assert.strictEqual(r.status, 400, '"something else" needs a note');
    r = await call('POST', '/api/question-bank/reports', { teacher: PHY_B, questionId: qid, reason: 'WRONG_ANSWER', note: 'Key looks wrong' });
    assert.ok(r.status === 200 || r.status === 201, JSON.stringify(r.body));
    repId = r.body.report.id;
    assert.strictEqual(r.body.report.ownerId, PHY_A.id);
    r = await call('POST', '/api/question-bank/reports', { teacher: PHY_B, questionId: qid, reason: 'TYPO' });
    assert.strictEqual(r.status, 409, 'one open report per teacher per question');
    assert.strictEqual((await call('GET', '/api/question-bank/reports?subjectKey=PHYSICS')).body.reports.length, 1);
    assert.strictEqual((await call('GET', '/api/question-bank/reports?subjectKey=CHEMISTRY')).body.reports.length, 0, 'other subject does not see it');
    r = await call('POST', `/api/question-bank/reports/${repId}/resolve`, { teacher: CHEM });
    assert.ok(r.status === 403 || r.status === 404, 'other subject cannot resolve');
    r = await call('POST', `/api/question-bank/reports/${repId}/resolve`, { teacher: PHY_A });
    assert.strictEqual(r.status, 200, JSON.stringify(r.body));
    assert.strictEqual((await call('GET', '/api/question-bank/reports?subjectKey=PHYSICS')).body.reports.length, 0);
  });

  await check('Picked questions become a draft test (not shown to students until published)', async () => {
    const r = await call('POST', '/api/assessments', {
      status: 'DRAFT', title: 'QB pick test', section: '12-NonMed', grade: '12', board: 'CBSE', subject: 'Physics', teacherName: PHY_A.name, teacherSubjectKey: 'PHYSICS', durationMinutes: 20, totalMarks: 2,
      questions: [{ id: qid, question_latex: 'The SI unit of charge is', options_latex: [{ key: 'A', latex: 'ampere' }, { key: 'B', latex: 'coulomb' }], correct_answer: 'B', question_type: 'MCQ_SINGLE', marks: 2, topic: 'Charge' }]
    });
    assert.ok(r.status === 200 || r.status === 201, JSON.stringify(r.body));
    assert.strictEqual(r.body.assessment.status, 'DRAFT');
    assert.strictEqual(r.body.assessment.questions[0].source_question_id, qid);
    const pub = (await call('GET', '/api/assessments?status=PUBLISHED&classId=12-NonMed')).body.assessments || [];
    assert.ok(!pub.some(a => a.id === r.body.assessment.id), 'draft hidden from students');
  });

  await check('Only the owner can delete; delete removes it everywhere (bank, saved, disk)', async () => {
    await call('POST', '/api/question-bank/saved', { teacher: PHY_B, questionId: qid, saved: true });
    let r = await call('DELETE', `/api/question-bank/questions/${qid}`, { teacher: PHY_B });
    assert.strictEqual(r.status, 403);
    r = await call('DELETE', `/api/question-bank/questions/${qid}`, { teacher: PHY_A });
    assert.strictEqual(r.status, 200, JSON.stringify(r.body));
    const inBanks = Object.values(inMemoryStore.subjectBanks || {}).some(list => Array.isArray(list) && list.some(x => x.id === qid));
    assert.ok(!inBanks, 'gone from subject banks');
    assert.deepStrictEqual((await call('GET', `/api/question-bank/saved?teacherId=${PHY_B.id}`)).body.savedIds, []);
    const saved = JSON.parse(fs.readFileSync(path.join(process.env.DATA_DIR, 'custom_injected_questions.json'), 'utf8'));
    assert.ok(!saved.some(x => x.id === qid), 'gone from disk');
    r = await call('DELETE', `/api/question-bank/questions/${qid}`, { teacher: PHY_A });
    assert.strictEqual(r.status, 404);
  });

  await check('Built-in (not teacher-added) questions cannot be edited or deleted', async () => {
    const builtIn = Object.values(inMemoryStore.subjectBanks || {}).flat().find(q => q && q.id && !q.injected_by);
    assert.ok(builtIn, 'a built-in question exists');
    const r = await call('DELETE', `/api/question-bank/questions/${builtIn.id}`, { teacher: PHY_A });
    assert.ok(r.status === 403 || r.status === 404, 'status ' + r.status);
  });

  server.close();
  console.log(`\nQuestion bank: ${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
})();
