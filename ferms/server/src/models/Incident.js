// models/Incident.js — Defines the Incident model (id, reporter_id, lat, lng, address, description, severity, status, station_id, closing_summary, created_at, updated_at)
'use strict';

const { INCIDENT_STATUS, SEVERITY } = require('../domain/constants');

module.exports = (sequelize, DataTypes) => {
  const Incident = sequelize.define(
    'Incident',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      reporterId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'reporter_id',
      },
      latitude: {
        type: DataTypes.DOUBLE,
        allowNull: false,
        validate: {
          min: { args: [-90], msg: 'Latitude must be >= -90.' },
          max: { args: [90],  msg: 'Latitude must be <= 90.'  },
          isFloat: { msg: 'Latitude must be a number.' },
        },
      },
      longitude: {
        type: DataTypes.DOUBLE,
        allowNull: false,
        validate: {
          min: { args: [-180], msg: 'Longitude must be >= -180.' },
          max: { args: [180],  msg: 'Longitude must be <= 180.'  },
          isFloat: { msg: 'Longitude must be a number.' },
        },
      },
      address: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: false,
        validate: {
          notEmpty: { msg: 'Description must not be empty.' },
        },
      },
      severity: {
        type: DataTypes.STRING(10),
        allowNull: false,
        validate: {
          isIn: {
            args: [Object.values(SEVERITY)],
            msg: `Severity must be one of: ${Object.values(SEVERITY).join(', ')}.`,
          },
        },
      },
      status: {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: INCIDENT_STATUS.REPORTED,
        validate: {
          isIn: {
            args: [Object.values(INCIDENT_STATUS)],
            msg: `Status must be one of: ${Object.values(INCIDENT_STATUS).join(', ')}.`,
          },
        },
      },
      stationId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'station_id',
      },
      closingSummary: {
        type: DataTypes.TEXT,
        allowNull: true,
        field: 'closing_summary',
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        field: 'created_at',
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        field: 'updated_at',
      },
    },
    {
      tableName: 'incidents',
      underscored: true,
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    }
  );

  Incident.associate = (models) => {
    // Reporter
    Incident.belongsTo(models.User, {
      foreignKey: 'reporterId',
      as: 'reporter',
    });

    // Assigned station
    Incident.belongsTo(models.Station, {
      foreignKey: 'stationId',
      as: 'station',
    });

    // Status history (Vedant's model — guarded so index.js doesn't crash when absent)
    if (models.IncidentStatusHistory) {
      Incident.hasMany(models.IncidentStatusHistory, {
        foreignKey: 'incidentId',
        as: 'statusHistory',
      });
    }

    // Notes (Vedant's model)
    if (models.IncidentNote) {
      Incident.hasMany(models.IncidentNote, {
        foreignKey: 'incidentId',
        as: 'notes',
      });
    }

    // Vehicles through junction (Vedant's models)
    if (models.Vehicle && models.IncidentVehicle) {
      Incident.belongsToMany(models.Vehicle, {
        through: models.IncidentVehicle,
        foreignKey: 'incidentId',
        otherKey: 'vehicleId',
        as: 'vehicles',
      });
    }
  };

  return Incident;
};
