const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const {
  getAdminStats,
  getUsers,
  createOfficer,
  assignApplicationOfficer,
  getAuditLogs,
} = require('../controllers/adminController');

router.use(authenticate, authorize('admin'));

router.get('/stats', getAdminStats);
router.get('/users', getUsers);
router.post('/officers', createOfficer);
router.post('/assign', assignApplicationOfficer);
router.get('/audit-logs', getAuditLogs);

module.exports = router;
