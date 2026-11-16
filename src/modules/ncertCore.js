// ============================================================================
// MODULE: NCERT Core & Reading Engine
// Reference: https://github.com/moktagithub005/Ncert_reading_engine
// Powers the NCERT menu with the authentic NCERT Reading Engine:
// - Book ingestion & processing status
// - Active book chapter & topic hierarchy tree
// - Full text viewer & extraction details
// ============================================================================

const content = require('../services/canonicalContentService');
const ncertEngine = require('../services/ncertReadingEngineService');
const { resolveSubject, getTaxonomyChapters, chapterKey, recordsForChapter, emptyPayload } = require('./shared');

const MODULE = {
  id: 'ncert_core',
  title: 'NCERT Reading Engine',
  description: 'Authentic NCERT Textbook Digitization & Reading Engine (Classes 1–12).',
  featureFlag: 'ncertExemplar',
  modes: ['BOARD', 'COMPETITIVE'],
  roles: ['teacher', 'student']
};

function build(ctx) {
  const { subjects, subjectKey } = resolveSubject(ctx);
  const grade = ctx.mode === 'BOARD' ? ctx.grade : null;
  const isComp = ctx.mode === 'COMPETITIVE';

  // Get books from the NCERT reading engine
  const allBooks = ncertEngine.listBooks();
  
  // Find the best matching book for current grade & subject
  let matchedBook = null;
  if (grade) {
    matchedBook = allBooks.find(b => String(b.class_no) === String(grade) && (
      (subjectKey && b.subject.toLowerCase().includes(subjectKey.toLowerCase())) ||
      (b.subject.toLowerCase() === 'science' || b.subject.toLowerCase() === 'physics')
    ));
  }
  if (!matchedBook && allBooks.length > 0) {
    matchedBook = allBooks[0];
  }

  const activeBookId = ctx.bookId || (matchedBook ? matchedBook.id : null);
  let activeBookTree = null;
  let firstTopic = null;

  if (activeBookId) {
    try {
      activeBookTree = ncertEngine.getBookTree(activeBookId, true);
      if (activeBookTree && activeBookTree.chapters && activeBookTree.chapters.length > 0) {
        const ch = activeBookTree.chapters[0];
        if (ch && ch.topics && ch.topics.length > 0) {
          firstTopic = ncertEngine.getTopic(ch.topics[0].id);
        }
      }
    } catch (e) {
      console.warn('[NCERT MODULE] Could not load book tree:', e.message);
    }
  }

  return {
    moduleId: MODULE.id,
    title: 'NCERT Reading Engine',
    subtitle: 'Textbook Digitization, Ingestion Pipeline & Structured Reading Console',
    mode: ctx.mode,
    track: ctx.track,
    empty: false,
    availableSubjects: subjects,
    subjectKey,
    data: {
      isReadingEngine: true,
      books: allBooks,
      activeBookId,
      activeBookTree,
      firstTopic,
      authHint: {
        email: 'ncert-admin@example.com',
        role: 'admin'
      }
    }
  };
}

module.exports = Object.assign(MODULE, { build });
