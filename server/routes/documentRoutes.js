const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload');
const { authenticate } = require('../middleware/auth');
const {
  uploadDocument,
  getDocumentFile,
  revalidateDocument,
} = require('../controllers/documentController');

router.post('/upload', authenticate, upload.single('file'), uploadDocument);
router.get('/:id/file', authenticate, getDocumentFile);
router.post('/:id/revalidate', authenticate, revalidateDocument);

module.exports = router;
