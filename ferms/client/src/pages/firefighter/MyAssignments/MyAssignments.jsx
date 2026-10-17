// pages/firefighter/MyAssignments/MyAssignments.jsx — Firefighter assignment list (UC-10, §7.3, §14.7)
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Truck, Clock, ChevronRight } from 'lucide-react';
import AppLayout from '../../../components/common/AppLayout/AppLayout';
import SectionHeading from '../../../components/ui/SectionHeading/SectionHeading';
import Badge from '../../../components/ui/Badge/Badge';
import Card from '../../../components/ui/Card/Card';
import Button from '../../../components/ui/Button/Button';
import Skeleton from '../../../components/ui/Skeleton/Skeleton';
import EmptyState from '../../../components/ui/EmptyState/EmptyState';
import { listAssigned } from '../../../api/incidents.api.js';
import styles from './MyAssignments.module.css';

/**
 * Formats ISO timestamp to concise relative age string (e.g. 5m ago, 2h ago)
 */
function formatAge(dateStr) {
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
  return `${diffDays}d ago`;
}

export default function MyAssignments() {
  const navigate = useNavigate();

  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchAssigned = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const envelope = await listAssigned();
      setIncidents(envelope?.data || []);
    } catch (err) {
      setError(err?.message || 'Failed to load assignments. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAssigned();
  }, [fetchAssigned]);

  return (
    <AppLayout>
      <div className={styles.container}>
        {/* Header */}
        <div className={styles.header}>
          <SectionHeading
            eyebrow="My Station"
            title="My Assignments"
            intro="Active incidents assigned to your station. Tap an incident to view details and update its status."
          />
        </div>

        {/* Loading state */}
        {loading && (
          <div className={styles.skeletonList} aria-busy="true" aria-label="Loading assignments">
            {[1, 2, 3].map((n) => (
              <div key={n} className={styles.skeletonCard}>
                <Skeleton lines={4} />
              </div>
            ))}
          </div>
        )}

        {/* Error state */}
        {!loading && error && (
          <Card variant="warm" className={styles.errorCard}>
            <p className={styles.errorMsg}>{error}</p>
            <Button variant="ghost" size="md" onClick={fetchAssigned}>
              Retry
            </Button>
          </Card>
        )}

        {/* Empty state */}
        {!loading && !error && incidents.length === 0 && (
          <EmptyState
            title="No active assignments"
            description="There are no incidents currently assigned to your station. Check back when a dispatch is made."
          />
        )}

        {/* Assignment cards */}
        {!loading && !error && incidents.length > 0 && (
          <div className={styles.list}>
            {incidents.map((incident) => (
              <article
                key={incident.id}
                className={styles.card}
                role="link"
                tabIndex={0}
                onClick={() => navigate(`/assignments/${incident.id}`)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    navigate(`/assignments/${incident.id}`);
                  }
                }}
                aria-label={`Incident #${incident.id}: ${incident.description}`}
              >
                {/* Top: badges + age */}
                <div className={styles.cardTop}>
                  <div className={styles.badgeRow}>
                    <Badge variant="severity" value={incident.severity} />
                    <Badge variant="status" value={incident.status} />
                  </div>
                  <span className={styles.cardAge} aria-label={`Reported ${formatAge(incident.createdAt)}`}>
                    <Clock size={12} style={{ display: 'inline', marginRight: 3 }} aria-hidden="true" />
                    {formatAge(incident.createdAt)}
                  </span>
                </div>

                {/* Description */}
                <p className={styles.cardDesc}>{incident.description}</p>

                {/* Address */}
                {incident.address && (
                  <p className={styles.cardAddr}>
                    <MapPin size={12} style={{ display: 'inline', marginRight: 3 }} aria-hidden="true" />
                    {incident.address}
                  </p>
                )}

                {/* Meta row */}
                <div className={styles.cardMeta}>
                  {incident.station?.name && (
                    <span className={styles.metaItem}>
                      <span className={styles.metaIcon} aria-hidden="true">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="3" y="10" width="18" height="11" rx="2" />
                          <path d="M7 21V10l5-7 5 7v11" />
                          <path d="M10 21v-6h4v6" />
                        </svg>
                      </span>
                      {incident.station.name}
                    </span>
                  )}

                  <span className={styles.metaItem}>
                    <Truck size={13} className={styles.metaIcon} aria-hidden="true" />
                    {Array.isArray(incident.vehicles) && incident.vehicles.length > 0
                      ? `${incident.vehicles.length} vehicle${incident.vehicles.length > 1 ? 's' : ''} assigned`
                      : 'No vehicle detail'}
                  </span>

                  <ChevronRight size={16} className={styles.cardArrow} aria-hidden="true" />
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
