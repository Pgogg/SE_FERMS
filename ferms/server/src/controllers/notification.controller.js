// controllers/notification.controller.js — Handles fetching and marking notifications as read for the current user
'use strict';

const { Notification } = require('../models');
const { AppError } = require('../middleware/error.middleware');

/**
 * GET /api/notifications
 * Lists notifications for the authenticated caller.
 * Supports ?unread=true filter and returns meta.unreadCount.
 * Ordered newest first (createdAt DESC, id DESC).
 */
const listNotifications = async (req, res) => {
  const userId = req.user.id;
  const unreadOnly = req.query.unread === 'true';

  const where = { recipientId: userId };
  if (unreadOnly) {
    where.readStatus = false;
  }

  const [notifications, unreadCount] = await Promise.all([
    Notification.findAll({
      where,
      order: [
        ['createdAt', 'DESC'],
        ['id', 'DESC'],
      ],
    }),
    Notification.count({
      where: {
        recipientId: userId,
        readStatus: false,
      },
    }),
  ]);

  return res.json({
    data: notifications,
    meta: {
      count: notifications.length,
      unreadCount,
    },
  });
};

/**
 * PATCH /api/notifications/read-all
 * Marks all unread notifications for the calling user as read.
 */
const markAllRead = async (req, res) => {
  const userId = req.user.id;

  await Notification.update(
    { readStatus: true },
    {
      where: {
        recipientId: userId,
        readStatus: false,
      },
    }
  );

  return res.json({
    data: {
      message: 'All notifications marked read.',
    },
  });
};

/**
 * PATCH /api/notifications/:id/read
 * Marks a single notification as read.
 * Only the owner may mark a notification read, returns 404 otherwise.
 */
const markRead = async (req, res) => {
  const userId = req.user.id;
  const id = parseInt(req.params.id, 10);

  if (Number.isNaN(id) || id <= 0) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Invalid notification id.');
  }

  const notification = await Notification.findOne({
    where: {
      id,
      recipientId: userId,
    },
  });

  if (!notification) {
    throw new AppError(404, 'NOT_FOUND', 'Notification not found.');
  }

  if (!notification.readStatus) {
    notification.readStatus = true;
    await notification.save();
  }

  return res.json({
    data: notification,
  });
};

module.exports = {
  listNotifications,
  markAllRead,
  markRead,
};
