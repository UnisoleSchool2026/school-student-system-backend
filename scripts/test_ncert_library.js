// TEST: NCERT library (book shelf + AI help) - 2026-11-19. No network: AI key unset -> offline answers.
//   node scripts/test_ncert_library.js
const fs = require('fs');
const os = require('os');
const path = require('path');
const assert = require('assert');
process.env.DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'ncr-test-'));
delete process.env.GEMINI_API_KEY;
const lib = require('../src/services/ncertLibraryService');

let passed = 0, failed = 0;
async function check(name, fn) { try { await fn(); passed++; console.log(`  PASS  ${name}`); } catch (e) { failed++; console.log(`  FAIL  ${name}\n        ${e.message}`); } }
function tmpFile(content) { const f = path.join(os.tmpdir(), 'ncr-up-' + Math.random().toString(36).slice(2)); fs.writeFileSync(f, content); return f; }
const TEXT = 'Electric charge is a basic property of matter that causes force. Like charges repel and unlike charges attract each other strongly. The SI unit of electric charge is the coulomb in physics. Electric charge is conserved in every isolated system always. Electric charge is quantised in units of the electronic charge.';
const T = { role: 'teacher', id: 'teacher:PHYSICS', name: 'Physics teacher' };

(async () => {
  let id;
  await check('A teacher adds a PDF; it is listed with class and subject', () => {
    const b = lib.add(tmpFile('%PDF-1.4 test'), { classNo: '12', subject: 'Physics', title: 'Physics Part I', pages: '320' }, T);
    id = b.id;
    assert.ok(/^bk_[a-f0-9]{16}$/.test(id));
    assert.strictEqual(lib.list({ classNo: 12 })[0].pages, 320);
    assert.strictEqual(lib.list({ classNo: 11 }).length, 0);
    assert.ok(fs.existsSync(lib.pdfPath(id)));
  });
  await check('Files that are not PDFs and missing class/subject are refused', () => {
    assert.throws(() => lib.add(tmpFile('hello'), { classNo: 12, subject: 'Physics' }, T), /not a PDF/);
    assert.throws(() => lib.add(tmpFile('%PDF-1.4'), { classNo: 13, subject: 'Physics' }, T), /class/);
    assert.throws(() => lib.add(tmpFile('%PDF-1.4'), { classNo: 12, subject: '' }, T), /subject/);
  });
  await check('Bad book ids never reach the disk', () => {
    assert.throws(() => lib.pdfPath('../../etc/passwd'), e => e.status === 404);
    assert.throws(() => lib.pdfPath('bk_0000000000000000'), e => e.status === 404);
  });
  await check('Only the uploader or the principal can remove a book', () => {
    assert.throws(() => lib.remove(id, { role: 'teacher', id: 'teacher:CHEMISTRY' }), e => e.status === 403);
    assert.deepStrictEqual(lib.remove(id, { role: 'principal', id: 'principal' }), { removed: id });
    assert.strictEqual(lib.list().length, 0);
  });
  await check('Without AI: summary, explanation and quiz are made from the text', async () => {
    const s = await lib.ai({ action: 'summary', text: TEXT });
    assert.ok(s.points.length >= 3 && s.offline);
    const e = await lib.ai({ action: 'explain', text: TEXT });
    assert.ok(e.simple.length >= 2);
    const q = await lib.ai({ action: 'quiz', text: TEXT });
    assert.ok(q.questions.length >= 2);
    q.questions.forEach(x => { assert.strictEqual(x.options.length, 4); assert.ok(x.answer >= 0 && x.answer < 4); });
  });
  await check('Too little text and unknown actions are refused', async () => {
    await assert.rejects(() => lib.ai({ action: 'summary', text: 'short' }), /more text/);
    await assert.rejects(() => lib.ai({ action: 'delete', text: TEXT }), /Unknown action/);
  });
  await check('Diagram help needs the boxed image; quizzes cover at most 5 pages; quiz size is honoured', async () => {
    await assert.rejects(() => lib.ai({ action: 'figure', text: TEXT }), /box around the figure/);
    await assert.rejects(() => lib.ai({ action: 'quiz', text: TEXT, pages: [1, 2, 3, 4, 5, 6] }), /at most 5 pages/);
    const q = await lib.ai({ action: 'quiz', text: TEXT + ' ' + TEXT.replace(/charge/g, 'current'), pages: [1, 2], count: 10 });
    assert.ok(q.questions.length >= 2 && q.questions.length <= 10);
    const f = await lib.ai({ action: 'figure', text: TEXT, image: 'data:image/jpeg;base64,AAAA' });
    assert.ok(f.offline && /not set up/.test(f.reason), 'no-AI reason shown');
  });
  console.log(`\nNCERT library tests: ${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
})();
