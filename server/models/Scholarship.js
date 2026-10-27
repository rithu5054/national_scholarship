const mongoose = require('mongoose');

const scholarshipSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    provider: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    eligibilityCriteria: {
      minPercentage: { type: Number, default: 0 },
      maxIncome: { type: Number, default: Infinity },
      eligibleCourses: [{ type: String }], // empty means all
      eligibleCategories: [{ type: String }], // empty means all
      eligibleGenders: [{ type: String }], // empty means all
      eligibleAcademicYears: [{ type: String }], // empty means all
      minAge: { type: Number, default: 0 },
      maxAge: { type: Number, default: 100 },
      disabilityRequirement: { type: String, default: 'Any' }, // 'Any', 'Yes', 'No'
    },
    requiredDocuments: [
      {
        documentType: { type: String, required: true }, // e.g., 'Income Certificate', 'Mark Sheet'
        isRequired: { type: Boolean, default: true },
        description: { type: String, default: '' },
      },
    ],
    applicationDeadline: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'closed'],
      default: 'active',
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Scholarship', scholarshipSchema);
