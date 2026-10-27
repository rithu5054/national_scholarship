const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const {
  getOfficerApplications,
  startReview,
  reviewDocument,
  recordDecision,
} = require('../controllers/officerController');

router.use(authenticate, authorize('officer', 'admin'));

router.get('/applications', getOfficerApplications);
router.post('/applications/:id/start-review', startReview);
router.post('/documents/:id/review', reviewDocument);
router.post('/applications/:id/decision', recordDecision);

module.exports = router;
