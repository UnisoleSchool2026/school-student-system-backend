// TEST: test / DPP scheduling (2026-11-21). In-process, no network.
//   node scripts/test_schedule.js
const fs = require('fs');
const os = require('os');
const path = require('path');
const assert = require('assert');
process.env.DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'sched-test-'));
process.chdir(path.resolve(__dirname, '..'));

const express = require('express');
const { inMemoryStore, initDatabase } = require('../src/config/database');
const schedule = require('../src/services/scheduleService');

let passed = 0, failed = 0;
async function check(name, fn) { try { await fn(); passed++; console.log(`  PASS  ${name}`); } catch (e) { failed++; console.log(`  FAIL  ${name}\n        ${e.message}`); } }
const H = 3600000;
const iso = ms => new Date(Date.now() + ms).toISOString();
const STU = 'b0000000-0000-0000-0000-000000000001'; // Aryan, 12-NonMed

(async () => {
  try { await initDatabase(); } catch (e) { /* in-memory */ }
  const app = express();
  app.use(express.json());
  app.use('/api/assessments', require('../src/routes/assessments'));
  app.use('/api/dpp', require('../src/routes/dpp'));
  const server = app.listen(0);
  const base = `http://127.0.0.1:${server.address().port}`;
  const call = (method, url, body) => fetch(base + url, { method, headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined })
    .then(async r => ({ status: r.status, body: await r.json() }));
  const draft = (id) => {
    inMemoryStore.assessments = inMemoryStore.assessments || [];
    inMemoryStore.assessments.unshift({ id, title: 'Sched ' + id, section: '12-NonMed', targetClass: '12-NonMed', subject: 'Physics', status: 'DRAFT', durationMinutes: 45,
      questions: [{ id: id + '_q1', question_latex: '2+2?', options_latex: [{ key: 'A', latex: '3' }, { key: 'B', latex: '4' }], correct_answer: 'B', topic: 'T' }] });
  };
  const visible = async id => (await call('GET', `/api/assessments?status=PUBLISHED&classId=12-NonMed&studentId=${STU}`)).body.assessments.some(a => a.id === id);

  await check('Bad schedules are refused (closing before opening, in the past, silly durations)', () => {
    assert.throws(() => schedule.normalize({ opensAt: iso(2 * H), closesAt: iso(H) }), /after the opening/);
    assert.throws(() => schedule.normalize({ opensAt: iso(-3 * H), closesAt: iso(-2 * H) }), /past/);
    assert.throws(() => schedule.normalize({ opensAt: iso(0), closesAt: iso(H), mode: 'DURATION', durationMinutes: 2 }), /between 5 and 600/);
    assert.strictEqual(schedule.normalize(null), null);
  });

  await check('Fixed slot in the future: hidden from students, questions locked, Start refused', async () => {
    draft('asgn_future');
    const r = await call('POST', '/api/assessments/asgn_future/publish', { schedule: { opensAt: iso(H), closesAt: iso(2 * H), mode: 'WINDOW' } });
    assert.strictEqual(r.status, 200, JSON.stringify(r.body));
    assert.ok(/scheduled/.test(r.body.message));
    assert.strictEqual(await visible('asgn_future'), false);
    assert.strictEqual((await call('GET', `/api/assessments/asgn_future?studentId=${STU}`)).status, 403);
    const st = await call('POST', '/api/assessments/asgn_future/start', { studentId: STU });
    assert.strictEqual(st.status, 403);
    assert.ok(/opens on/.test(st.body.error));
    assert.strictEqual((await call('GET', '/api/assessments/asgn_future')).status, 200, 'teacher view still works');
  });

  await check('Open fixed slot: visible, Start gives the closing time as deadline, Start again keeps the same start', async () => {
    draft('asgn_now');
    const closes = iso(H);
    await call('POST', '/api/assessments/asgn_now/publish', { schedule: { opensAt: iso(-60000), closesAt: closes, mode: 'WINDOW' } });
    assert.strictEqual(await visible('asgn_now'), true);
    const a = await call('POST', '/api/assessments/asgn_now/start', { studentId: STU });
    assert.strictEqual(a.status, 200);
    assert.strictEqual(a.body.assessment.questions.length, 1);
    assert.strictEqual(Date.parse(a.body.assessment.schedule.deadline), Date.parse(closes));
    const b = await call('POST', '/api/assessments/asgn_now/start', { studentId: STU });
    assert.strictEqual(b.body.assessment.schedule.startedAt, a.body.assessment.schedule.startedAt);
    assert.strictEqual((await call('GET', `/api/assessments/asgn_now?studentId=${STU}`)).status, 200);
  });

  await check('Duration mode: each student gets their own minutes from Start; late answers are refused', async () => {
    draft('asgn_dur');
    await call('POST', '/api/assessments/asgn_dur/publish', { schedule: { opensAt: iso(-60000), closesAt: iso(8 * H), mode: 'DURATION', durationMinutes: 60 } });
    const a = await call('POST', '/api/assessments/asgn_dur/start', { studentId: STU });
    const dl = Date.parse(a.body.assessment.schedule.deadline) - Date.parse(a.body.assessment.schedule.startedAt);
    assert.strictEqual(dl, 60 * 60000);
    assert.strictEqual(a.body.assessment.durationMinutes, 60);
    // pretend the student started 2 hours ago
    schedule.findStart('TEST', 'asgn_dur', STU).startedAt = iso(-2 * H);
    const late = await call('POST', '/api/assessments/asgn_dur/submit', { studentId: STU, answers: [] });
    assert.strictEqual(late.status, 403);
    assert.ok(/Time is over/.test(late.body.error));
    assert.strictEqual(await visible('asgn_dur'), false, 'expired attempt disappears');
  });

  await check('On-time submit works once; the test then leaves the student list', async () => {
    const ok = await call('POST', '/api/assessments/asgn_now/submit', { studentId: STU, studentName: 'Aryan', answers: [{ questionId: 'asgn_now_q1', selectedOption: 'B' }] });
    assert.ok(ok.status < 300, JSON.stringify(ok.body).slice(0, 200));
    assert.strictEqual(await visible('asgn_now'), false);
    assert.strictEqual((await call('POST', '/api/assessments/asgn_now/submit', { studentId: STU, answers: [] })).status, 409);
  });

  await check('Tests without a schedule behave as before', async () => {
    draft('asgn_plain');
    await call('POST', '/api/assessments/asgn_plain/publish', {});
    assert.strictEqual(await visible('asgn_plain'), true);
    assert.strictEqual((await call('GET', `/api/assessments/asgn_plain?studentId=${STU}`)).status, 200);
  });

  await check('DPP: scheduled DPP hidden before it opens; Start reveals questions with a server deadline', async () => {
    const dppSvc = require('../src/services/teacherDppService');
    const mk = sched => dppSvc.create({ teacher: { subjectKey: 'PHYSICS', name: 'T' }, section: '12-NonMed', source: 'CUSTOM', title: 'S', schedule: sched,
      questions: [{ question_latex: '1+1?', options_latex: [{ key: 'A', latex: '2', is_correct: true }, { key: 'B', latex: '3' }] }] });
    const later = mk({ opensAt: iso(H), closesAt: iso(2 * H), mode: 'WINDOW' });
    const nowD = mk({ opensAt: iso(-60000), closesAt: iso(H), mode: 'DURATION', durationMinutes: 15 });
    const list = (await call('GET', `/api/dpp/assigned?studentId=${STU}`)).body.dpps.map(d => d.id);
    assert.ok(!list.includes(later.id) && list.includes(nowD.id));
    const before = (await call('GET', `/api/dpp/${nowD.id}?studentId=${STU}`)).body.dpp;
    assert.ok(before.needsStart && before.questions.length === 0);
    const started = (await call('POST', `/api/dpp/${nowD.id}/start`, { studentId: STU })).body.dpp;
    assert.strictEqual(started.questions.length, 1);
    assert.strictEqual(Date.parse(started.schedule.deadline) - Date.parse(started.schedule.startedAt), 15 * 60000);
    assert.strictEqual(started.timeLimitMinutes, 15);
    const sub = await call('POST', `/api/dpp/${nowD.id}/submit`, { studentId: STU, answers: { [started.questions[0].id]: 'A' } });
    assert.strictEqual(sub.status, 200);
    assert.strictEqual((await call('POST', `/api/dpp/${later.id}/start`, { studentId: STU })).status, 403);
  });

  server.close();
  console.log(`\nSchedule tests: ${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
})();
