const mongoose = require('mongoose');

const applicationSchema = new mongoose.Schema(
  {
    applicationId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    scholarshipId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Scholarship',
      required: true,
    },
    applicationData: {
      studentName: String,
      email: String,
      phone: String,
      studentIdNumber: String,
      course: String,
      academicYear: String,
      institution: String,
      percentageOrCGPA: Number,
      annualFamilyIncome: Number,
      category: String,
      gender: String,
      disabilityStatus: String,
    },
    eligibilityEvaluation: {
      isEligible: Boolean,
      reasons: [String],
      evaluatedAt: Date,
      criteriaResults: [
        {
          criterion: String,
          passed: Boolean,
          studentValue: mongoose.Schema.Types.Mixed,
          requirementValue: mongoose.Schema.Types.Mixed,
          message: String,
        },
      ],
    },
    currentStage: {
      type: String,
      enum: [
        'Draft',
        'Eligibility Evaluated',
        'Documents Uploaded',
        'Pre-Verification Completed',
        'Submitted',
        'Under Officer Verification',
        'Correction Requested',
        'Correction Resubmitted',
        'Approved',
        'Rejected',
      ],
      default: 'Draft',
    },
    status: {
      type: String,
      enum: ['draft', 'submitted', 'under_review', 'correction_required', 'approved', 'rejected'],
      default: 'draft',
    },
    assignedOfficer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    submittedAt: {
      type: Date,
    },
    finalDecision: {
      decision: {
        type: String,
        enum: ['Approved', 'Rejected', null],
        default: null,
      },
      reason: String,
      decidedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
      decidedAt: Date,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Application', applicationSchema);
