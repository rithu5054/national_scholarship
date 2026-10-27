const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema(
  {
    actorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    actorRole: {
      type: String,
      required: true,
    },
    applicationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Application',
    },
    action: {
      type: String,
      required: true, // e.g. 'APPLICATION_SUBMITTED', 'DOCUMENT_UPLOADED', 'MISMATCH_DETECTED', 'CORRECTION_REQUESTED', 'DECISION_APPROVED'
    },
    previousStatus: String,
    newStatus: String,
    reason: String,
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('AuditLog', auditLogSchema);
