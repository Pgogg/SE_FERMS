// hooks/useIncidents.js — Custom hook for fetching incident list and telemetry counts (§14.7, §5.2)
import { useState, useEffect, useCallback } from 'react';
import { listIncidents, getIncidentStats } from '../api/incidents.api.js';

const DEFAULT_STATS = Object.freeze({
  reported: 0,
  unassigned: 0,
  assigned: 0,
  in_progress: 0,
  resolved: 0,
  closed: 0,
});

/**
 * useIncidents
 * Fetches the incident list and status counts in parallel.
 * Automatically re-fetches whenever filter parameters change.
 *
 * @param {object} [params]
 * @param {string} [params.status]
 * @param {string|number} [params.stationId]
 * @param {boolean} [params.includeClosed]
 * @returns {{
 *   incidents: Array<object>,
 *   stats: { reported: number, unassigned: number, assigned: number, in_progress: number, resolved: number, closed: number },
 *   loading: boolean,
 *   error: string|null,
 *   refetch: () => Promise<void>
 * }}
 */
export function useIncidents(params = {}) {
  const [incidents, setIncidents] = useState([]);
  const [stats, setStats] = useState(DEFAULT_STATS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Stable serialized key for params dependency
  const status = params?.status || '';
  const stationId = params?.stationId != null ? String(params.stationId) : '';
  const includeClosed = Boolean(params?.includeClosed);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const listQuery = {};
      if (status) listQuery.status = status;
      if (stationId) listQuery.stationId = stationId;
      if (includeClosed) listQuery.includeClosed = 'true';

      const statsQuery = {};
      if (stationId) statsQuery.stationId = stationId;

      const [listEnvelope, statsEnvelope] = await Promise.all([
        listIncidents(listQuery),
        getIncidentStats(statsQuery),
      ]);

      setIncidents(listEnvelope?.data || []);
      setStats({
        ...DEFAULT_STATS,
        ...(statsEnvelope?.data || {}),
      });
    } catch (err) {
      setError(err.message || 'Failed to fetch incidents.');
    } finally {
      setLoading(false);
    }
  }, [status, stationId, includeClosed]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    incidents,
    stats,
    loading,
    error,
    refetch: fetchData,
  };
}

export default useIncidents;
