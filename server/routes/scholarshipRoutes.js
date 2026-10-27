const express = require('express');
const router = express.Router();
const {
  getScholarships,
  getScholarshipById,
  checkEligibility,
  getRecommendations,
  createScholarship,
  updateScholarship,
  deactivateScholarship,
} = require('../controllers/scholarshipController');
const { authenticate, authorize } = require('../middleware/auth');

router.get('/', getScholarships);
router.get('/recommendations', authenticate, authorize('student'), getRecommendations);
router.get('/:id', getScholarshipById);
router.post('/:id/check-eligibility', authenticate, checkEligibility);

// Admin routes
router.post('/', authenticate, authorize('admin'), createScholarship);
router.put('/:id', authenticate, authorize('admin'), updateScholarship);
router.delete('/:id', authenticate, authorize('admin'), deactivateScholarship);

module.exports = router;
