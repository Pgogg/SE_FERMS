// routes/notification.routes.js — Registers endpoints for fetching and marking notifications read
'use strict';

const router = require('express').Router();
const asyncHandler = require('../utils/asyncHandler');
const authenticate = require('../middleware/auth.middleware');
const notificationController = require('../controllers/notification.controller');

// All notification routes are authenticated
router.use(authenticate);

// GET /api/notifications (supports ?unread=true)
router.get('/', asyncHandler(notificationController.listNotifications));

// PATCH /api/notifications/read-all (MUST be declared BEFORE /:id/read)
router.patch('/read-all', asyncHandler(notificationController.markAllRead));

// PATCH /api/notifications/:id/read
router.patch('/:id/read', asyncHandler(notificationController.markRead));

module.exports = router;
