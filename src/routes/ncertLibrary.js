// ============================================================================
// NCERT LIBRARY ROUTES (2026-11-19)  -> mounted at /api/ncert-library
//   GET    /books?classNo=&subject=      Books on the shelf
//   GET    /books/:id/file               The PDF (supports Range: the reader loads only the pages it shows)
//   GET    /books/:id/cover              Cover image made by the uploader's browser
//   POST   /books                        multipart: file + classNo, subject, title, pages, cover, language,
//                                        teacherSubjectKey | role=principal, uploaderName
//   DELETE /books/:id                    { teacherSubjectKey | role=principal }
//   POST   /ai                           { action: summary|quiz|explain, text, language, bookId, page }
// ============================================================================
const express = require('express');
const multer = require('multer');
const handle = require('./_handle');
const lib = require('../services/ncertLibraryService');

const router = express.Router();
// Uploads land next to the library (same drive), so moving them into place is instant.
const upload = multer({
  storage: multer.diskStorage({ destination: (req, file, cb) => { try { cb(null, lib.uploadDir()); } catch (e) { cb(e); } } }),
  limits: { fileSize: 250 * 1024 * 1024, files: 1 }
});

function who(src) {
  if (src.role === 'principal') return { role: 'principal', id: 'principal', name: src.uploaderName || 'Principal' };
  const key = String(src.teacherSubjectKey || '').toUpperCase().trim();
  if (!key) { const e = new Error('Only teachers and the principal can add or remove books.'); e.status = 403; throw e; }
  return { role: 'teacher', id: 'teacher:' + key, name: src.uploaderName || key };
}

router.get('/books', handle('NCERT LIBRARY', req => ({ books: lib.list(req.query) })));

router.get('/books/:id/file', (req, res) => {
  let file;
  try { file = lib.pdfPath(req.params.id); } catch (err) { return res.status(err.status || 500).json({ success: false, error: err.message }); }
  res.set({
    'Cache-Control': 'private, max-age=86400',
    'Cross-Origin-Resource-Policy': 'cross-origin',
    'Access-Control-Expose-Headers': 'Accept-Ranges, Content-Range, Content-Length'
  });
  res.sendFile(file, { acceptRanges: true, headers: { 'Content-Type': 'application/pdf' } }, err => {
    if (err && !res.headersSent) res.status(err.status || 404).json({ success: false, error: 'Book file not found.' });
  });
});

router.get('/books/:id/cover', (req, res) => {
  try {
    const c = lib.cover(req.params.id);
    res.set({ 'Content-Type': c.type, 'Cache-Control': 'private, max-age=86400', 'Cross-Origin-Resource-Policy': 'cross-origin' });
    res.send(c.data);
  } catch (err) { res.status(err.status || 500).end(); }
});

router.post('/books', (req, res, next) => upload.single('file')(req, res, err => {
  if (err) return res.status(err.code === 'LIMIT_FILE_SIZE' ? 413 : 400).json({ success: false, error: err.code === 'LIMIT_FILE_SIZE' ? 'The PDF is larger than 250 MB.' : err.message });
  return next();
}), handle('NCERT LIBRARY', req => {
  if (!req.file) { const e = new Error('Choose a PDF file.'); e.status = 400; throw e; }
  let user;
  try { user = who(req.body || {}); } catch (e) { require('fs').unlink(req.file.path, () => {}); throw e; }
  return { book: lib.add(req.file.path, req.body || {}, user) };
}));

router.delete('/books/:id', handle('NCERT LIBRARY', req => lib.remove(req.params.id, who(Object.assign({}, req.query, req.body || {})))));

router.post('/ai', handle('NCERT LIBRARY', async req => ({ result: await lib.ai(req.body || {}) })));

module.exports = router;
