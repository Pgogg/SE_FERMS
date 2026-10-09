// models/IncidentStatusHistory.js — Records every status transition for an incident (incident_id, from_status, to_status, changed_by)
'use strict';

module.exports = (sequelize, DataTypes) => {
  const IncidentStatusHistory = sequelize.define('IncidentStatusHistory', {}, { tableName: 'incident_status_history' });
  IncidentStatusHistory.associate = (models) => {};
  return IncidentStatusHistory;
};
