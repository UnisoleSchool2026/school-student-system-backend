// Tests & DPPs (2026-11-24): build, publish as Test or DPP, live controls, attempts, report.
const express = require('express');
const handle = require('./_handle');
const svc = require('../services/testsDppsService');
const router = express.Router();
const kindOf = k => (String(k).toUpperCase() === 'DPP' ? 'DPP' : 'TEST');

router.get('/chapters', handle('TESTS & DPPS', req => svc.chapters(req.query || {})));
router.post('/build', handle('TESTS & DPPS', req => svc.build(req.body || {})));
router.post('/alternatives', handle('TESTS & DPPS', req => svc.alternatives(req.body || {})));
router.post('/publish', handle('TESTS & DPPS', req => svc.publish(req.body || {})));
router.get('/', handle('TESTS & DPPS', req => svc.list(req.query || {})));
router.post('/:kind/:id/take-back', handle('TESTS & DPPS', req => svc.takeBack(kindOf(req.params.kind), req.params.id, req.body || {})));
router.post('/:kind/:id/republish', handle('TESTS & DPPS', req => svc.republish(kindOf(req.params.kind), req.params.id, req.body || {})));
router.post('/:kind/:id/extend', handle('TESTS & DPPS', req => svc.extend(kindOf(req.params.kind), req.params.id, req.body || {})));
router.post('/:kind/:id/students', handle('TESTS & DPPS', req => svc.setStudents(kindOf(req.params.kind), req.params.id, req.body || {})));
router.get('/:kind/:id/attempts', handle('TESTS & DPPS', req => svc.attempts(kindOf(req.params.kind), req.params.id, req.query || {})));
router.get('/:kind/:id/report', handle('TESTS & DPPS', req => svc.report(kindOf(req.params.kind), req.params.id, req.query || {})));
module.exports = router;
