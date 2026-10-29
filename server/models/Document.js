const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema(
  {
    applicationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Application',
      required: false,
      default: null,
    },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    isProfileDocument: {
      type: Boolean,
      default: false,
    },
    version: {
      type: Number,
      default: 1,
    },
    documentType: {
      type: String,
      required: true, // e.g. 'Income Certificate', 'Mark Sheet', 'Bonafide Certificate', 'Community Certificate'
    },
    storedFileName: {
      type: String,
      required: true,
    },
    originalFileName: {
      type: String,
      required: true,
    },
    mimeType: {
      type: String,
      required: true,
    },
    fileSize: {
      type: Number,
      required: true,
    },
    fileHash: {
      type: String,
      default: '',
    },
    extractedData: {
      studentName: String,
      certificateNumber: String,
      incomeAmount: Number,
      marks: Number,
      institutionName: String,
      issueDate: String,
      rawOcrText: String,
      qrPayload: mongoose.Schema.Types.Mixed,
      extractionStatus: {
        type: String,
        enum: ['Success', 'Partial', 'Failed', 'Pending'],
        default: 'Pending',
      },
    },
    validationResults: {
      hasMismatch: { type: Boolean, default: false },
      mismatchDetails: [
        {
          field: String,
          enteredValue: mongoose.Schema.Types.Mixed,
          extractedValue: mongoose.Schema.Types.Mixed,
          reason: String,
          severity: { type: String, enum: ['High', 'Medium', 'Low'], default: 'High' },
        },
      ],
      qrVerification: {
        status: {
          type: String,
          enum: [
            'Verified Against Configured Source',
            'Information Mismatch',
            'Certificate Not Found',
            'Unable to Verify',
            'No QR Detected',
            'Manual Verification Required',
          ],
          default: 'No QR Detected',
        },
        sourceName: { type: String, default: 'Mock Government Authority Registry' },
        details: String,
      },
      preVerificationPassed: { type: Boolean, default: false },
    },
    currentStatus: {
      type: String,
      enum: [
        'Uploaded',
        'Pre-Verification Passed',
        'Mismatch Detected',
        'Manual Review Required',
        'Correction Required',
        'Officer Verified',
        'Rejected',
      ],
      default: 'Uploaded',
    },
    officerReview: {
      verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      verifiedAt: Date,
      notes: String,
      correctionReason: String,
    },
    uploadedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Document', documentSchema);
