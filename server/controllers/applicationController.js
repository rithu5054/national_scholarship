const Application = require('../models/Application');
const Scholarship = require('../models/Scholarship');
const StudentProfile = require('../models/StudentProfile');
const Document = require('../models/Document');
const { evaluateEligibility } = require('../services/eligibilityEngine');
const { logAudit, createNotification } = require('../services/auditService');

// Create Draft Application
const createDraftApplication = async (req, res) => {
  try {
    const { scholarshipId } = req.body;
    const studentId = req.user._id;

    const scholarship = await Scholarship.findById(scholarshipId);
    if (!scholarship || scholarship.status !== 'active') {
      return res.status(400).json({ success: false, message: 'Invalid or inactive scholarship.' });
    }

    // Check if duplicate submission already exists
    const existing = await Application.findOne({
      studentId,
      scholarshipId,
      status: { $in: ['submitted', 'under_review', 'approved'] },
    });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'An active application for this scholarship already exists.',
        applicationId: existing.applicationId,
      });
    }

    // Check if an existing draft exists
    let application = await Application.findOne({ studentId, scholarshipId, status: 'draft' });
    if (application) {
      return res.json({ success: true, message: 'Draft retrieved.', application });
    }

    const profile = await StudentProfile.findOne({ userId: studentId });
    const evaluation = profile ? evaluateEligibility(scholarship, profile) : null;

    const appNumber = `APP-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;

    application = new Application({
      applicationId: appNumber,
      studentId,
      scholarshipId,
      applicationData: {
        studentName: req.user.name,
        email: req.user.email,
        phone: req.user.phone || '',
        studentIdNumber: profile ? profile.studentId : '',
        course: profile ? profile.course : '',
        academicYear: profile ? profile.academicYear : '',
        institution: profile ? profile.institution : '',
        percentageOrCGPA: profile ? profile.percentageOrCGPA : 0,
        annualFamilyIncome: profile ? profile.annualFamilyIncome : 0,
        category: profile ? profile.category : 'General',
        gender: profile ? profile.gender : '',
        disabilityStatus: profile ? profile.disabilityStatus : 'No',
      },
      eligibilityEvaluation: evaluation,
      currentStage: evaluation && evaluation.isEligible ? 'Eligibility Evaluated' : 'Draft',
      status: 'draft',
    });

    await application.save();

    await logAudit({
      actorId: studentId,
      actorRole: 'student',
      applicationId: application._id,
      action: 'APPLICATION_CREATED',
      reason: `Started draft application for ${scholarship.name}`,
    });

    res.status(201).json({ success: true, application });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to create application draft.', error: err.message });
  }
};

// Update Application Fields (permitted in draft or correction_required states)
const updateApplication = async (req, res) => {
  try {
    const { id } = req.params;
    const application = await Application.findById(id);

    if (!application) {
      return res.status(404).json({ success: false, message: 'Application not found.' });
    }

    if (String(application.studentId) !== String(req.user._id) && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Unauthorized access to application.' });
    }

    if (!['draft', 'correction_required'].includes(application.status)) {
      return res.status(400).json({
        success: false,
        message: 'Application fields are locked after submission unless correction has been requested.',
      });
    }

    const { applicationData } = req.body;
    if (applicationData) {
      application.applicationData = { ...application.applicationData, ...applicationData };

      // Re-evaluate eligibility against updated data
      const scholarship = await Scholarship.findById(application.scholarshipId);
      if (scholarship) {
        application.eligibilityEvaluation = evaluateEligibility(scholarship, application.applicationData);
      }
    }

    await application.save();

    res.json({ success: true, message: 'Application updated.', application });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update application.', error: err.message });
  }
};

// Submit Application
const submitApplication = async (req, res) => {
  try {
    const { id } = req.params;
    const application = await Application.findById(id).populate('scholarshipId');

    if (!application) {
      return res.status(404).json({ success: false, message: 'Application not found.' });
    }

    if (String(application.studentId) !== String(req.user._id)) {
      return res.status(403).json({ success: false, message: 'Unauthorized.' });
    }

    if (!['draft', 'correction_required'].includes(application.status)) {
      return res.status(400).json({ success: false, message: 'Application has already been submitted.' });
    }

    // 1. Verify eligibility
    if (!application.eligibilityEvaluation || !application.eligibilityEvaluation.isEligible) {
      return res.status(400).json({
        success: false,
        message: 'Cannot submit application: Configured eligibility criteria are not met.',
        reasons: application.eligibilityEvaluation ? application.eligibilityEvaluation.reasons : ['Eligibility unverified'],
      });
    }

    // 2. Check required documents
    const requiredDocs = application.scholarshipId.requiredDocuments.filter((d) => d.isRequired);
    const uploadedDocs = await Document.find({ applicationId: application._id });

    const missingDocs = requiredDocs.filter(
      (reqDoc) => !uploadedDocs.some((upDoc) => upDoc.documentType === reqDoc.documentType)
    );

    if (missingDocs.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Missing mandatory document(s): ${missingDocs.map((d) => d.documentType).join(', ')}`,
      });
    }

    // 3. Check for unresolved high-severity mismatches
    const unresolvedMismatches = uploadedDocs.filter(
      (doc) => doc.validationResults && doc.validationResults.hasMismatch && doc.currentStatus === 'Mismatch Detected'
    );

    if (unresolvedMismatches.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Pre-verification blocked: One or more uploaded documents have detected mismatches. Please review the mismatch explanations and correct or re-upload the documents before submission.',
        mismatchedDocuments: unresolvedMismatches.map((d) => d.documentType),
      });
    }

    const prevStatus = application.status;
    const isResubmission = prevStatus === 'correction_required';

    application.status = 'submitted';
    application.currentStage = isResubmission ? 'Correction Resubmitted' : 'Submitted';
    application.submittedAt = new Date();

    await application.save();

    await logAudit({
      actorId: req.user._id,
      actorRole: 'student',
      applicationId: application._id,
      action: isResubmission ? 'CORRECTION_RESUBMITTED' : 'APPLICATION_SUBMITTED',
      previousStatus: prevStatus,
      newStatus: 'submitted',
      reason: isResubmission ? 'Student resolved correction requests' : 'Application submitted for officer verification',
    });

    await createNotification({
      userId: req.user._id,
      message: `Your application (${application.applicationId}) has been successfully submitted and placed in queue for verification.`,
      type: 'success',
      applicationId: application._id,
    });

    res.json({
      success: true,
      message: 'Application submitted successfully!',
      application,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Submission failed.', error: err.message });
  }
};

// Get Single Application Details with Documents & Audit History
const getApplicationDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const application = await Application.findById(id)
      .populate('scholarshipId')
      .populate('studentId', 'name email phone')
      .populate('assignedOfficer', 'name email');

    if (!application) {
      return res.status(404).json({ success: false, message: 'Application not found.' });
    }

    // Access control: only owner, officer, or admin
    if (
      req.user.role === 'student' &&
      String(application.studentId._id) !== String(req.user._id)
    ) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    const documents = await Document.find({ applicationId: application._id });
    res.json({ success: true, application, documents });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to retrieve application.', error: err.message });
  }
};

// Get Student Applications
const getMyApplications = async (req, res) => {
  try {
    const applications = await Application.find({ studentId: req.user._id })
      .populate('scholarshipId')
      .sort({ createdAt: -1 });

    res.json({ success: true, count: applications.length, applications });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch applications.', error: err.message });
  }
};

module.exports = {
  createDraftApplication,
  updateApplication,
  submitApplication,
  getApplicationDetails,
  getMyApplications,
};
