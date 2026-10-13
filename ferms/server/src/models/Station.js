// models/Station.js — Defines the Station model (id, name, address, latitude, longitude, contact, created_at)
'use strict';

module.exports = (sequelize, DataTypes) => {
  const Station = sequelize.define(
    'Station',
    {
      id: {
        type:          DataTypes.INTEGER,
        primaryKey:    true,
        autoIncrement: true,
      },
      name: {
        type:      DataTypes.STRING(150),
        allowNull: false,
        validate: {
          notEmpty: { msg: 'Station name must not be empty.' },
          len:      { args: [1, 150], msg: 'Station name must be between 1 and 150 characters.' },
        },
      },
      address: {
        type:      DataTypes.STRING(255),
        allowNull: false,
        validate: {
          notEmpty: { msg: 'Station address must not be empty.' },
        },
      },
      latitude: {
        type:      DataTypes.DOUBLE,
        allowNull: false,
        validate: {
          min:     { args: [-90], msg: 'Latitude must be >= -90.' },
          max:     { args: [90],  msg: 'Latitude must be <= 90.' },
          isFloat: { msg: 'Latitude must be a valid number.' },
        },
      },
      longitude: {
        type:      DataTypes.DOUBLE,
        allowNull: false,
        validate: {
          min:     { args: [-180], msg: 'Longitude must be >= -180.' },
          max:     { args: [180],  msg: 'Longitude must be <= 180.' },
          isFloat: { msg: 'Longitude must be a valid number.' },
        },
      },
      contact: {
        type:      DataTypes.STRING(100),
        allowNull: true,
      },
      createdAt: {
        type:      DataTypes.DATE,
        allowNull: false,
        field:     'created_at',
      },
    },
    {
      tableName:   'stations',
      underscored: true,
      timestamps:  true,
      updatedAt:   false,
      createdAt:   'created_at',
    }
  );

  Station.associate = (models) => {
    // Station has many Vehicles
    if (models.Vehicle) {
      Station.hasMany(models.Vehicle, {
        foreignKey: 'stationId',
        as:         'vehicles',
      });
    }

    // Station has many Users (personnel)
    if (models.User) {
      Station.hasMany(models.User, {
        foreignKey: 'stationId',
        as:         'users',
      });
    }

    // Station has many Incidents
    if (models.Incident) {
      Station.hasMany(models.Incident, {
        foreignKey: 'stationId',
        as:         'incidents',
      });
    }
  };

  return Station;
};
