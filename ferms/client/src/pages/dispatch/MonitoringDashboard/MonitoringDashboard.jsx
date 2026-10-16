// pages/dispatch/MonitoringDashboard/MonitoringDashboard.jsx — Dispatch and multi-station telemetry monitoring dashboard (§14.7)
import React, { useState, useEffect, useMemo } from 'react';
import { MapPin } from 'lucide-react';
import AppLayout from '../../../components/common/AppLayout/AppLayout';
import SectionHeading from '../../../components/ui/SectionHeading/SectionHeading';
import Card from '../../../components/ui/Card/Card';
import StatTile from '../../../components/ui/StatTile/StatTile';
import Select from '../../../components/ui/Select/Select';
import Table from '../../../components/ui/Table/Table';
import Badge from '../../../components/ui/Badge/Badge';
import Button from '../../../components/ui/Button/Button';
import { useAuth } from '../../../context/AuthContext';
import { useIncidents } from '../../../hooks/useIncidents';
import { listStations } from '../../../api/stations.api';
import IncidentSummaryModal from './IncidentSummaryModal';
import styles from './MonitoringDashboard.module.css';

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

export default function MonitoringDashboard() {
  const { user } = useAuth();
  const isStationOfficer = user?.role === 'station_officer';

  // Filters state
  const [statusFilter, setStatusFilter] = useState('');
  const [stationFilter, setStationFilter] = useState('');
  const [showClosed, setShowClosed] = useState(false);

  // Modal inspection state
  const [selectedIncident, setSelectedIncident] = useState(null);

  // Available fire stations for filter dropdown
  const [stations, setStations] = useState([]);

  // Load stations on mount (for dispatch operator and admin)
  useEffect(() => {
    let isMounted = true;
    if (!isStationOfficer) {
      listStations()
        .then((envelope) => {
          if (isMounted) {
            setStations(envelope?.data || []);
          }
        })
        .catch(() => {
          // Graceful fallback if stations endpoint is temporarily unreachable
        });
    }
    return () => {
      isMounted = false;
    };
  }, [isStationOfficer]);

  // Compose query params for useIncidents
  const queryParams = useMemo(() => {
    const params = {};
    if (statusFilter) params.status = statusFilter;
    if (stationFilter && !isStationOfficer) params.stationId = stationFilter;
    if (showClosed) params.includeClosed = true;
    return params;
  }, [statusFilter, stationFilter, showClosed, isStationOfficer]);

  // Hook handles list + stats in parallel with params change dependency
  const { incidents, stats, loading, error, refetch } = useIncidents(queryParams);

  // Handle clicking a StatTile to toggle filter by that status
  const handleStatClick = (statusKey) => {
    if (statusFilter === statusKey) {
      setStatusFilter('');
    } else {
      setStatusFilter(statusKey);
      if (statusKey === 'closed' && !showClosed) {
        setShowClosed(true);
      }
    }
  };

  const handleResetFilters = () => {
    setStatusFilter('');
    setStationFilter('');
    setShowClosed(false);
  };

  // Table columns definition
  const columns = [
    {
      key: 'severity',
      header: 'Severity',
      render: (row) => <Badge variant="severity" value={row.severity} />,
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <Badge variant="status" value={row.status} />,
    },
    {
      key: 'description',
      header: 'Incident',
      render: (row) => (
        <div className={styles.descSnippetWrap}>
          <span className={styles.descSnippet} title={row.description}>
            {row.description}
          </span>
          {row.address && (
            <span className={styles.addressSnippet} title={row.address}>
              {row.address}
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'station',
      header: 'Station',
      render: (row) => (
        <span className={styles.stationCell}>
          {row.station?.name || (row.stationId ? `Station #${row.stationId}` : 'Unassigned')}
        </span>
      ),
    },
    {
      key: 'age',
      header: 'Reported',
      render: (row) => <span className={styles.ageCell}>{formatAge(row.createdAt)}</span>,
    },
  ];

  return (
    <AppLayout>
      <div className={styles.container}>
        {/* Header */}
        <div className={styles.header}>
          <SectionHeading
            eyebrow="Emergency Telemetry"
            title="Monitoring Dashboard"
            intro={
              isStationOfficer
                ? `Operational incident queue and status telemetry for Station #${user?.stationId}.`
                : 'Central dispatch operations, real-time fire alarms, and city-wide response telemetry.'
            }
          />
        </div>

        {/* ---------------------------------------------------- */}
        {/* Top: Dark Card band with 6 StatTile items (§14.7)    */}
        {/* ---------------------------------------------------- */}
        <Card variant="dark" className={styles.statsBand}>
          <div className={styles.statsGrid}>
            <StatTile
              tone="dark"
              value={stats.reported}
              label="Reported"
              className={statusFilter === 'reported' ? styles.activeStatTile : ''}
              onClick={() => handleStatClick('reported')}
            />
            <StatTile
              tone="dark"
              value={stats.unassigned}
              label="Needs Dispatch"
              className={statusFilter === 'unassigned' ? styles.activeStatTile : ''}
              onClick={() => handleStatClick('unassigned')}
            />
            <StatTile
              tone="dark"
              value={stats.assigned}
              label="Assigned"
              className={statusFilter === 'assigned' ? styles.activeStatTile : ''}
              onClick={() => handleStatClick('assigned')}
            />
            <StatTile
              tone="dark"
              value={stats.in_progress}
              label="In Progress"
              className={statusFilter === 'in_progress' ? styles.activeStatTile : ''}
              onClick={() => handleStatClick('in_progress')}
            />
            <StatTile
              tone="dark"
              value={stats.resolved}
              label="Resolved"
              className={statusFilter === 'resolved' ? styles.activeStatTile : ''}
              onClick={() => handleStatClick('resolved')}
            />
            <StatTile
              tone="dark"
              value={stats.closed}
              label="Closed"
              className={statusFilter === 'closed' ? styles.activeStatTile : ''}
              onClick={() => handleStatClick('closed')}
            />
          </div>
        </Card>

        {/* ---------------------------------------------------- */}
        {/* Filters Row: Status Select & Station Select           */}
        {/* ---------------------------------------------------- */}
        <div className={styles.filtersRow}>
          <div className={styles.filtersLeft}>
            <div className={styles.filterControl}>
              <Select
                label="Filter by Status"
                name="statusFilter"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                options={[
                  { value: '', label: 'All Statuses' },
                  { value: 'reported', label: 'Reported' },
                  { value: 'unassigned', label: 'Needs Dispatch (Unassigned)' },
                  { value: 'assigned', label: 'Assigned' },
                  { value: 'in_progress', label: 'In Progress' },
                  { value: 'resolved', label: 'Resolved' },
                  { value: 'closed', label: 'Closed' },
                ]}
              />
            </div>

            {/* Station filter is hidden for Station Officers per §5.2 / UC-09 */}
            {!isStationOfficer && (
              <div className={styles.filterControl}>
                <Select
                  label="Filter by Fire Station"
                  name="stationFilter"
                  value={stationFilter}
                  onChange={(e) => setStationFilter(e.target.value)}
                  options={[
                    { value: '', label: 'All Stations' },
                    ...stations.map((st) => ({
                      value: String(st.id),
                      label: st.name,
                    })),
                  ]}
                />
              </div>
            )}
          </div>

          <div className={styles.filtersRight}>
            <label className={styles.toggleLabel}>
              <input
                type="checkbox"
                className={styles.toggleInput}
                checked={showClosed}
                onChange={(e) => setShowClosed(e.target.checked)}
              />
              <span className={styles.toggleText}>Show closed incidents</span>
            </label>

            {(statusFilter || stationFilter || showClosed) && (
              <Button
                variant="ghost"
                size="md"
                onClick={handleResetFilters}
                className={styles.resetBtn}
              >
                Reset Filters
              </Button>
            )}
          </div>
        </div>

        {/* ---------------------------------------------------- */}
        {/* Main 2-Column Layout: Incident List Left, Map Right  */}
        {/* Stacked on screens narrower than 1024px              */}
        {/* ---------------------------------------------------- */}
        <div className={styles.mainGrid}>
          {/* Left Column: Incidents Table */}
          <div className={styles.listColumn}>
            {error && (
              <Card variant="warm" className={styles.errorCard}>
                <p className={styles.errorMessage}>{error}</p>
                <Button variant="ghost" size="md" onClick={refetch}>
                  Retry Loading
                </Button>
              </Card>
            )}

            <Table
              columns={columns}
              rows={incidents}
              rowKey="id"
              loading={loading}
              empty={
                statusFilter || stationFilter
                  ? 'No incidents found matching the selected filters.'
                  : 'No active incidents currently reported.'
              }
              onRowClick={(row) => setSelectedIncident(row)}
            />
          </div>

          {/* Right Column: Card reserved for Map */}
          <div className={styles.mapColumn}>
            <Card variant="light" className={styles.mapCard}>
              <div className={styles.mapPlaceholder}>
                <div className={styles.mapIconWrap} aria-hidden="true">
                  <MapPin size={34} />
                </div>
                <h3 className={styles.mapPlaceholderTitle}>Map comes next</h3>
                <p className={styles.mapPlaceholderText}>
                  Interactive Leaflet map displaying fire station markers, active units, and flame markers color-coded by incident severity will render in this card.
                </p>
              </div>
            </Card>
          </div>
        </div>

        {/* ---------------------------------------------------- */}
        {/* Incident Summary Modal                               */}
        {/* ---------------------------------------------------- */}
        <IncidentSummaryModal
          incident={selectedIncident}
          open={Boolean(selectedIncident)}
          onClose={() => setSelectedIncident(null)}
        />
      </div>
    </AppLayout>
  );
}
