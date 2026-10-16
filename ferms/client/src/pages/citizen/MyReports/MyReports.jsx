// pages/citizen/MyReports/MyReports.jsx — Citizen page listing their reported incidents with live status Stepper
import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { PlusCircle, RefreshCw, AlertTriangle } from 'lucide-react';
import AppLayout from '../../../components/common/AppLayout/AppLayout';
import SectionHeading from '../../../components/ui/SectionHeading/SectionHeading';
import Button from '../../../components/ui/Button/Button';
import Skeleton from '../../../components/ui/Skeleton/Skeleton';
import EmptyState from '../../../components/ui/EmptyState/EmptyState';
import IncidentCard from '../../../components/incidents/IncidentCard/IncidentCard';
import { myIncidents } from '../../../api/incidents.api';
import styles from './MyReports.module.css';

export default function MyReports() {
  // State variable holding the list of incidents — prepared for live updates next week
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

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
      setError(err.message || 'Failed to load your incident reports. Please try again.');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

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
                <IncidentCard key={incident.id} incident={incident} />
              ))}
            </div>
          </main>
        )}
      </div>
    </AppLayout>
  );
}
