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

// Upload or Replace Document (supports Profile certificate upload and Application SHA-256 verification)
const uploadDocument = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Please attach a document file.' });
    }

    const { applicationId, documentType } = req.body;
    if (!documentType) {
      return res.status(400).json({ success: false, message: 'Document Type is required.' });
    }

    const filePath = req.file.path;
    const fileBuffer = fs.readFileSync(filePath);
    const fileHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');

    // Context: Profile upload vs Application upload
    const isProfileUpload = !applicationId || applicationId === 'profile' || applicationId === 'null';
    let profile = await StudentProfile.findOne({ userId: req.user._id });

    if (isProfileUpload) {
      // 1. Profile Upload Workflow
      // Only saves document & its SHA-256 hash. No OCR, no manual review, no approval required.
      const docQuery = { studentId: req.user._id, documentType, isProfileDocument: true };
      let doc = await Document.findOne(docQuery);
      let versionNum = 1;

      if (doc) {
        // Archive prior version
        const prevCount = await DocumentVersion.countDocuments({ documentId: doc._id });
        versionNum = prevCount + 2;

        await DocumentVersion.create({
          documentId: doc._id,
          versionNumber: versionNum - 1,
          storedFileName: doc.storedFileName,
          originalFileName: doc.originalFileName,
          uploadedBy: req.user._id,
          correctionReason: 'Profile certificate replaced with updated copy',
        });

        doc.storedFileName = req.file.filename;
        doc.originalFileName = req.file.originalname;
        doc.mimeType = req.file.mimetype;
        doc.fileSize = req.file.size;
        doc.fileHash = fileHash;
        doc.version = versionNum;
        doc.currentStatus = 'Uploaded';
        doc.uploadedAt = new Date();
        await doc.save();
      } else {
        doc = new Document({
          applicationId: null,
          studentId: req.user._id,
          documentType,
          isProfileDocument: true,
          version: 1,
          storedFileName: req.file.filename,
          originalFileName: req.file.originalname,
          mimeType: req.file.mimetype,
          fileSize: req.file.size,
          fileHash,
          currentStatus: 'Uploaded',
        });
        await doc.save();
      }

      // Update StudentProfile.certificates
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
          verificationStatus: 'Uploaded',
        };

        if (certIdx >= 0) {
          profile.certificates[certIdx] = certEntry;
        } else {
          profile.certificates.push(certEntry);
        }
        await profile.save();
      }

      await logAudit({
        actorId: req.user._id,
        actorRole: 'student',
        action: 'PROFILE_CERTIFICATE_UPLOADED',
        reason: `Uploaded profile ${documentType} (SHA-256: ${fileHash.slice(0, 12)}...)`,
      });

      return res.status(201).json({
        success: true,
        message: `${documentType} saved to your profile successfully.`,
        document: doc,
        fileHash,
        version: versionNum,
      });
    }

    // 2. Application Document Upload Workflow
    // Compares SHA-256 hash of newly uploaded application file with corresponding profile certificate
    const application = await Application.findById(applicationId);
    if (!application) {
      return res.status(404).json({ success: false, message: 'Application not found.' });
    }

    if (String(application.studentId) !== String(req.user._id) && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Unauthorized.' });
    }

    // Retrieve corresponding certificate from student profile
    const isIncome = documentType.toLowerCase().includes('income');
    const isMark = documentType.toLowerCase().includes('mark');
    const standardName = isIncome ? 'Income Certificate' : isMark ? 'Academic Marksheet' : documentType;

    const profileCert = profile?.certificates?.find((c) =>
      c.documentType === documentType ||
      (isIncome && c.documentType.toLowerCase().includes('income')) ||
      (isMark && c.documentType.toLowerCase().includes('mark'))
    );

    let isMatched = false;
    let status = 'MISMATCH';
    let message = '';

    if (!profileCert || !profileCert.fileHash) {
      status = 'MISMATCH';
      message = `Please upload your ${standardName} in My Profile first.`;
    } else if (profileCert.fileHash === fileHash) {
      isMatched = true;
      status = 'MATCHED';
      message = `${standardName}: MATCHED.`;
    } else {
      status = 'MISMATCH';
      if (isIncome) {
        message = 'Income Certificate Mismatch. Please upload the same Income Certificate saved in your profile.';
      } else if (isMark) {
        message = 'Academic Marksheet Mismatch. Please upload the same Academic Marksheet saved in your profile.';
      } else {
        message = `${documentType} Mismatch. Please upload the same ${documentType} saved in your profile.`;
      }
    }

    const validationResults = {
      hasMismatch: !isMatched,
      isMatched,
      status,
      message,
      profileHash: profileCert?.fileHash || '',
      appHash: fileHash,
      mismatchDetails: !isMatched ? [{ field: documentType, reason: message }] : [],
    };

    // Save or update application document
    let doc = await Document.findOne({ applicationId, documentType });
    let versionNum = 1;

    if (doc) {
      const prevCount = await DocumentVersion.countDocuments({ documentId: doc._id });
      versionNum = prevCount + 2;

      await DocumentVersion.create({
        documentId: doc._id,
        versionNumber: versionNum - 1,
        storedFileName: doc.storedFileName,
        originalFileName: doc.originalFileName,
        uploadedBy: req.user._id,
        correctionReason: 'Application document replaced with updated copy',
      });

      doc.storedFileName = req.file.filename;
      doc.originalFileName = req.file.originalname;
      doc.mimeType = req.file.mimetype;
      doc.fileSize = req.file.size;
      doc.fileHash = fileHash;
      doc.version = versionNum;
      doc.currentStatus = status;
      doc.validationResults = validationResults;
      doc.uploadedAt = new Date();
      await doc.save();
    } else {
      doc = new Document({
        applicationId,
        studentId: req.user._id,
        documentType,
        isProfileDocument: false,
        version: 1,
        storedFileName: req.file.filename,
        originalFileName: req.file.originalname,
        mimeType: req.file.mimetype,
        fileSize: req.file.size,
        fileHash,
        currentStatus: status,
        validationResults,
      });
      await doc.save();
    }

    // Update application stage if needed
    if (application.currentStage === 'Draft' || application.currentStage === 'Eligibility Evaluated') {
      application.currentStage = 'Documents Uploaded';
      await application.save();
    }

    await logAudit({
      actorId: req.user._id,
      actorRole: 'student',
      applicationId: application._id,
      action: 'DOCUMENT_UPLOADED',
      reason: `Uploaded ${documentType} for application. Comparison result: ${status}`,
    });

    res.status(201).json({
      success: true,
      status,
      isMatched,
      message,
      document: doc,
      version: versionNum,
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

// Re-run validation on demand (e.g. after updating profile document)
const revalidateDocument = async (req, res) => {
  try {
    const { id } = req.params;
    const doc = await Document.findById(id);
    if (!doc) return res.status(404).json({ success: false, message: 'Document not found.' });

    const isIncome = doc.documentType.toLowerCase().includes('income');
    const isMark = doc.documentType.toLowerCase().includes('mark');
    const standardName = isIncome ? 'Income Certificate' : isMark ? 'Academic Marksheet' : doc.documentType;

    const profile = await StudentProfile.findOne({ userId: doc.studentId });
    const profileCert = profile?.certificates?.find((c) =>
      c.documentType === doc.documentType ||
      (isIncome && c.documentType.toLowerCase().includes('income')) ||
      (isMark && c.documentType.toLowerCase().includes('mark'))
    );

    let isMatched = false;
    let status = 'MISMATCH';
    let message = '';

    if (!profileCert || !profileCert.fileHash) {
      status = 'MISMATCH';
      message = `Please upload your ${standardName} in My Profile first.`;
    } else if (profileCert.fileHash === doc.fileHash) {
      isMatched = true;
      status = 'MATCHED';
      message = `${standardName}: MATCHED.`;
    } else {
      status = 'MISMATCH';
      if (isIncome) {
        message = 'Income Certificate Mismatch. Please upload the same Income Certificate saved in your profile.';
      } else if (isMark) {
        message = 'Academic Marksheet Mismatch. Please upload the same Academic Marksheet saved in your profile.';
      } else {
        message = `${doc.documentType} Mismatch. Please upload the same ${doc.documentType} saved in your profile.`;
      }
    }

    doc.currentStatus = status;
    doc.validationResults = {
      hasMismatch: !isMatched,
      isMatched,
      status,
      message,
      profileHash: profileCert?.fileHash || '',
      appHash: doc.fileHash,
      mismatchDetails: !isMatched ? [{ field: doc.documentType, reason: message }] : [],
    };
    await doc.save();

    res.json({ success: true, status, isMatched, message, document: doc });
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
