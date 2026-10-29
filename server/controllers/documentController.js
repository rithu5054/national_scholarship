const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const Document = require('../models/Document');
const DocumentVersion = require('../models/DocumentVersion');
const Application = require('../models/Application');
const StudentProfile = require('../models/StudentProfile');
const {
  scanQRCode,
  extractOCR,
  parseDocumentFields,
  detectMismatches,
} = require('../services/documentProcessor');
const { logAudit, createNotification } = require('../services/auditService');

// Upload or Replace Document (supports both Application documents and Profile certificates)
const uploadDocument = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Please attach a document file.' });
    }

    const { applicationId, documentType, mockSimulatedFields } = req.body;
    if (!documentType) {
      return res.status(400).json({ success: false, message: 'Document Type is required.' });
    }

    const filePath = req.file.path;
    const fileBuffer = fs.readFileSync(filePath);
    const fileHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');

    // 1. Process QR Code
    const qrResult = await scanQRCode(filePath);

    // 2. Extract OCR Text
    const ocrResult = await extractOCR(filePath);

    // 3. Parse fields
    let extractedFields = parseDocumentFields(ocrResult.text, qrResult, documentType);

    // If caller provided mock simulated fields for demonstration testing
    if (mockSimulatedFields) {
      try {
        const parsedMock = typeof mockSimulatedFields === 'string' ? JSON.parse(mockSimulatedFields) : mockSimulatedFields;
        extractedFields = { ...extractedFields, ...parsedMock };
      } catch (e) {}
    }

    extractedFields.rawOcrText = ocrResult.text ? ocrResult.text.slice(0, 1000) : '';
    extractedFields.qrPayload = qrResult.data || null;
    extractedFields.extractionStatus = (ocrResult.success || qrResult.detected || extractedFields.certificateNumber) ? 'Success' : 'Partial';

    // Determine target context: Profile upload vs Application upload
    const isProfileUpload = !applicationId || applicationId === 'profile' || applicationId === 'null';

    let comparisonData = {};
    let application = null;
    let profile = await StudentProfile.findOne({ userId: req.user._id });

    if (!isProfileUpload) {
      application = await Application.findById(applicationId);
      if (!application) {
        return res.status(404).json({ success: false, message: 'Application not found.' });
      }

      if (String(application.studentId) !== String(req.user._id) && req.user.role !== 'admin') {
        return res.status(403).json({ success: false, message: 'Unauthorized.' });
      }
      comparisonData = application.applicationData || {};
    } else {
      comparisonData = {
        studentName: req.user.name,
        annualFamilyIncome: profile ? profile.annualFamilyIncome : 0,
        percentageOrCGPA: profile ? profile.percentageOrCGPA : 0,
        course: profile ? profile.course : '',
        institution: profile ? profile.institution : '',
        category: profile ? profile.category : 'General',
      };
    }

    // 4. Run Core Novelty: Automatic Mismatch Detection
    const validation = await detectMismatches(comparisonData, extractedFields, documentType);

    // Determine docStatus
    let docStatus = 'Uploaded';
    if (validation.hasMismatch) {
      docStatus = 'Mismatch Detected';
    } else if (validation.isManualReview) {
      docStatus = 'Manual Review Required';
    } else {
      docStatus = 'Pre-Verification Passed';
    }

    // Check if an existing document record already exists (Replacement workflow)
    const docQuery = isProfileUpload
      ? { studentId: req.user._id, documentType, isProfileDocument: true }
      : { applicationId, documentType };

    let doc = await Document.findOne(docQuery);
    let versionNum = 1;

    if (doc) {
      // Archive old version
      const prevCount = await DocumentVersion.countDocuments({ documentId: doc._id });
      versionNum = prevCount + 2;

      await DocumentVersion.create({
        documentId: doc._id,
        versionNumber: versionNum - 1,
        storedFileName: doc.storedFileName,
        originalFileName: doc.originalFileName,
        uploadedBy: req.user._id,
        extractedData: doc.extractedData,
        correctionReason: isProfileUpload
          ? 'Profile certificate replaced with updated copy'
          : 'Document replaced with updated copy',
      });

      doc.storedFileName = req.file.filename;
      doc.originalFileName = req.file.originalname;
      doc.mimeType = req.file.mimetype;
      doc.fileSize = req.file.size;
      doc.fileHash = fileHash;
      doc.version = versionNum;
      doc.extractedData = extractedFields;
      doc.validationResults = validation;
      doc.currentStatus = docStatus;
      doc.uploadedAt = new Date();
      await doc.save();
    } else {
      doc = new Document({
        applicationId: isProfileUpload ? null : applicationId,
        studentId: req.user._id,
        documentType,
        isProfileDocument: isProfileUpload,
        version: 1,
        storedFileName: req.file.filename,
        originalFileName: req.file.originalname,
        mimeType: req.file.mimetype,
        fileSize: req.file.size,
        fileHash,
        extractedData: extractedFields,
        validationResults: validation,
        currentStatus: docStatus,
      });
      await doc.save();
    }

    // Sync to StudentProfile.certificates so profile always holds the latest certificate metadata
    if (profile) {
      if (!profile.certificates) profile.certificates = [];
      const certIdx = profile.certificates.findIndex((c) => c.documentType === documentType);
      const certEntry = {
        documentType,
        documentId: doc._id,
        storedFileName: req.file.filename,
        originalFileName: req.file.originalname,
        mimeType: req.file.mimetype,
        fileSize: req.file.size,
        fileHash,
        uploadDate: new Date(),
        version: versionNum,
        extractedData: extractedFields,
        validationResults: validation,
        verificationStatus: validation.verificationStatus,
      };

      if (certIdx >= 0) {
        profile.certificates[certIdx] = certEntry;
      } else {
        profile.certificates.push(certEntry);
      }
      await profile.save();
    }

    // If this was an application upload, update application stage and audit
    if (application) {
      if (application.currentStage === 'Draft' || application.currentStage === 'Eligibility Evaluated') {
        application.currentStage = 'Documents Uploaded';
        await application.save();
      }

      await logAudit({
        actorId: req.user._id,
        actorRole: 'student',
        applicationId: application._id,
        action: 'DOCUMENT_UPLOADED',
        reason: `Uploaded ${documentType}. Pre-verification status: ${docStatus}`,
      });

      if (validation.hasMismatch) {
        await createNotification({
          userId: req.user._id,
          message: `Mismatch detected in uploaded ${documentType}. Please review the pre-verification details and correct any discrepancies.`,
          type: 'warning',
          applicationId: application._id,
        });
      }
    } else {
      // Profile upload audit
      await logAudit({
        actorId: req.user._id,
        actorRole: 'student',
        action: 'PROFILE_CERTIFICATE_UPLOADED',
        reason: `Uploaded profile ${documentType}. Status: ${validation.verificationStatus}`,
      });
    }

    res.status(201).json({
      success: true,
      message: validation.hasMismatch
        ? 'Document uploaded. Potential mismatch detected during verification!'
        : validation.isManualReview
        ? 'Document uploaded. Manual review required: OCR could not read all required details.'
        : 'Document uploaded and verified successfully.',
      document: doc,
      version: versionNum,
      verificationStatus: validation.verificationStatus,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Document upload failed.', error: err.message });
  }
};

// Secure Document Access (Download / Preview with authorization)
const getDocumentFile = async (req, res) => {
  try {
    const { id } = req.params;
    const doc = await Document.findById(id).populate('applicationId');

    if (!doc) {
      return res.status(404).json({ success: false, message: 'Document not found.' });
    }

    // Authorization check: Only application student, verification officer, or admin
    if (
      req.user.role === 'student' &&
      String(doc.studentId) !== String(req.user._id)
    ) {
      return res.status(403).json({ success: false, message: 'Access denied to this document.' });
    }

    const filePath = path.join(__dirname, '..', 'uploads', doc.storedFileName);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, message: 'File not found on storage server.' });
    }

    res.setHeader('Content-Type', doc.mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${doc.originalFileName}"`);
    fs.createReadStream(filePath).pipe(res);
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error retrieving document.', error: err.message });
  }
};

// Re-run validation on demand (e.g. after correcting application field)
const revalidateDocument = async (req, res) => {
  try {
    const { id } = req.params;
    const doc = await Document.findById(id);
    if (!doc) return res.status(404).json({ success: false, message: 'Document not found.' });

    const application = await Application.findById(doc.applicationId);
    if (!application) return res.status(404).json({ success: false, message: 'Associated application not found.' });

    const validation = await detectMismatches(application.applicationData, doc.extractedData, doc.documentType);

    doc.validationResults = validation;
    doc.currentStatus = validation.hasMismatch
      ? 'Mismatch Detected'
      : validation.isManualReview
      ? 'Manual Review Required'
      : 'Pre-Verification Passed';
    await doc.save();

    res.json({ success: true, document: doc, verificationStatus: validation.verificationStatus });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Re-validation failed.', error: err.message });
  }
};

// Get all documents uploaded by the current student (for Profile Certificates panel)
const getMyDocuments = async (req, res) => {
  try {
    const docs = await Document.find({ studentId: req.user._id })
      .populate('applicationId', 'applicationId scholarshipId currentStage')
      .populate({
        path: 'applicationId',
        populate: { path: 'scholarshipId', select: 'name' },
      })
      .sort({ uploadedAt: -1 });

    const profile = await StudentProfile.findOne({ userId: req.user._id });

    res.json({
      success: true,
      count: docs.length,
      documents: docs,
      profileCertificates: profile ? profile.certificates : [],
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to retrieve documents.', error: err.message });
  }
};

module.exports = {
  uploadDocument,
  getDocumentFile,
  revalidateDocument,
  getMyDocuments,
};
