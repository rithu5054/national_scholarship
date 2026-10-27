const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const Document = require('../models/Document');
const DocumentVersion = require('../models/DocumentVersion');
const Application = require('../models/Application');
const {
  scanQRCode,
  extractOCR,
  parseDocumentFields,
  detectMismatches,
} = require('../services/documentProcessor');
const { logAudit, createNotification } = require('../services/auditService');

// Upload or Replace Document
const uploadDocument = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Please attach a document file.' });
    }

    const { applicationId, documentType, mockSimulatedFields } = req.body;
    if (!applicationId || !documentType) {
      return res.status(400).json({ success: false, message: 'Application ID and Document Type are required.' });
    }

    const application = await Application.findById(applicationId);
    if (!application) {
      return res.status(404).json({ success: false, message: 'Application not found.' });
    }

    if (String(application.studentId) !== String(req.user._id) && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Unauthorized.' });
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

    // If caller provided mock simulated fields for demonstration testing (e.g., simulating scanned certificates with preset values)
    if (mockSimulatedFields) {
      try {
        const parsedMock = typeof mockSimulatedFields === 'string' ? JSON.parse(mockSimulatedFields) : mockSimulatedFields;
        extractedFields = { ...extractedFields, ...parsedMock };
      } catch (e) {}
    }

    extractedFields.rawOcrText = ocrResult.text ? ocrResult.text.slice(0, 1000) : '';
    extractedFields.qrPayload = qrResult.data || null;
    extractedFields.extractionStatus = (ocrResult.success || qrResult.detected || extractedFields.certificateNumber) ? 'Success' : 'Partial';

    // 4. Run Core Novelty: Automatic Mismatch Detection
    const validation = await detectMismatches(application.applicationData, extractedFields, documentType);

    // Determine currentStatus
    let docStatus = 'Uploaded';
    if (validation.hasMismatch) {
      docStatus = 'Mismatch Detected';
    } else {
      docStatus = 'Pre-Verification Passed';
    }

    // Check if an existing document record already exists (Replacement workflow)
    let doc = await Document.findOne({ applicationId, documentType });
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
        correctionReason: 'Document replaced with updated copy',
      });

      doc.storedFileName = req.file.filename;
      doc.originalFileName = req.file.originalname;
      doc.mimeType = req.file.mimetype;
      doc.fileSize = req.file.size;
      doc.fileHash = fileHash;
      doc.extractedData = extractedFields;
      doc.validationResults = validation;
      doc.currentStatus = docStatus;
      doc.uploadedAt = new Date();
      await doc.save();
    } else {
      doc = new Document({
        applicationId,
        studentId: req.user._id,
        documentType,
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

    // Update application stage if pre-verification completed
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

    res.status(201).json({
      success: true,
      message: validation.hasMismatch
        ? 'Document uploaded. Potential mismatch detected during pre-verification!'
        : 'Document uploaded and passed pre-verification checks.',
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
    doc.currentStatus = validation.hasMismatch ? 'Mismatch Detected' : 'Pre-Verification Passed';
    await doc.save();

    res.json({ success: true, document: doc });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Re-validation failed.', error: err.message });
  }
};

module.exports = {
  uploadDocument,
  getDocumentFile,
  revalidateDocument,
};
