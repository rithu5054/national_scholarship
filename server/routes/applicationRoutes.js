const express = require('express');
const router = express.Router();
const {
  createDraftApplication,
  updateApplication,
  submitApplication,
  getApplicationDetails,
  getMyApplications,
} = require('../controllers/applicationController');
const { authenticate, authorize } = require('../middleware/auth');

router.post('/draft', authenticate, authorize('student'), createDraftApplication);
router.get('/my-applications', authenticate, authorize('student'), getMyApplications);
router.get('/:id', authenticate, getApplicationDetails);
router.put('/:id', authenticate, authorize('student'), updateApplication);
router.post('/:id/submit', authenticate, authorize('student'), submitApplication);

module.exports = router;
