const Application = require('../models/Application');
const Document = require('../models/Document');
const { logAudit, createNotification } = require('../services/auditService');

// Get assigned or pending applications
const getOfficerApplications = async (req, res) => {
  try {
    const { status, filter } = req.query;
    const query = { status: { $in: ['submitted', 'under_review', 'correction_required', 'approved', 'rejected'] } };

    if (filter === 'assigned') {
      query.assignedOfficer = req.user._id;
    } else if (filter === 'unassigned') {
      query.assignedOfficer = { $exists: false };
    }

    if (status) {
      query.status = status;
    }

    const applications = await Application.find(query)
      .populate('scholarshipId')
      .populate('studentId', 'name email phone')
      .populate('assignedOfficer', 'name email')
      .sort({ submittedAt: -1, createdAt: -1 });

    res.json({ success: true, count: applications.length, applications });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch officer applications.', error: err.message });
  }
};

// Start verification on an application
const startReview = async (req, res) => {
  try {
    const { id } = req.params;
    const application = await Application.findById(id);

    if (!application) return res.status(404).json({ success: false, message: 'Application not found.' });

    application.assignedOfficer = req.user._id;
    application.status = 'under_review';
    application.currentStage = 'Under Officer Verification';
    await application.save();

    await logAudit({
      actorId: req.user._id,
      actorRole: 'officer',
      applicationId: application._id,
      action: 'OFFICER_REVIEW_STARTED',
      reason: `Officer ${req.user.name} initiated document review`,
    });

    res.json({ success: true, application });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Could not start review.', error: err.message });
  }
};

// Officer Action on Document (Verify or Request Correction)
const reviewDocument = async (req, res) => {
  try {
    const { id } = req.params;
    const { action, notes, correctionReason } = req.body; // action: 'verify' | 'request_correction'

    const doc = await Document.findById(id);
    if (!doc) return res.status(404).json({ success: false, message: 'Document not found.' });

    if (action === 'verify') {
      doc.currentStatus = 'Officer Verified';
      doc.officerReview = {
        verifiedBy: req.user._id,
        verifiedAt: new Date(),
        notes: notes || 'Verified authentic by officer',
      };
      await doc.save();

      await logAudit({
        actorId: req.user._id,
        actorRole: 'officer',
        applicationId: doc.applicationId,
        action: 'DOCUMENT_VERIFIED',
        reason: `Officer verified ${doc.documentType}`,
      });
    } else if (action === 'request_correction') {
      if (!correctionReason) {
        return res.status(400).json({ success: false, message: 'A specific reason is required when requesting a correction.' });
      }

      doc.currentStatus = 'Correction Required';
      doc.officerReview = {
        verifiedBy: req.user._id,
        verifiedAt: new Date(),
        notes: notes || '',
        correctionReason,
      };
      await doc.save();

      // Update parent application
      const application = await Application.findById(doc.applicationId);
      if (application) {
        application.status = 'correction_required';
        application.currentStage = 'Correction Requested';
        await application.save();

        await createNotification({
          userId: doc.studentId,
          message: `Correction requested for ${doc.documentType}: "${correctionReason}". Please update the required information or re-upload the document.`,
          type: 'correction',
          applicationId: application._id,
        });

        await logAudit({
          actorId: req.user._id,
          actorRole: 'officer',
          applicationId: application._id,
          action: 'CORRECTION_REQUESTED',
          previousStatus: 'under_review',
          newStatus: 'correction_required',
          reason: `Document '${doc.documentType}' requires correction: ${correctionReason}`,
        });
      }
    }

    res.json({ success: true, message: `Document updated to '${doc.currentStatus}'.`, document: doc });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Document review action failed.', error: err.message });
  }
};

// Make Final Decision (Approve or Reject)
const recordDecision = async (req, res) => {
  try {
    const { id } = req.params;
    const { decision, reason } = req.body; // decision: 'Approved' | 'Rejected'

    if (!['Approved', 'Rejected'].includes(decision)) {
      return res.status(400).json({ success: false, message: "Decision must be 'Approved' or 'Rejected'." });
    }

    if (!reason) {
      return res.status(400).json({ success: false, message: 'A comprehensive justification reason is required.' });
    }

    const application = await Application.findById(id).populate('scholarshipId');
    if (!application) return res.status(404).json({ success: false, message: 'Application not found.' });

    // Validate whether any documents are still in 'Correction Required' or 'Mismatch Detected' before approval
    if (decision === 'Approved') {
      const documents = await Document.find({ applicationId: application._id });
      const unverified = documents.filter((d) => d.currentStatus !== 'Officer Verified');
      if (unverified.length > 0) {
        return res.status(400).json({
          success: false,
          message: `Cannot approve application: Document(s) [${unverified.map((d) => d.documentType).join(', ')}] are not yet verified by officer.`,
        });
      }
    }

    const prevStatus = application.status;
    application.status = decision === 'Approved' ? 'approved' : 'rejected';
    application.currentStage = decision;
    application.finalDecision = {
      decision,
      reason,
      decidedBy: req.user._id,
      decidedAt: new Date(),
    };

    await application.save();

    await logAudit({
      actorId: req.user._id,
      actorRole: 'officer',
      applicationId: application._id,
      action: decision === 'Approved' ? 'APPLICATION_APPROVED' : 'APPLICATION_REJECTED',
      previousStatus: prevStatus,
      newStatus: application.status,
      reason,
    });

    await createNotification({
      userId: application.studentId,
      message: `Your scholarship application (${application.applicationId}) has been ${decision.toUpperCase()}. Reason: ${reason}`,
      type: decision === 'Approved' ? 'success' : 'error',
      applicationId: application._id,
    });

    res.json({ success: true, message: `Application ${decision} successfully.`, application });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Decision recording failed.', error: err.message });
  }
};

module.exports = {
  getOfficerApplications,
  startReview,
  reviewDocument,
  recordDecision,
};
