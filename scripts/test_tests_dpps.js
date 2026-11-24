// TEST: Tests & DPPs (2026-11-24). In-process, no network.
//   node scripts/test_tests_dpps.js
const fs = require('fs'); const os = require('os'); const path = require('path'); const assert = require('assert');
process.env.DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'tdpp-test-'));
process.chdir(path.resolve(__dirname, '..'));
const express = require('express');
const { inMemoryStore, initDatabase } = require('../src/config/database');
let passed = 0, failed = 0;
async function check(name, fn) { try { await fn(); passed++; console.log(`  PASS  ${name}`); } catch (e) { failed++; console.log(`  FAIL  ${name}\n        ${e.message}`); } }
const T = { id: 'fac_phy_01', name: 'Dr. Vikram Sharma', subjectKey: 'PHYSICS', subjectName: 'Physics' };
const CHEM = { id: 'fac_chem_01', name: 'Dr. Anil', subjectKey: 'CHEMISTRY', subjectName: 'Chemistry' };

(async () => {
  try { await initDatabase(); } catch (e) { /* in-memory */ }
  const app = express(); app.use(express.json({ limit: '5mb' }));
  app.use('/api/tests-dpps', require('../src/routes/testsDpps'));
  app.use('/api/assessments', require('../src/routes/assessments'));
  app.use('/api/dpp', require('../src/routes/dpp'));
  app.use('/api/curriculum', require('../src/routes/curriculum'));
  const server = app.listen(0); const base = `http://127.0.0.1:${server.address().port}`;
  const call = (m, u, b) => fetch(base + u, { method: m, headers: { 'Content-Type': 'application/json' }, body: b ? JSON.stringify(b) : undefined }).then(async r => ({ status: r.status, body: await r.json() }));
  const kids = inMemoryStore.users.filter(u => u.role === 'STUDENT' && u.section === '12-NonMed');
  assert.ok(kids.length >= 2, 'need two Class 12 Non-Medical students');
  const [s1, s2] = kids;

  let draft;
  await check('Board test is built marks-wise from several chapters, only from Class 12', async () => {
    const r = await call('POST', '/api/tests-dpps/build', { teacher: T, grade: '12', mode: 'BOARD', board: 'CBSE', chapters: ['Electric Charges and Fields', 'Current Electricity'], marks: { 1: 4, 2: 2, 5: 1 } });
    assert.strictEqual(r.status, 200, JSON.stringify(r.body));
    draft = r.body;
    assert.strictEqual(draft.questions.length, 7);
    assert.strictEqual(draft.totalMarks, 4 + 4 + 5);
    assert.ok(draft.questions.every(q => /Electric Charges|Current Electricity/.test(q.chapter_name)), 'only the chosen chapters');
    assert.strictEqual(new Set(draft.questions.map(q => q.id)).size, 7, 'no repeats');
  });
  await check('Competitive test is built by difficulty with +4/-1', async () => {
    const r = await call('POST', '/api/tests-dpps/build', { teacher: T, grade: '12', mode: 'COMPETITIVE', stream: 'JEE', chapters: ['Electric Charges and Fields'], difficulty: { EASY: 2, MEDIUM: 2, HARD: 1 } });
    assert.strictEqual(r.status, 200, JSON.stringify(r.body));
    assert.ok(r.body.questions.every(q => q.marks === 4 && q.negative === 1));
    assert.ok(r.body.questions.every(q => ['MCQ', 'MULTI', 'NUMERICAL'].includes(q.type)), 'competitive types only');
  });
  await check('Full-length JEE has Physics, Chemistry and Maths sections', async () => {
    const r = await call('POST', '/api/tests-dpps/build', { teacher: T, grade: '12', mode: 'COMPETITIVE', stream: 'JEE', fullLength: true });
    assert.strictEqual(r.status, 200, JSON.stringify(r.body));
    assert.ok(r.body.questions.some(q => q.section === 'Physics'));
    assert.ok(Array.isArray(r.body.notes));
  });

  let test;
  await check('Published as a TEST to two chosen students only', async () => {
    const r = await call('POST', '/api/tests-dpps/publish', { teacher: T, kind: 'TEST', title: 'Electrostatics unit test', section: '12-NonMed', questions: draft.questions, durationMinutes: 40, studentIds: [s1.id] });
    assert.strictEqual(r.status, 200, JSON.stringify(r.body));
    test = r.body.item;
    assert.strictEqual(test.state, 'LIVE');
    assert.strictEqual(test.assigned, 1);
    const see1 = (await call('GET', `/api/assessments?status=PUBLISHED&classId=12-NonMed&studentId=${s1.id}`)).body.assessments.map(a => a.id);
    const see2 = (await call('GET', `/api/assessments?status=PUBLISHED&classId=12-NonMed&studentId=${s2.id}`)).body.assessments.map(a => a.id);
    assert.ok(see1.includes(test.id), 'chosen student sees it');
    assert.ok(!see2.includes(test.id), 'other student does not');
  });
  await check('Whole class, then take back hides it, publish again shows it', async () => {
    let r = await call('POST', `/api/tests-dpps/test/${test.id}/students`, { teacher: T, studentIds: [] });
    assert.strictEqual(r.body.item.assignedStudentIds, null);
    r = await call('POST', `/api/tests-dpps/test/${test.id}/take-back`, { teacher: T });
    assert.strictEqual(r.body.item.state, 'TAKEN_BACK');
    let see = (await call('GET', `/api/assessments?status=PUBLISHED&classId=12-NonMed&studentId=${s2.id}`)).body.assessments.map(a => a.id);
    assert.ok(!see.includes(test.id), 'hidden after take back');
    r = await call('POST', `/api/tests-dpps/test/${test.id}/take-back`, { teacher: CHEM });
    assert.strictEqual(r.status, 403, 'another subject cannot touch it');
    r = await call('POST', `/api/tests-dpps/test/${test.id}/republish`, { teacher: T });
    see = (await call('GET', `/api/assessments?status=PUBLISHED&classId=12-NonMed&studentId=${s2.id}`)).body.assessments.map(a => a.id);
    assert.ok(see.includes(test.id), 'back after publishing again');
  });
  await check('Extend: closing time moves later', async () => {
    const closes = new Date(Date.now() + 3600e3).toISOString();
    let r = await call('POST', `/api/tests-dpps/test/${test.id}/extend`, { teacher: T, closesAt: closes });
    assert.strictEqual(r.status, 200, JSON.stringify(r.body));
    r = await call('POST', `/api/tests-dpps/test/${test.id}/extend`, { teacher: T, addMinutes: 30 });
    assert.strictEqual(Date.parse(r.body.item.schedule.closesAt), Date.parse(closes) + 30 * 60000);
    r = await call('POST', `/api/tests-dpps/test/${test.id}/extend`, { teacher: T, closesAt: new Date(Date.now() - 60000).toISOString() });
    assert.strictEqual(r.status, 400, 'no closing time in the past');
  });
  await check('Attempts show who wrote it and who did not; report counts options', async () => {
    const full = (await call('GET', `/api/assessments/${test.id}`)).body.assessment;
    const q0 = full.questions[0];
    const right = (q0.options_latex.find(o => o.is_correct) || {}).key;
    const wrong = q0.options_latex.map(o => o.key).find(k => k !== right);
    let r = await call('POST', `/api/assessments/${test.id}/submit`, { studentId: s1.id, studentName: s1.full_name, answers: [{ questionId: q0.id, selectedOption: right }] });
    assert.strictEqual(r.status, 200, JSON.stringify(r.body).slice(0, 200));
    r = await call('POST', `/api/assessments/${test.id}/submit`, { studentId: s2.id, studentName: s2.full_name, answers: [{ questionId: q0.id, selectedOption: wrong }] });
    const at = (await call('GET', `/api/tests-dpps/test/${test.id}/attempts?subjectKey=PHYSICS`)).body;
    assert.strictEqual(at.students.filter(x => x.attempted).length, 2);
    assert.ok(at.students.length >= 2);
    const rep = (await call('GET', `/api/tests-dpps/test/${test.id}/report?subjectKey=PHYSICS`)).body;
    const st = rep.questions[0];
    assert.strictEqual(st.right, 1); assert.strictEqual(st.wrong, 1);
    assert.strictEqual(st.optionCounts[right], 1); assert.strictEqual(st.optionCounts[wrong], 1);
    assert.strictEqual(st.mostChosenWrong, wrong);
    assert.strictEqual(rep.questions[1].skipped, 2, 'unanswered counted as skipped');
    assert.strictEqual((await call('GET', `/api/tests-dpps/test/${test.id}/report?subjectKey=CHEMISTRY`)).status, 403);
  });
  await check('A question with no answer key is never marked correct (no "B" default)', async () => {
    const r = await call('POST', '/api/tests-dpps/publish', { teacher: T, kind: 'TEST', title: 'Keyless', section: '12-NonMed', questions: [{ question_latex: 'Explain Gauss law', type: 'SHORT', question_type: 'SHORT', marks: 3 }] });
    const id = r.body.item.id;
    const sub = await call('POST', `/api/assessments/${id}/submit`, { studentId: s1.id, studentName: s1.full_name, answers: [{ questionIndex: 1, selectedOption: 'B' }] });
    assert.strictEqual(sub.body.results.totalScore, 0, JSON.stringify(sub.body.results.questionBreakdown));
  });
  let d;
  await check('Published as a DPP with a numerical question (answer within 1% counts)', async () => {
    const mcq = draft.questions.find(q => q.type === 'MCQ' && q.correct_answer);
    const qs = [mcq, { question_latex: 'Find $g$ in $m/s^2$', type: 'NUMERICAL', correct_answer: '9.8', marks: 4 }, { question_latex: 'Explain', type: 'SHORT', marks: 3 }];
    const r = await call('POST', '/api/tests-dpps/publish', { teacher: T, kind: 'DPP', title: 'Electrostatics DPP', section: '12-NonMed', questions: qs, mode: 'COMPETITIVE' });
    assert.strictEqual(r.status, 200, JSON.stringify(r.body));
    d = r.body.item;
    assert.strictEqual(d.questionCount, 2, 'written question left out of the DPP');
    assert.strictEqual(r.body.left, 1);
    const det = (await call('GET', `/api/dpp/${d.id}?studentId=${s1.id}`)).body.dpp;
    const num = det.questions.find(q => !q.options.length);
    const sub = await call('POST', `/api/dpp/${d.id}/submit`, { studentId: s1.id, answers: { [num.id]: '9.79' } });
    assert.strictEqual(sub.status, 200, JSON.stringify(sub.body));
    assert.strictEqual(sub.body.dpp.attempt.correct, 1, '9.79 within 1% of 9.8');
    assert.strictEqual(sub.body.dpp.attempt.skipped, 1);
  });
  await check('A DPP that is taken back disappears for students', async () => {
    await call('POST', `/api/tests-dpps/dpp/${d.id}/take-back`, { teacher: T });
    const list = (await call('GET', `/api/dpp/assigned?studentId=${s2.id}`)).body.dpps.map(x => x.id);
    assert.ok(!list.includes(d.id));
    const det = await call('GET', `/api/dpp/${d.id}?studentId=${s2.id}`);
    assert.strictEqual(det.status, 403);
  });
  await check('Teacher list shows tests and DPPs with their state', async () => {
    const r = await call('GET', '/api/tests-dpps?subjectKey=PHYSICS&section=12-NonMed');
    const kinds = r.body.items.map(i => i.kind);
    assert.ok(kinds.includes('TEST') && kinds.includes('DPP'));
    assert.ok(r.body.items.find(i => i.id === d.id).state === 'TAKEN_BACK');
    assert.strictEqual((await call('GET', '/api/tests-dpps?subjectKey=CHEMISTRY&section=12-NonMed')).body.items.filter(i => i.id === test.id).length, 0, 'other subjects do not see it');
  });
  await check('Manage students: move to another class and remove from a class', async () => {
    let r = await call('PUT', `/api/curriculum/students/${s2.id}`, { section: '12-Med', fromSection: '12-NonMed' });
    assert.strictEqual(r.status, 200, JSON.stringify(r.body));
    assert.strictEqual(inMemoryStore.users.find(u => u.id === s2.id).section, '12-Med');
    r = await call('PUT', `/api/curriculum/students/${s2.id}`, { section: 'nowhere' });
    assert.strictEqual(r.status, 400);
    r = await call('DELETE', `/api/curriculum/students/${s2.id}?section=12-NonMed`);
    assert.strictEqual(r.status, 409, 'not in that class any more');
    r = await call('DELETE', `/api/curriculum/students/${s2.id}?section=12-Med`);
    assert.strictEqual(r.status, 200);
    assert.strictEqual(inMemoryStore.users.find(u => u.id === s2.id).section, '');
  });
  server.close();
  console.log(`\nTests & DPPs: ${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
})();
