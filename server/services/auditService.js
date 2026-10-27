const AuditLog = require('../models/AuditLog');
const Notification = require('../models/Notification');

const logAudit = async ({
  actorId,
  actorRole,
  applicationId = null,
  action,
  previousStatus = null,
  newStatus = null,
  reason = null,
}) => {
  try {
    const log = new AuditLog({
      actorId,
      actorRole,
      applicationId,
      action,
      previousStatus,
      newStatus,
      reason,
      timestamp: new Date(),
    });
    await log.save();
    return log;
  } catch (err) {
    console.error('[AuditService] Failed to record audit log:', err.message);
  }
};

const createNotification = async ({
  userId,
  message,
  type = 'info',
  applicationId = null,
}) => {
  try {
    const notification = new Notification({
      userId,
      message,
      type,
      applicationId,
      isRead: false,
    });
    await notification.save();
    return notification;
  } catch (err) {
    console.error('[AuditService] Failed to create notification:', err.message);
  }
};

module.exports = { logAudit, createNotification };
