// pages/dispatch/MonitoringDashboard/IncidentSummaryModal.jsx — Read-only incident details modal (§14.7)
import React from 'react';
import Modal from '../../../components/ui/Modal/Modal';
import Badge from '../../../components/ui/Badge/Badge';
import Button from '../../../components/ui/Button/Button';
import { useAuth } from '../../../context/AuthContext';
import styles from './IncidentSummaryModal.module.css';

/**
 * IncidentSummaryModal
 * Read-only incident view with severity, status, description, address,
 * coordinates, station, and created time.
 * Includes an empty slot for the Week 6 Reassign action (dispatch/admin).
 */
export default function IncidentSummaryModal({ incident, open, onClose }) {
  const { user } = useAuth();
  const canReassign = user && ['dispatch_operator', 'admin'].includes(user.role);

  if (!incident) return null;

  const stationName =
    incident.station?.name ||
    (incident.stationId ? `Station #${incident.stationId}` : 'Unassigned / Needs Dispatch');

  const formattedDate = incident.createdAt
    ? new Date(incident.createdAt).toLocaleString(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : '—';

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Incident #${incident.id} Details`}
      footer={
        <Button variant="ghost" size="md" onClick={onClose}>
          Close
        </Button>
      }
    >
      <div className={styles.body}>
        {/* Severity & Status badges */}
        <div className={styles.badgeRow}>
          <Badge variant="severity" value={incident.severity} />
          <Badge variant="status" value={incident.status} />
        </div>

        {/* Description */}
        <div className={styles.field}>
          <span className={styles.label}>Emergency Description</span>
          <p className={styles.descValue}>{incident.description}</p>
        </div>

        {/* Location & Address */}
        <div className={styles.field}>
          <span className={styles.label}>Location / Street Address</span>
          <p className={styles.value}>{incident.address || 'Pinned on map without street address'}</p>
        </div>

        <div className={styles.grid2}>
          {/* Coordinates */}
          <div className={styles.field}>
            <span className={styles.label}>GPS Coordinates</span>
            <span className={styles.coordsBadge}>
              {typeof incident.latitude === 'number' ? incident.latitude.toFixed(4) : incident.latitude},{' '}
              {typeof incident.longitude === 'number' ? incident.longitude.toFixed(4) : incident.longitude}
            </span>
          </div>

          {/* Assigned Station */}
          <div className={styles.field}>
            <span className={styles.label}>Assigned Station</span>
            <p className={styles.value}>{stationName}</p>
          </div>
        </div>

        {/* Timestamp */}
        <div className={styles.field}>
          <span className={styles.label}>Reported Time</span>
          <p className={styles.value}>{formattedDate}</p>
        </div>

        {/* Empty slot for Week 6 Reassign action (dispatch operators and admins) */}
        {canReassign && (
          <div className={styles.reassignSlot} id="reassign-slot">
            {/* Reassign button wired in Week 6 */}
          </div>
        )}
      </div>
    </Modal>
  );
}
