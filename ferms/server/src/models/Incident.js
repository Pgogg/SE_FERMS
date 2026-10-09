// models/Incident.js — Defines the Incident model (id, reporter_id, title, description, severity, status, lat, lng)
'use strict';

module.exports = (sequelize, DataTypes) => {
  const Incident = sequelize.define('Incident', {}, { tableName: 'incidents' });
  Incident.associate = (models) => {};
  return Incident;
};
