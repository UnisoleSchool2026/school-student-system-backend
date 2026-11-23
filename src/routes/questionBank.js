// ============================================================================
// QUESTION BANK ROUTES (2026-11-21) -> /api/question-bank
//   PUT    /questions/:id         { teacher, changes }      edit a question you added
//   DELETE /questions/:id         { teacher }               delete a question you added
//   GET    /saved?teacherId=                                your saved question ids
//   POST   /saved                 { teacher, questionId, saved }
//   GET    /reports?subjectKey=                             open mistake reports of a subject
//   POST   /reports               { teacher, questionId, reason, note }
//   POST   /reports/:id/resolve   { teacher }
// Adding questions uses POST /api/questions/inject (typed, pasted, PDF, photos, Excel/CSV rows).
// ============================================================================
const express = require('express');
const handle = require('./_handle');
const bank = require('../services/questionBankService');

const router = express.Router();
router.put('/questions/:id', handle('QUESTION BANK', req => ({ question: bank.update(req.params.id, req.body || {}) })));
router.delete('/questions/:id', handle('QUESTION BANK', req => bank.remove(req.params.id, req.body || {})));
router.get('/saved', handle('QUESTION BANK', req => ({ savedIds: bank.savedIds(req.query.teacherId) })));
router.post('/saved', handle('QUESTION BANK', req => bank.setSaved(req.body || {})));
router.get('/reports', handle('QUESTION BANK', req => ({ reports: bank.reports(req.query.teacherId, req.query.subjectKey) })));
router.post('/reports', handle('QUESTION BANK', req => ({ report: bank.report(req.body || {}) })));
router.post('/reports/:id/resolve', handle('QUESTION BANK', req => ({ report: bank.resolve(req.params.id, req.body || {}) })));
module.exports = router;
