const Application = require('../models/Application');
const Scholarship = require('../models/Scholarship');
const StudentProfile = require('../models/StudentProfile');
const Document = require('../models/Document');
const { evaluateEligibility } = require('../services/eligibilityEngine');
const { logAudit, createNotification } = require('../services/auditService');
const { detectMismatches } = require('../services/documentProcessor');

// Create Draft Application (reuses verified profile certificates automatically)
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

    const profile = await StudentProfile.findOne({ userId: studentId });
    const evaluation = profile ? evaluateEligibility(scholarship, profile) : null;

    // Check if an existing draft exists
    let application = await Application.findOne({ studentId, scholarshipId, status: 'draft' });
    let isNewDraft = false;

    if (!application) {
      isNewDraft = true;
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
    }

    if (isNewDraft) {
      await logAudit({
        actorId: studentId,
        actorRole: 'student',
        applicationId: application._id,
        action: 'APPLICATION_CREATED',
        reason: `Started draft application for ${scholarship.name}.`,
      });
    }

    res.status(isNewDraft ? 201 : 200).json({ success: true, application });
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

    // 1. Verify eligibility independently against latest criteria
    const profile = await StudentProfile.findOne({ userId: req.user._id });
    const freshEligibility = evaluateEligibility(application.scholarshipId, application.applicationData || profile);
    if (!freshEligibility.isEligible) {
      return res.status(400).json({
        success: false,
        message: 'Cannot submit application: Configured eligibility criteria are not met.',
        reasons: freshEligibility.reasons,
      });
    }

    // 2. Fetch uploaded documents for this application
    const uploadedDocs = await Document.find({ applicationId: application._id });

    // Identify application documents
    const appIncome = uploadedDocs.find(
      (d) => d.documentType === 'Income Certificate' || d.documentType.toLowerCase().includes('income')
    );
    const appMarks = uploadedDocs.find(
      (d) => d.documentType === 'Academic Marksheet' || d.documentType.toLowerCase().includes('mark')
    );

    // Identify profile documents
    const profileCerts = profile?.certificates || [];
    const profileIncome = profileCerts.find(
      (c) => c.documentType === 'Income Certificate' || c.documentType.toLowerCase().includes('income')
    );
    const profileMarks = profileCerts.find(
      (c) => c.documentType === 'Academic Marksheet' || c.documentType.toLowerCase().includes('mark')
    );

    const errorMessages = [];

    // Check if missing in profile
    if (!profileIncome || !profileIncome.fileHash) {
      errorMessages.push('Please upload your Income Certificate in My Profile first.');
    }
    if (!profileMarks || !profileMarks.fileHash) {
      errorMessages.push('Please upload your Academic Marksheet in My Profile first.');
    }

    // Check if missing in application
    if (!appIncome) {
      errorMessages.push('Please upload your Income Certificate on the application page.');
    }
    if (!appMarks) {
      errorMessages.push('Please upload your Academic Marksheet on the application page.');
    }

    // If documents exist in profile and application, check hashes strictly
    if (profileIncome && profileIncome.fileHash && appIncome) {
      if (appIncome.fileHash !== profileIncome.fileHash) {
        appIncome.currentStatus = 'MISMATCH';
        await appIncome.save();
        errorMessages.push('Income Certificate Mismatch. Please upload the same Income Certificate saved in your profile.');
      } else {
        appIncome.currentStatus = 'MATCHED';
        await appIncome.save();
      }
    }

    if (profileMarks && profileMarks.fileHash && appMarks) {
      if (appMarks.fileHash !== profileMarks.fileHash) {
        appMarks.currentStatus = 'MISMATCH';
        await appMarks.save();
        errorMessages.push('Academic Marksheet Mismatch. Please upload the same Academic Marksheet saved in your profile.');
      } else {
        appMarks.currentStatus = 'MATCHED';
        await appMarks.save();
      }
    }

    // Block submission if there are any errors or mismatches
    if (errorMessages.length > 0) {
      return res.status(400).json({
        success: false,
        status: 'MISMATCH',
        message: errorMessages.join(' '),
        errors: errorMessages,
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
      reason: isResubmission ? 'Student resolved correction requests' : 'Application submitted with verified matching profile certificates',
    });

    await createNotification({
      userId: req.user._id,
      message: `Your application (${application.applicationId}) has been successfully submitted and placed in queue for verification.`,
      type: 'success',
      applicationId: application._id,
    });

    res.json({
      success: true,
      message: 'Certificate Verification Successful. Income Certificate and Academic Marksheet match your profile documents. You can submit your application.',
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

    let documents = await Document.find({ applicationId: application._id });

    // In draft state, auto-sync/link any fresh certificates from student profile
    if (req.user.role === 'student' && application.status === 'draft') {
      const profile = await StudentProfile.findOne({ userId: req.user._id });
      if (profile && profile.certificates && profile.certificates.length > 0 && application.scholarshipId) {
        const requiredDocs = application.scholarshipId.requiredDocuments || [];
        let modified = false;

        for (const reqDoc of requiredDocs) {
          const existingDoc = documents.find((d) => d.documentType === reqDoc.documentType);
          const profileCert = profile.certificates.find((c) => c.documentType === reqDoc.documentType);

          if (profileCert) {
            if (!existingDoc) {
              await Document.create({
                applicationId: application._id,
                studentId: req.user._id,
                documentType: profileCert.documentType,
                storedFileName: profileCert.storedFileName,
                originalFileName: profileCert.originalFileName,
                mimeType: profileCert.mimeType,
                fileSize: profileCert.fileSize,
                fileHash: profileCert.fileHash,
                version: profileCert.version || 1,
                extractedData: profileCert.extractedData,
                validationResults: profileCert.validationResults,
                currentStatus: profileCert.verificationStatus === 'Verified' ? 'Pre-Verification Passed' : profileCert.verificationStatus,
              });
              modified = true;
            } else if ((existingDoc.version || 1) < (profileCert.version || 1)) {
              existingDoc.storedFileName = profileCert.storedFileName;
              existingDoc.originalFileName = profileCert.originalFileName;
              existingDoc.mimeType = profileCert.mimeType;
              existingDoc.fileSize = profileCert.fileSize;
              existingDoc.fileHash = profileCert.fileHash;
              existingDoc.version = profileCert.version;
              existingDoc.extractedData = profileCert.extractedData;
              existingDoc.validationResults = profileCert.validationResults;
              existingDoc.currentStatus = profileCert.verificationStatus === 'Verified' ? 'Pre-Verification Passed' : profileCert.verificationStatus;
              await existingDoc.save();
              modified = true;
            }
          }
        }

        if (modified) {
          documents = await Document.find({ applicationId: application._id });
        }
      }
    }

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
