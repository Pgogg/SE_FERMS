// models/Vehicle.js — Defines the Vehicle model (id, type, registration_no, status, station_id)
'use strict';

const { VEHICLE_STATUS } = require('../domain/constants');

module.exports = (sequelize, DataTypes) => {
  const Vehicle = sequelize.define(
    'Vehicle',
    {
      id: {
        type:          DataTypes.INTEGER,
        primaryKey:    true,
        autoIncrement: true,
      },
      type: {
        type:      DataTypes.STRING(50),
        allowNull: false,
        validate: {
          notEmpty: { msg: 'Vehicle type must not be empty.' },
        },
      },
      registrationNo: {
        type:      DataTypes.STRING(30),
        allowNull: false,
        unique:    true,
        field:     'registration_no',
        validate: {
          notEmpty: { msg: 'Registration number must not be empty.' },
        },
      },
      status: {
        type:         DataTypes.STRING(20),
        allowNull:    false,
        defaultValue: VEHICLE_STATUS.AVAILABLE,
        validate: {
          isIn: {
            args: [Object.values(VEHICLE_STATUS)],
            msg:  `Vehicle status must be one of: ${Object.values(VEHICLE_STATUS).join(', ')}.`,
          },
        },
      },
      stationId: {
        type:      DataTypes.INTEGER,
        allowNull: false,
        field:     'station_id',
      },
    },
    {
      tableName:   'vehicles',
      underscored: true,
      timestamps:  false,
    }
  );

  Vehicle.associate = (models) => {
    // Vehicle belongs to a Station
    if (models.Station) {
      Vehicle.belongsTo(models.Station, {
        foreignKey: 'stationId',
        as:         'station',
      });
    }

    // Vehicle belongs to many Incidents through IncidentVehicle
    if (models.Incident && models.IncidentVehicle) {
      Vehicle.belongsToMany(models.Incident, {
        through:  models.IncidentVehicle,
        foreignKey: 'vehicleId',
        otherKey:   'incidentId',
        as:         'incidents',
      });
    }

    if (models.IncidentVehicle) {
      Vehicle.hasMany(models.IncidentVehicle, {
        foreignKey: 'vehicleId',
        as:         'incidentVehicles',
      });
    }
  };

  return Vehicle;
};
