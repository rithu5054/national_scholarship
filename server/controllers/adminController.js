const User = require('../models/User');
const Application = require('../models/Application');
const Scholarship = require('../models/Scholarship');
const Document = require('../models/Document');
const AuditLog = require('../models/AuditLog');
const bcrypt = require('bcryptjs');
const { logAudit } = require('../services/auditService');

// System-wide Dashboard Statistics & Analytics for Recharts
const getAdminStats = async (req, res) => {
  try {
    const totalStudents = await User.countDocuments({ role: 'student' });
    const totalOfficers = await User.countDocuments({ role: 'officer' });
    const totalScholarships = await Scholarship.countDocuments();
    const totalApplications = await Application.countDocuments();

    const pendingReview = await Application.countDocuments({ status: { $in: ['submitted', 'under_review'] } });
    const correctionRequired = await Application.countDocuments({ status: 'correction_required' });
    const approved = await Application.countDocuments({ status: 'approved' });
    const rejected = await Application.countDocuments({ status: 'rejected' });
    const drafts = await Application.countDocuments({ status: 'draft' });

    // Applications by status breakdown for charts
    const statusDistribution = [
      { name: 'Draft', count: drafts, color: '#94a3b8' },
      { name: 'Under Review', count: pendingReview, color: '#3b82f6' },
      { name: 'Correction Needed', count: correctionRequired, color: '#f59e0b' },
      { name: 'Approved', count: approved, color: '#10b981' },
      { name: 'Rejected', count: rejected, color: '#ef4444' },
    ];

    // Mismatch category telemetry
    const docsWithMismatches = await Document.find({ 'validationResults.hasMismatch': true });
    const mismatchCounts = {
      'Income Mismatch': 0,
      'Name Mismatch': 0,
      'Academic Marks Mismatch': 0,
      'Authority Cross-Check': 0,
    };

    docsWithMismatches.forEach((doc) => {
      (doc.validationResults.mismatchDetails || []).forEach((m) => {
        if (m.field.includes('Income')) mismatchCounts['Income Mismatch']++;
        else if (m.field.includes('Name')) mismatchCounts['Name Mismatch']++;
        else if (m.field.includes('Marks')) mismatchCounts['Academic Marks Mismatch']++;
        else mismatchCounts['Authority Cross-Check']++;
      });
    });

    const mismatchBreakdown = Object.keys(mismatchCounts).map((k) => ({
      category: k,
      count: mismatchCounts[k],
    }));

    // Applications grouped by scholarship
    const appsByScholarship = await Application.aggregate([
      {
        $group: {
          _id: '$scholarshipId',
          count: { $sum: 1 },
        },
      },
      {
        $lookup: {
          from: 'scholarships',
          localField: '_id',
          foreignField: '_id',
          as: 'scholarship',
        },
      },
      { $unwind: '$scholarship' },
      {
        $project: {
          name: '$scholarship.name',
          count: 1,
        },
      },
    ]);

    res.json({
      success: true,
      metrics: {
        totalStudents,
        totalOfficers,
        totalScholarships,
        totalApplications,
        pendingReview,
        correctionRequired,
        approved,
        rejected,
      },
      charts: {
        statusDistribution,
        mismatchBreakdown,
        appsByScholarship,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to generate statistics.', error: err.message });
  }
};

// Manage Users (Create officer or view users)
const getUsers = async (req, res) => {
  try {
    const { role } = req.query;
    const query = role ? { role } : {};
    const users = await User.find(query).select('-passwordHash').sort({ createdAt: -1 });
    res.json({ success: true, count: users.length, users });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error retrieving users.', error: err.message });
  }
};

const createOfficer = async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Name, email, and password required.' });
    }

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(400).json({ success: false, message: 'User with this email already exists.' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const officer = new User({
      name,
      email: email.toLowerCase(),
      passwordHash,
      phone: phone || '',
      role: 'officer',
      accountStatus: 'active',
    });
    await officer.save();

    await logAudit({
      actorId: req.user._id,
      actorRole: 'admin',
      action: 'OFFICER_CREATED',
      reason: `Admin created verification officer account for ${officer.email}`,
    });

    res.status(201).json({
      success: true,
      message: 'Officer account created successfully.',
      officer: {
        id: officer._id,
        name: officer.name,
        email: officer.email,
        role: officer.role,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to create officer.', error: err.message });
  }
};

// Assign Officer to Application
const assignApplicationOfficer = async (req, res) => {
  try {
    const { applicationId, officerId } = req.body;
    const app = await Application.findById(applicationId);
    if (!app) return res.status(404).json({ success: false, message: 'Application not found.' });

    const officer = await User.findOne({ _id: officerId, role: 'officer' });
    if (!officer) return res.status(400).json({ success: false, message: 'Invalid officer specified.' });

    app.assignedOfficer = officer._id;
    if (app.status === 'submitted') {
      app.status = 'under_review';
      app.currentStage = 'Under Officer Verification';
    }
    await app.save();

    await logAudit({
      actorId: req.user._id,
      actorRole: 'admin',
      applicationId: app._id,
      action: 'OFFICER_ASSIGNED',
      reason: `Assigned verification to officer ${officer.name}`,
    });

    res.json({ success: true, message: `Application assigned to ${officer.name}`, application: app });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Officer assignment failed.', error: err.message });
  }
};

// Audit logs query
const getAuditLogs = async (req, res) => {
  try {
    const logs = await AuditLog.find()
      .populate('actorId', 'name email role')
      .populate('applicationId', 'applicationId')
      .sort({ timestamp: -1 })
      .limit(100);

    res.json({ success: true, count: logs.length, logs });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch audit logs.', error: err.message });
  }
};

module.exports = {
  getAdminStats,
  getUsers,
  createOfficer,
  assignApplicationOfficer,
  getAuditLogs,
};
