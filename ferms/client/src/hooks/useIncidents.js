// hooks/useIncidents.js — Custom hook for fetching incident list and telemetry counts (§14.7, §5.2)
import { useState, useEffect, useCallback, useRef } from 'react';
import { listIncidents, getIncidentStats } from '../api/incidents.api.js';
import { useSocketEvent } from './useSocketEvent.js';
import { useOnReconnect } from '../context/SocketContext.jsx';

const DEFAULT_STATS = Object.freeze({
  reported: 0,
  unassigned: 0,
  assigned: 0,
  in_progress: 0,
  resolved: 0,
  closed: 0,
});

/**
 * Checks if an incident satisfies active filter params locally
 */
function matchesFilters(inc, { status, stationId, includeClosed }) {
  if (!inc) return false;
  if (!includeClosed && inc.status === 'closed') {
    return false;
  }
  if (status && inc.status !== status) {
    return false;
  }
  if (stationId && String(inc.stationId) !== String(stationId)) {
    return false;
  }
  return true;
}

/**
 * useIncidents
 * Fetches the incident list and status counts in parallel.
 * Subscribes to 'incident:new' and 'incident:updated' via useSocketEvent,
 * applies current filters locally, debounces stats refetch to 500ms,
 * and re-fetches everything on useOnReconnect.
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

  const statsDebounceTimerRef = useRef(null);

  // Debounced stats refresh (500ms) per Requirement 2
  const triggerDebouncedStats = useCallback(() => {
    if (statsDebounceTimerRef.current) {
      clearTimeout(statsDebounceTimerRef.current);
    }
    statsDebounceTimerRef.current = setTimeout(async () => {
      try {
        const statsQuery = {};
        if (stationId) statsQuery.stationId = stationId;
        const statsEnvelope = await getIncidentStats(statsQuery);
        if (statsEnvelope?.data) {
          setStats({
            ...DEFAULT_STATS,
            ...statsEnvelope.data,
          });
        }
      } catch {
        // ignore background stats fetch error
      }
    }, 500);
  }, [stationId]);

  useEffect(() => {
    return () => {
      if (statsDebounceTimerRef.current) {
        clearTimeout(statsDebounceTimerRef.current);
      }
    };
  }, []);

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

  // Requirement 2: Re-fetch everything on reconnect (§7.5)
  useOnReconnect(() => {
    fetchData();
  });

  // Requirement 2: Subscribe to 'incident:new' with local filter check and debounced stats
  useSocketEvent('incident:new', (payload) => {
    const newInc = payload?.incident || payload;
    if (!newInc?.id) return;

    if (matchesFilters(newInc, { status, stationId, includeClosed })) {
      setIncidents((prev) => {
        const exists = prev.some((i) => Number(i.id) === Number(newInc.id));
        if (exists) {
          return prev.map((i) => (Number(i.id) === Number(newInc.id) ? { ...i, ...newInc } : i));
        }
        return [newInc, ...prev];
      });
    }

    triggerDebouncedStats();
  });

  // Requirement 2: Subscribe to 'incident:updated' with in-place update and debounced stats
  useSocketEvent('incident:updated', (payload) => {
    const updatedInc = payload?.incident || payload;
    if (!updatedInc?.id) return;

    const matches = matchesFilters(updatedInc, { status, stationId, includeClosed });

    setIncidents((prev) => {
      const index = prev.findIndex((i) => Number(i.id) === Number(updatedInc.id));
      if (index !== -1) {
        if (!matches) {
          // No longer matches active filter
          return prev.filter((i) => Number(i.id) !== Number(updatedInc.id));
        }
        // Update in place
        const next = [...prev];
        next[index] = { ...next[index], ...updatedInc };
        return next;
      }

      if (matches) {
        return [updatedInc, ...prev];
      }
      return prev;
    });

    triggerDebouncedStats();
  });

  return {
    incidents,
    stats,
    loading,
    error,
    refetch: fetchData,
  };
}

export default useIncidents;
