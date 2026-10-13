// models/IncidentStatusHistory.js — Records every status transition for an incident (§4.5)
'use strict';

const { INCIDENT_STATUS } = require('../domain/constants');

module.exports = (sequelize, DataTypes) => {
  const IncidentStatusHistory = sequelize.define(
    'IncidentStatusHistory',
    {
      id: {
        type:          DataTypes.INTEGER,
        primaryKey:    true,
        autoIncrement: true,
      },
      incidentId: {
        type:      DataTypes.INTEGER,
        allowNull: false,
        field:     'incident_id',
      },
      status: {
        type:      DataTypes.STRING(20),
        allowNull: false,
        validate: {
          isIn: {
            args: [Object.values(INCIDENT_STATUS)],
            msg:  `Status must be one of: ${Object.values(INCIDENT_STATUS).join(', ')}.`,
          },
        },
      },
      changedBy: {
        type:      DataTypes.INTEGER,
        allowNull: true,
        field:     'changed_by',
      },
      changedAt: {
        type:      DataTypes.DATE,
        allowNull: false,
        field:     'changed_at',
      },
    },
    {
      tableName:   'incident_status_history',
      underscored: true,
      timestamps:  true,
      updatedAt:   false,
      createdAt:   'changed_at',
    }
  );

  IncidentStatusHistory.associate = (models) => {
    // IncidentStatusHistory belongs to an Incident
    if (models.Incident) {
      IncidentStatusHistory.belongsTo(models.Incident, {
        foreignKey: 'incidentId',
        as:         'incident',
      });
    }

    // IncidentStatusHistory belongs to the User who made the change (or null)
    if (models.User) {
      IncidentStatusHistory.belongsTo(models.User, {
        foreignKey: 'changedBy',
        as:         'changedByUser',
      });
    }
  };

  return IncidentStatusHistory;
};
