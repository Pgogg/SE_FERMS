import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { PlusCircle, RefreshCw, AlertTriangle } from 'lucide-react';
import AppLayout from '../../../components/common/AppLayout/AppLayout';
import SectionHeading from '../../../components/ui/SectionHeading/SectionHeading';
import Button from '../../../components/ui/Button/Button';
import Skeleton from '../../../components/ui/Skeleton/Skeleton';
import EmptyState from '../../../components/ui/EmptyState/EmptyState';
import IncidentCard from '../../../components/incidents/IncidentCard/IncidentCard';
import { useToast } from '../../../components/ui/Toast/Toast';
import { useSocketEvent } from '../../../hooks/useSocketEvent';
import { useOnReconnect } from '../../../context/SocketContext';
import { myIncidents } from '../../../api/incidents.api';
import styles from './MyReports.module.css';

const STATUS_LABELS = {
  reported: 'Reported',
  unassigned: 'Needs dispatch',
  assigned: 'Assigned',
  in_progress: 'In progress',
  resolved: 'Resolved',
  closed: 'Closed',
};

function formatStatus(status) {
  if (!status) return 'Updated';
  return (
    STATUS_LABELS[status] ||
    status
      .split('_')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ')
  );
}

export default function MyReports() {
  const location = useLocation();
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [highlightedId, setHighlightedId] = useState(null);

  const toast = useToast();
  const incidentsRef = useRef(incidents);
  const highlightTimerRef = useRef(null);

  useEffect(() => {
    incidentsRef.current = incidents;
  }, [incidents]);

  // Handle click-through from NotificationBell via location.state.highlightId
  useEffect(() => {
    if (location.state?.highlightId && incidents.length > 0) {
      const targetId = Number(location.state.highlightId);
      setHighlightedId(targetId);

      const timer = setTimeout(() => {
        const el = document.getElementById(`incident-${targetId}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);

      if (highlightTimerRef.current) {
        clearTimeout(highlightTimerRef.current);
      }
      highlightTimerRef.current = setTimeout(() => {
        setHighlightedId(null);
      }, 3500);

      return () => clearTimeout(timer);
    }
  }, [location.state, incidents]);

  useEffect(() => {
    return () => {
      if (highlightTimerRef.current) {
        clearTimeout(highlightTimerRef.current);
      }
    };
  }, []);

  /**
   * Fetches the calling citizen's incidents
   */
  const loadReports = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setIsRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const response = await myIncidents();
      const rawData = response?.data;
      const list = Array.isArray(rawData)
        ? rawData
        : Array.isArray(rawData?.incidents)
          ? rawData.incidents
          : [];

      setIncidents(list);
    } catch (err) {
      if (!navigator.onLine || err.code === 'NETWORK_ERROR' || /network/i.test(err.message)) {
        setError('Network connection failed. Please check your internet connection and retry.');
      } else {
        setError(err.message || 'Failed to load your incident reports. Please try again.');
      }
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  // Requirement 2: Re-fetch reports list on socket reconnection so nothing is missed (§7.5, Reliability-1)
  useOnReconnect(() => {
    loadReports(true);
  });

  // Requirement 1 & 3: Subscribe to live incident:updated events and update in place
  useSocketEvent('incident:updated', (payload) => {
    const updated = payload?.incident || payload;
    if (!updated?.id) return;

    const existing = incidentsRef.current.find(
      (item) => Number(item.id) === Number(updated.id)
    );

    // Requirement 1: ignore incidents that are not in the list
    if (!existing) {
      return;
    }

    // Requirement 3: Show a Toast like 'Your report #12 is now In progress'
    const statusLabel = formatStatus(updated.status);
    toast.show({
      type: 'info',
      message: `Your report #${updated.id} is now ${statusLabel}.`,
    });

    // Requirement 1: Briefly highlight the updated card (respects prefers-reduced-motion in CSS)
    if (highlightTimerRef.current) {
      clearTimeout(highlightTimerRef.current);
    }
    setHighlightedId(Number(updated.id));
    highlightTimerRef.current = setTimeout(() => {
      setHighlightedId(null);
    }, 2500);

    // Requirement 1: update the matching incident in the list in place
    setIncidents((prev) =>
      prev.map((item) =>
        Number(item.id) === Number(updated.id) ? { ...item, ...updated } : item
      )
    );
  });

  return (
    <AppLayout>
      <div className={styles.root}>
        {/* Page Header */}
        <header className={styles.pageHeader}>
          <SectionHeading
            eyebrow="Citizen Portal"
            title="My Emergency Reports"
            intro="Monitor live dispatch progress, assigned fire stations, and resolution status for your reports."
          />

          <div className={styles.headerActions}>
            <Button
              type="button"
              variant="ghost"
              size="md"
              loading={isRefreshing}
              onClick={() => loadReports(true)}
              className={styles.refreshBtn}
              aria-label="Refresh reports list"
            >
              <RefreshCw size={16} aria-hidden="true" />
              <span>Refresh</span>
            </Button>

            <Button
              as={Link}
              to="/report"
              variant="primary"
              size="md"
              className={styles.reportNewBtn}
            >
              <PlusCircle size={18} aria-hidden="true" />
              <span>Report a Fire</span>
            </Button>
          </div>
        </header>

        {/* Loading Skeleton State */}
        {loading && (
          <div className={styles.skeletonList} aria-label="Loading reports...">
            {[1, 2, 3].map((key) => (
              <div key={key} className={styles.skeletonCard}>
                <div className={styles.skeletonRow}>
                  <Skeleton width={100} height={24} />
                  <Skeleton width={80} height={24} />
                  <Skeleton width={80} height={24} />
                </div>
                <Skeleton lines={2} height={20} width="100%" />
                <Skeleton lines={2} height={16} width="75%" />
              </div>
            ))}
          </div>
        )}

        {/* Error State with Retry */}
        {!loading && error && (
          <div className={styles.errorBanner} role="alert">
            <div className={styles.errorContent}>
              <AlertTriangle size={24} className={styles.errorIcon} aria-hidden="true" />
              <div>
                <h3 className={styles.errorTitle}>Unable to load reports</h3>
                <p className={styles.errorMessage}>{error}</p>
              </div>
            </div>
            <Button
              type="button"
              onClick={() => loadReports(false)}
              variant="dark"
              size="md"
            >
              Try Again
            </Button>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && incidents.length === 0 && (
          <EmptyState
            title="No incident reports yet"
            description="You have not reported any fire emergencies. If you see a fire or hazard, submit a report immediately for dispatch."
            action={
              <Button as={Link} to="/report" variant="primary" size="lg">
                <PlusCircle size={18} aria-hidden="true" />
                <span>Report an Emergency</span>
              </Button>
            }
          />
        )}

        {/* Incidents List */}
        {!loading && !error && incidents.length > 0 && (
          <main className={styles.listContainer}>
            <div className={styles.listMeta}>
              <span className={styles.countBadge}>
                {incidents.length} {incidents.length === 1 ? 'Report' : 'Reports'}
              </span>
              <span className={styles.liveIndicator}>
                Live tracking active
              </span>
            </div>

            <div className={styles.cardsGrid}>
              {incidents.map((incident) => (
                <div key={incident.id} id={`incident-${incident.id}`}>
                  <IncidentCard
                    incident={incident}
                    isHighlighted={Number(incident.id) === Number(highlightedId)}
                  />
                </div>
              ))}
            </div>
          </main>
        )}
      </div>
    </AppLayout>
  );
}
