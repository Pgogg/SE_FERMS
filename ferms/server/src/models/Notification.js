// models/Notification.js — Stores in-app notifications sent to users (user_id, type, payload, read)
'use strict';

module.exports = (sequelize, DataTypes) => {
  const Notification = sequelize.define('Notification', {}, { tableName: 'notifications' });
  Notification.associate = (models) => {};
  return Notification;
};
