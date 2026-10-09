// models/Station.js — Defines the Station model (id, name, address, lat, lng, capacity)
'use strict';

module.exports = (sequelize, DataTypes) => {
  const Station = sequelize.define('Station', {}, { tableName: 'stations' });
  Station.associate = (models) => {};
  return Station;
};
