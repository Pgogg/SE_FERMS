// models/User.js — Defines the User model (id, name, email, password_hash, role, station_id, on_duty, account_status)
'use strict';

const { ROLES } = require('../domain/constants');

// account_status values (not in constants.js — defined locally per §4.1)
const ACCOUNT_STATUS_VALUES = ['active', 'inactive'];

module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define(
    'User',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      name: {
        type: DataTypes.STRING(100),
        allowNull: false,
        validate: {
          notEmpty: { msg: 'Name must not be empty.' },
          len: { args: [1, 100], msg: 'Name must be between 1 and 100 characters.' },
        },
      },
      email: {
        type: DataTypes.STRING(150),
        allowNull: false,
        unique: true,
        validate: {
          isEmail: { msg: 'Must be a valid email address.' },
          notEmpty: { msg: 'Email must not be empty.' },
        },
      },
      phone: {
        type: DataTypes.STRING(20),
        allowNull: true,
      },
      passwordHash: {
        type: DataTypes.STRING(255),
        allowNull: false,
        field: 'password_hash',
      },
      role: {
        type: DataTypes.STRING(20),
        allowNull: false,
        validate: {
          isIn: {
            args: [Object.values(ROLES)],
            msg: `Role must be one of: ${Object.values(ROLES).join(', ')}.`,
          },
        },
      },
      stationId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'station_id',
      },
      onDuty: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        field: 'on_duty',
      },
      accountStatus: {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: 'active',
        field: 'account_status',
        validate: {
          isIn: {
            args: [ACCOUNT_STATUS_VALUES],
            msg: `Account status must be one of: ${ACCOUNT_STATUS_VALUES.join(', ')}.`,
          },
        },
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        field: 'created_at',
      },
    },
    {
      tableName: 'users',
      underscored: true,
      timestamps: true,       // Sequelize manages createdAt
      updatedAt: false,       // no updated_at column on users
      createdAt: 'created_at',
      defaultScope: {
        attributes: { exclude: ['passwordHash'] },
      },
    }
  );

  // Scope that includes passwordHash (used by auth service only)
  User.addScope('withPassword', { attributes: { include: ['passwordHash'] } });

  User.associate = (models) => {
    // User belongs to a Station (nullable for citizens)
    User.belongsTo(models.Station, {
      foreignKey: 'stationId',
      as: 'station',
    });

    // A user can report many incidents
    User.hasMany(models.Incident, {
      foreignKey: 'reporterId',
      as: 'reportedIncidents',
    });

    // A user can receive many notifications
    User.hasMany(models.Notification, {
      foreignKey: 'recipientId',
      as: 'notifications',
    });
  };

  return User;
};
