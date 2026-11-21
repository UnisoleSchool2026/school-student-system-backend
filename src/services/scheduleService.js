// ============================================================================
// TEST / DPP SCHEDULE (2026-11-21)
// A teacher can say WHEN students may take a test or DPP, and HOW the time runs:
//   - opensAt .. closesAt   students see it only between these moments
//   - mode WINDOW            fixed slot: everyone writes inside the window, it closes at closesAt
//                            (e.g. today 9:00 to 10:00)
//   - mode DURATION          each student gets durationMinutes from the moment they open it,
//                            and can open it any time inside the window (e.g. "1 hour, any time today")
// The clock runs on the server: the start moment is recorded when a student presses Start, so
// refreshing the page or changing the phone's clock does not give extra time.
// Items without a schedule behave as before (always open).
// ============================================================================

const { inMemoryStore } = require('../config/database');

const GRACE_MS = 2 * 60 * 1000; // a slow network may deliver an on-time submission a little late
const MODES = ['WINDOW', 'DURATION'];

function fail(status, message) { const e = new Error(message); e.status = status; return e; }

// Accepts { opensAt, closesAt, mode, durationMinutes } (ISO date-times). Returns null for "no schedule".
function normalize(input, { defaultDuration = 60 } = {}) {
  if (!input || typeof input !== 'object' || (!input.opensAt && !input.closesAt)) return null;
  const opens = new Date(input.opensAt);
  const closes = new Date(input.closesAt);
  if (isNaN(opens.getTime()) || isNaN(closes.getTime())) throw fail(400, 'Choose both the opening and the closing date and time.');
  if (closes.getTime() <= opens.getTime()) throw fail(400, 'The closing time must be after the opening time.');
  if (closes.getTime() - opens.getTime() > 366 * 86400000) throw fail(400, 'A test can be open for at most one year.');
  if (closes.getTime() < Date.now() - 60000) throw fail(400, 'The closing time is already in the past.');
  const mode = MODES.includes(String(input.mode || '').toUpperCase()) ? String(input.mode).toUpperCase() : 'WINDOW';
  const out = { opensAt: opens.toISOString(), closesAt: closes.toISOString(), mode };
  if (mode === 'DURATION') {
    const mins = Math.round(Number(input.durationMinutes) || defaultDuration);
    if (!(mins >= 5 && mins <= 600)) throw fail(400, 'The time for each student must be between 5 and 600 minutes.');
    out.durationMinutes = mins;
  }
  return out;
}

// 'OPEN' | 'UPCOMING' | 'CLOSED'
function stateOf(schedule, now = Date.now()) {
  if (!schedule) return 'OPEN';
  if (now < Date.parse(schedule.opensAt)) return 'UPCOMING';
  if (now > Date.parse(schedule.closesAt)) return 'CLOSED';
  return 'OPEN';
}

function deadlineFor(schedule, startedAtMs) {
  if (!schedule) return null;
  if (schedule.mode === 'DURATION') return startedAtMs + schedule.durationMinutes * 60000;
  return Date.parse(schedule.closesAt);
}

function starts() {
  if (!Array.isArray(inMemoryStore.scheduledStarts)) inMemoryStore.scheduledStarts = [];
  return inMemoryStore.scheduledStarts;
}
function findStart(kind, itemId, studentId) {
  return starts().find(s => s.kind === kind && s.itemId === itemId && s.studentId === studentId) || null;
}

function when(iso) {
  return new Date(iso).toLocaleString('en-IN', { timeZone: process.env.SCHOOL_TIME_ZONE || 'Asia/Kolkata', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true });
}

// What the student sees about the clock. Safe to send to anyone.
function view(schedule, start, now = Date.now()) {
  if (!schedule) return null;
  const out = Object.assign({}, schedule, { state: stateOf(schedule, now), serverNow: new Date(now).toISOString() });
  if (start) {
    out.startedAt = start.startedAt;
    out.deadline = new Date(deadlineFor(schedule, Date.parse(start.startedAt))).toISOString();
    if (start.submittedAt) out.submittedAt = start.submittedAt;
  }
  return out;
}

// Student presses Start. Idempotent: a second call returns the first start (no new time).
function start(kind, itemId, schedule, studentId) {
  if (!schedule) return null;
  if (!studentId) throw fail(400, 'studentId is required.');
  const existing = findStart(kind, itemId, studentId);
  const now = Date.now();
  if (existing) {
    if (existing.submittedAt) throw fail(409, 'You have already submitted this.');
    if (now > deadlineFor(schedule, Date.parse(existing.startedAt)) + GRACE_MS) throw fail(403, 'Your time for this is over.');
    return view(schedule, existing, now);
  }
  const st = stateOf(schedule, now);
  if (st === 'UPCOMING') throw fail(403, `This opens on ${when(schedule.opensAt)}.`);
  if (st === 'CLOSED') throw fail(403, `This closed on ${when(schedule.closesAt)}.`);
  const rec = { kind, itemId, studentId, startedAt: new Date(now).toISOString() };
  starts().push(rec);
  return view(schedule, rec, now);
}

// Before accepting answers. Throws if the student's time is over.
function checkSubmit(kind, itemId, schedule, studentId) {
  if (!schedule) return;
  const s = findStart(kind, itemId, studentId);
  const now = Date.now();
  if (s) {
    if (s.submittedAt) throw fail(409, 'You have already submitted this.');
    if (now > deadlineFor(schedule, Date.parse(s.startedAt)) + GRACE_MS) throw fail(403, 'Time is over: answers can no longer be submitted.');
    return;
  }
  // Submitted without pressing Start (an older app): allowed only while the window is open.
  if (stateOf(schedule, now - GRACE_MS) !== 'OPEN' && stateOf(schedule, now) !== 'OPEN') throw fail(403, 'This is not open for answers now.');
}

function markSubmitted(kind, itemId, studentId) {
  let s = findStart(kind, itemId, studentId);
  if (!s) { s = { kind, itemId, studentId, startedAt: new Date().toISOString() }; starts().push(s); }
  s.submittedAt = new Date().toISOString();
}

function hasStarted(kind, itemId, studentId) {
  const s = findStart(kind, itemId, studentId);
  return Boolean(s && !s.submittedAt);
}
function hasSubmitted(kind, itemId, studentId) {
  const s = findStart(kind, itemId, studentId);
  return Boolean(s && s.submittedAt);
}

function forgetItem(kind, itemId) {
  inMemoryStore.scheduledStarts = starts().filter(s => !(s.kind === kind && s.itemId === itemId));
}

module.exports = { normalize, stateOf, deadlineFor, view, start, checkSubmit, markSubmitted, hasStarted, hasSubmitted, findStart, forgetItem, when, GRACE_MS };
