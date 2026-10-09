// models/Vehicle.js — Defines the Vehicle model (id, station_id, call_sign, type, status)
'use strict';

module.exports = (sequelize, DataTypes) => {
  const Vehicle = sequelize.define('Vehicle', {}, { tableName: 'vehicles' });
  Vehicle.associate = (models) => {};
  return Vehicle;
};
