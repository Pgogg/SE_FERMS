import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import AppLayout from '../../../components/common/AppLayout/AppLayout';
import SectionHeading from '../../../components/ui/SectionHeading/SectionHeading';
import Card from '../../../components/ui/Card/Card';
import StatTile from '../../../components/ui/StatTile/StatTile';
import Select from '../../../components/ui/Select/Select';
import Table from '../../../components/ui/Table/Table';
import Badge from '../../../components/ui/Badge/Badge';
import Button from '../../../components/ui/Button/Button';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../components/ui/Toast/Toast';
import { useSocketEvent } from '../../../hooks/useSocketEvent';
import { useIncidents } from '../../../hooks/useIncidents';
import { listStations } from '../../../api/stations.api';
import LeafletMap from '../../../components/map/LeafletMap/LeafletMap';
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
  const toast = useToast();
  const isStationOfficer = user?.role === 'station_officer';
  const isDispatchRole = ['dispatch_operator', 'admin'].includes(user?.role);

  // Filters state
  const [statusFilter, setStatusFilter] = useState('');
  const [stationFilter, setStationFilter] = useState('');
  const [showClosed, setShowClosed] = useState(false);

  // Highlight state for new incoming incidents
  const [highlightedId, setHighlightedId] = useState(null);
  const highlightTimerRef = useRef(null);

  useEffect(() => {
    return () => {
      if (highlightTimerRef.current) {
        clearTimeout(highlightTimerRef.current);
      }
    };
  }, []);

  // Modal inspection state
  const [selectedIncident, setSelectedIncident] = useState(null);

  // Requirement 4: Toast on relevant events for dispatch roles & Requirement 3: Highlight new incident
  useSocketEvent('incident:new', (payload) => {
    const newInc = payload?.incident || payload;
    if (!newInc?.id) return;

    if (isDispatchRole || (isStationOfficer && newInc.stationId === user?.stationId)) {
      const severityStr = newInc.severity ? `[${newInc.severity.toUpperCase()}] ` : '';
      const addressStr = newInc.address ? ` at ${newInc.address}` : '';
      toast.show({
        type: 'info',
        message: `🚨 New incident #${newInc.id} ${severityStr}reported${addressStr}`,
      });
    }

    if (highlightTimerRef.current) {
      clearTimeout(highlightTimerRef.current);
    }
    setHighlightedId(Number(newInc.id));
    highlightTimerRef.current = setTimeout(() => {
      setHighlightedId(null);
    }, 3500);
  });

  // Available fire stations for filter dropdown
  const [stations, setStations] = useState([]);

  // Load stations helper (for dispatch operator and admin)
  const fetchStations = useCallback(async () => {
    if (!isStationOfficer) {
      try {
        const envelope = await listStations();
        setStations(envelope?.data || []);
      } catch {
        // Graceful fallback if stations endpoint is temporarily unreachable
      }
    }
  }, [isStationOfficer]);

  useEffect(() => {
    fetchStations();
  }, [fetchStations]);

  // Compose query params for useIncidents
  const queryParams = useMemo(() => {
    const params = {};
    if (statusFilter) params.status = statusFilter;
    if (stationFilter && !isStationOfficer) params.stationId = stationFilter;
    if (showClosed) params.includeClosed = true;
    return params;
  }, [statusFilter, stationFilter, showClosed, isStationOfficer]);

  // Hook handles list + stats in parallel with params change dependency
  const { incidents: hookIncidents, stats: hookStats, loading, error, refetch } = useIncidents(queryParams);
  const [localIncidents, setLocalIncidents] = useState([]);
  const [localStats, setLocalStats] = useState(null);

  useEffect(() => {
    setLocalIncidents(hookIncidents || []);
  }, [hookIncidents]);

  useEffect(() => {
    setLocalStats(hookStats);
  }, [hookStats]);

  const incidents = localIncidents;
  const stats = localStats || hookStats;

  // Requirement 2: In onAssigned, update the list, the stats and the map from the returned incident and show a Toast.
  const handleIncidentAssigned = useCallback(
    async (updatedIncident) => {
      if (!updatedIncident?.id) return;

      // 1. Update the list immediately in place with the returned incident
      setLocalIncidents((prev) => {
        const index = prev.findIndex((i) => Number(i.id) === Number(updatedIncident.id));
        if (index !== -1) {
          const next = [...prev];
          next[index] = { ...next[index], ...updatedIncident };
          return next;
        }
        return [updatedIncident, ...prev];
      });

      // 2. Update stats immediately if unassigned incident became assigned
      setLocalStats((prev) => {
        if (!prev) return prev;
        const oldIncident = (localIncidents || []).find(
          (i) => Number(i.id) === Number(updatedIncident.id)
        );
        if (
          oldIncident &&
          oldIncident.status === 'unassigned' &&
          updatedIncident.status === 'assigned'
        ) {
          return {
            ...prev,
            unassigned: Math.max(0, (prev.unassigned || 0) - 1),
            assigned: (prev.assigned || 0) + 1,
          };
        }
        return prev;
      });

      // 3. Trigger refetch of incidents & stats to synchronize with backend/MSW
      if (refetch) {
        try {
          await refetch();
        } catch {
          // ignore background refetch failure
        }
      }

      // 4. Update the map:
      // Map incidents are derived from `incidents`, so `localIncidents` update immediately updates the map marker.
      // Station markers on the map show available vehicle counts, so reload stations:
      await fetchStations();

      // 5. Close selected incident modal
      setSelectedIncident(null);

      // 6. Show Toast
      const targetStationName =
        updatedIncident.station?.name ||
        (updatedIncident.stationId ? `Station #${updatedIncident.stationId}` : 'fire station');
      toast.show({
        type: 'success',
        message: `Incident #${updatedIncident.id} reassigned to ${targetStationName}.`,
      });
    },
    [localIncidents, refetch, fetchStations, toast]
  );

  // Incidents shown on map: closed incidents and those without coordinates are excluded
  const mapIncidents = useMemo(
    () =>
      (incidents || []).filter(
        (inc) =>
          inc.status !== 'closed' &&
          inc.latitude != null &&
          inc.longitude != null
      ),
    [incidents]
  );

  // Handle selecting an incident from the map marker
  const handleMarkerSelect = (incident) => {
    setSelectedIncident(incident);
  };

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
        <div
          className={`${styles.descSnippetWrap} ${
            Number(row.id) === Number(highlightedId) ? styles.highlightedDesc : ''
          }`}
        >
          {Number(row.id) === Number(highlightedId) && (
            <span className={styles.newBadge}>NEW</span>
          )}
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
              selectedId={selectedIncident?.id}
            />
          </div>

          {/* Right Column: Leaflet map (§14.7) */}
          <div className={styles.mapColumn}>
            <Card variant="light" className={styles.mapCard}>
              <LeafletMap
                stations={stations}
                incidents={mapIncidents}
                selectedId={selectedIncident?.id || highlightedId}
                onSelectIncident={handleMarkerSelect}
              />
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
          onAssigned={handleIncidentAssigned}
        />
      </div>
    </AppLayout>
  );
}
