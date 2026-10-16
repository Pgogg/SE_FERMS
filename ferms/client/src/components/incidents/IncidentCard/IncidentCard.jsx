// components/incidents/IncidentCard/IncidentCard.jsx — Summary card for an incident with live status Stepper and badges
import React from 'react';
import { MapPin, Shield, Clock } from 'lucide-react';
import Card from '../../ui/Card/Card';
import Badge from '../../ui/Badge/Badge';
import Stepper from '../../ui/Stepper/Stepper';
import styles from './IncidentCard.module.css';

/**
 * Incident life-cycle steps per Requirement 2
 */
const INCIDENT_STEPS = [
  { key: 'reported', label: 'Reported' },
  { key: 'assigned', label: 'Assigned' },
  { key: 'in_progress', label: 'In progress' },
  { key: 'resolved', label: 'Resolved' },
  { key: 'closed', label: 'Closed' },
];

/**
 * Formats a date string into a concise relative time string (e.g., '5m ago', '2h ago')
 */
function formatRelativeTime(dateStr) {
  if (!dateStr) return '—';
  const diffMs = Date.now() - new Date(dateStr).getTime();
  if (diffMs < 0) return 'Just now';
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return new Date(dateStr).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}

export default function IncidentCard({ incident, className = '' }) {
  if (!incident) return null;

  // Requirement 2: unassigned shows as Reported on the Stepper with the 'Needs dispatch' Badge
  const stepperKey = incident.status === 'unassigned' ? 'reported' : incident.status;

  const exactTime = incident.createdAt ? new Date(incident.createdAt).toLocaleString() : '';
  const relativeTime = formatRelativeTime(incident.createdAt);

  const locationDisplay = incident.address
    ? incident.address
    : incident.latitude != null && incident.longitude != null
      ? `Lat: ${Number(incident.latitude).toFixed(4)}, Lon: ${Number(incident.longitude).toFixed(4)}`
      : 'Location unspecified';

  const stationName = incident.station?.name
    ? incident.station.name
    : incident.status === 'unassigned'
      ? 'Awaiting dispatch'
      : incident.stationId
        ? `Station #${incident.stationId}`
        : 'Assigned shortly';

  return (
    <Card variant="light" className={`${styles.card} ${className}`}>
      {/* Top Header: ID, Badges, Time */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <span className={styles.incidentId}>#{incident.id}</span>
          <Badge variant="severity" value={incident.severity} />
          <Badge variant="status" value={incident.status} />
        </div>

        <div className={styles.headerRight}>
          <time
            dateTime={incident.createdAt}
            title={exactTime}
            className={styles.timeTag}
          >
            <Clock size={14} className={styles.clockIcon} aria-hidden="true" />
            <span>{relativeTime}</span>
          </time>
        </div>
      </div>

      {/* Life-cycle Stepper per Requirement 2 */}
      <div className={styles.stepperContainer}>
        <Stepper
          steps={INCIDENT_STEPS}
          currentKey={stepperKey}
          className={styles.stepper}
        />
      </div>

      {/* Meta Info: Location & Assigned Station */}
      <div className={styles.metaGrid}>
        <div className={styles.metaItem}>
          <MapPin size={16} className={styles.metaIcon} aria-hidden="true" />
          <span className={styles.metaText} title={locationDisplay}>
            {locationDisplay}
          </span>
        </div>

        <div className={styles.metaItem}>
          <Shield size={16} className={styles.metaIcon} aria-hidden="true" />
          <span className={styles.metaText}>
            Station: <strong>{stationName}</strong>
          </span>
        </div>
      </div>

      {/* Description: clamped to 3 lines per Requirement 1 */}
      {incident.description && (
        <p className={styles.description} title={incident.description}>
          {incident.description}
        </p>
      )}

      {/* Closing Summary if resolved/closed */}
      {incident.closingSummary && (
        <div className={styles.closingBox}>
          <strong>Closing summary:</strong> {incident.closingSummary}
        </div>
      )}
    </Card>
  );
}
