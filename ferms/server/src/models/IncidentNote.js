// models/IncidentNote.js — Stores free-text notes attached to an incident by any responder
'use strict';

module.exports = (sequelize, DataTypes) => {
  const IncidentNote = sequelize.define('IncidentNote', {}, { tableName: 'incident_notes' });
  IncidentNote.associate = (models) => {};
  return IncidentNote;
};
