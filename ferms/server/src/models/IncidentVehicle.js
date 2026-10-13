// models/IncidentVehicle.js — Join table linking incidents to assigned vehicles (§4.7)
'use strict';

module.exports = (sequelize, DataTypes) => {
  const IncidentVehicle = sequelize.define(
    'IncidentVehicle',
    {
      incidentId: {
        type:       DataTypes.INTEGER,
        primaryKey: true,
        allowNull:  false,
        field:      'incident_id',
      },
      vehicleId: {
        type:       DataTypes.INTEGER,
        primaryKey: true,
        allowNull:  false,
        field:      'vehicle_id',
      },
      assignedAt: {
        type:      DataTypes.DATE,
        allowNull: false,
        field:     'assigned_at',
      },
      releasedAt: {
        type:      DataTypes.DATE,
        allowNull: true,
        field:     'released_at',
      },
    },
    {
      tableName:   'incident_vehicles',
      underscored: true,
      timestamps:  true,
      updatedAt:   false,
      createdAt:   'assigned_at',
    }
  );

  IncidentVehicle.associate = (models) => {
    // IncidentVehicle belongs to Incident
    if (models.Incident) {
      IncidentVehicle.belongsTo(models.Incident, {
        foreignKey: 'incidentId',
        as:         'incident',
      });
    }

    // IncidentVehicle belongs to Vehicle
    if (models.Vehicle) {
      IncidentVehicle.belongsTo(models.Vehicle, {
        foreignKey: 'vehicleId',
        as:         'vehicle',
      });
    }
  };

  return IncidentVehicle;
};
