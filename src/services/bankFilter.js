// Board-specific filtering shared by the Question Bank and the Tests & DPPs builder (2026-11-24).
// HP Board follows the NCERT syllabus, so it shares NCERT, exemplar and practice questions with
// CBSE, but CBSE's own previous-year papers are not HP Board papers.
function keepForBoard(q, board) {
  if (!/^HP/.test(String(board || '').toUpperCase())) return true;
  const tag = `${q.pyq_appearance || ''} ${q.target_exam || ''} ${q.curriculum_board || ''}`.toUpperCase();
  if (/HP[\s_-]?BOARD|HPBOSE/.test(tag)) return true;
  const src = String(q.question_source || q.source_category || '').toUpperCase();
  if (/NCERT|EXEMPLAR/.test(src)) return true;
  const app = String(q.pyq_appearance || '').toUpperCase();
  return !(/CBSE[_\s-]*PYQ/.test(src) || /CBSE[^0-9]{0,30}20\d\d/.test(app));
}
module.exports = { keepForBoard };
