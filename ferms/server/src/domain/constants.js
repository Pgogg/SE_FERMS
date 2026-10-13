// domain/constants.js — Domain constants: roles, statuses, severities, vehicle states, and notification types
// Values are frozen so no one can mutate them at runtime.

const ROLES = Object.freeze({
  CITIZEN:           'citizen',
  DISPATCH_OPERATOR: 'dispatch_operator',
  FIREFIGHTER:       'firefighter',
  STATION_OFFICER:   'station_officer',
  ADMIN:             'admin',
});

const INCIDENT_STATUS = Object.freeze({
  REPORTED:    'reported',
  UNASSIGNED:  'unassigned',
  ASSIGNED:    'assigned',
  IN_PROGRESS: 'in_progress',
  RESOLVED:    'resolved',
  CLOSED:      'closed',
});

const SEVERITY = Object.freeze({
  LOW:      'low',
  MEDIUM:   'medium',
  HIGH:     'high',
  CRITICAL: 'critical',
});

const VEHICLE_STATUS = Object.freeze({
  AVAILABLE:   'available',
  DISPATCHED:  'dispatched',
  MAINTENANCE: 'maintenance',
});

const NOTIFICATION_TYPE = Object.freeze({
  DISPATCH:      'dispatch',
  STATUS_UPDATE: 'status_update',
  SYSTEM:        'system',
});

module.exports = {
  ROLES,
  INCIDENT_STATUS,
  SEVERITY,
  VEHICLE_STATUS,
  NOTIFICATION_TYPE,
};
