// models/IncidentVehicle.js — Join table linking incidents to assigned vehicles (incident_id, vehicle_id, assigned_at)
'use strict';

module.exports = (sequelize, DataTypes) => {
  const IncidentVehicle = sequelize.define('IncidentVehicle', {}, { tableName: 'incident_vehicles' });
  IncidentVehicle.associate = (models) => {};
  return IncidentVehicle;
};
