// client/src/constants.js — Frontend constants for roles, statuses, severities, routing, and emergency numbers
'use strict';

export const ROLES = Object.freeze({
  CITIZEN:           'citizen',
  DISPATCH_OPERATOR: 'dispatch_operator',
  FIREFIGHTER:       'firefighter',
  STATION_OFFICER:   'station_officer',
  ADMIN:             'admin',
});

export const INCIDENT_STATUS = Object.freeze({
  REPORTED:    'reported',
  UNASSIGNED:  'unassigned',
  ASSIGNED:    'assigned',
  IN_PROGRESS: 'in_progress',
  RESOLVED:    'resolved',
  CLOSED:      'closed',
});

export const SEVERITY = Object.freeze({
  LOW:      'low',
  MEDIUM:   'medium',
  HIGH:     'high',
  CRITICAL: 'critical',
});

export const VEHICLE_STATUS = Object.freeze({
  AVAILABLE:   'available',
  DISPATCHED:  'dispatched',
  MAINTENANCE: 'maintenance',
});

/** Role-to-home route mappings per CONVENTIONS §6 */
export const ROLE_HOME = Object.freeze({
  [ROLES.CITIZEN]:           '/report',
  [ROLES.DISPATCH_OPERATOR]: '/dashboard',
  [ROLES.FIREFIGHTER]:       '/assignments',
  [ROLES.STATION_OFFICER]:   '/dashboard',
  [ROLES.ADMIN]:             '/dashboard',
});

/** Emergency telephone contact numbers */
export const EMERGENCY_NUMBERS = Object.freeze({
  fire:    '101',
  general: '112',
});

/** Route access control mapping protected path -> allowed roles */
export const ROUTE_ACCESS = Object.freeze({
  '/report':           Object.freeze([ROLES.CITIZEN]),
  '/my-reports':       Object.freeze([ROLES.CITIZEN]),
  '/dashboard':        Object.freeze([ROLES.DISPATCH_OPERATOR, ROLES.STATION_OFFICER, ROLES.ADMIN]),
  '/assignments':      Object.freeze([ROLES.FIREFIGHTER, ROLES.STATION_OFFICER]),
  '/assignments/:id':  Object.freeze([ROLES.FIREFIGHTER, ROLES.STATION_OFFICER]),
  '/station':          Object.freeze([ROLES.STATION_OFFICER, ROLES.ADMIN]),
  '/admin/users':      Object.freeze([ROLES.ADMIN]),
  '/admin/stations':   Object.freeze([ROLES.ADMIN]),
});
