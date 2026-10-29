const mongoose = require('mongoose');

const studentProfileSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    studentId: {
      type: String,
      trim: true,
      default: '',
    },
    dateOfBirth: {
      type: String,
      default: '',
    },
    gender: {
      type: String,
      enum: ['Male', 'Female', 'Other', 'Prefer not to say', ''],
      default: '',
    },
    category: {
      type: String,
      enum: ['General', 'OBC', 'SC', 'ST', 'EWS', 'Other', ''],
      default: 'General',
    },
    course: {
      type: String,
      trim: true,
      default: '',
    },
    academicYear: {
      type: String,
      trim: true,
      default: '',
    },
    institution: {
      type: String,
      trim: true,
      default: '',
    },
    percentageOrCGPA: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
    annualFamilyIncome: {
      type: Number,
      min: 0,
      default: 0,
    },
    disabilityStatus: {
      type: String,
      enum: ['Yes', 'No', ''],
      default: 'No',
    },
    profileCompletionStatus: {
      type: Boolean,
      default: false,
    },
    certificates: [
      {
        documentType: {
          type: String,
          required: true,
        },
        documentId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Document',
        },
        storedFileName: String,
        originalFileName: String,
        mimeType: String,
        fileSize: Number,
        fileHash: String,
        uploadDate: {
          type: Date,
          default: Date.now,
        },
        version: {
          type: Number,
          default: 1,
        },
        extractedData: mongoose.Schema.Types.Mixed,
        validationResults: mongoose.Schema.Types.Mixed,
        verificationStatus: {
          type: String,
          enum: [
            'Not Uploaded',
            'Uploaded',
            'MATCHED',
            'MISMATCH',
            'Pending Verification',
            'Verified',
            'Mismatch Detected',
            'Manual Review Required',
          ],
          default: 'Uploaded',
        },
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model('StudentProfile', studentProfileSchema);
