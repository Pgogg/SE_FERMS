// models/Notification.js — Stores in-app notifications (recipient_id, incident_id, type, message, read_status)
'use strict';

const { NOTIFICATION_TYPE } = require('../domain/constants');

module.exports = (sequelize, DataTypes) => {
  const Notification = sequelize.define(
    'Notification',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      recipientId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'recipient_id',
      },
      incidentId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'incident_id',
      },
      type: {
        type: DataTypes.STRING(20),
        allowNull: false,
        validate: {
          isIn: {
            args: [Object.values(NOTIFICATION_TYPE)],
            msg: `Type must be one of: ${Object.values(NOTIFICATION_TYPE).join(', ')}.`,
          },
        },
      },
      message: {
        type: DataTypes.TEXT,
        allowNull: false,
        validate: {
          notEmpty: { msg: 'Message must not be empty.' },
        },
      },
      readStatus: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        field: 'read_status',
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        field: 'created_at',
      },
    },
    {
      tableName: 'notifications',
      underscored: true,
      timestamps: true,
      updatedAt: false,
      createdAt: 'created_at',
    }
  );

  Notification.associate = (models) => {
    // Notification belongs to the recipient user
    Notification.belongsTo(models.User, {
      foreignKey: 'recipientId',
      as: 'recipient',
    });

    // Notification belongs to the related incident (nullable)
    Notification.belongsTo(models.Incident, {
      foreignKey: 'incidentId',
      as: 'incident',
    });
  };

  return Notification;
};
