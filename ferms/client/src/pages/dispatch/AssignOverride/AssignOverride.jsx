// pages/dispatch/AssignOverride/AssignOverride.jsx — Modal dialog for dispatchers to override and reassign incident station
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Modal from '../../../components/ui/Modal/Modal';
import Button from '../../../components/ui/Button/Button';
import Select from '../../../components/ui/Select/Select';
import Badge from '../../../components/ui/Badge/Badge';
import Skeleton from '../../../components/ui/Skeleton/Skeleton';
import { listStations } from '../../../api/stations.api';
import { assignIncident } from '../../../api/incidents.api';
import styles from './AssignOverride.module.css';

/**
 * Haversine formula to compute great-circle distance in kilometres between two coordinates.
 */
export function calculateDistanceKm(lat1, lon1, lat2, lon2) {
  if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) return null;
  const nLat1 = Number(lat1);
  const nLon1 = Number(lon1);
  const nLat2 = Number(lat2);
  const nLon2 = Number(lon2);
  if (Number.isNaN(nLat1) || Number.isNaN(nLon1) || Number.isNaN(nLat2) || Number.isNaN(nLon2)) {
    return null;
  }

  const R = 6371; // Earth radius in km
  const dLat = ((nLat2 - nLat1) * Math.PI) / 180;
  const dLon = ((nLon2 - nLon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((nLat1 * Math.PI) / 180) *
      Math.cos((nLat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

/**
 * <AssignOverride incident open onClose onAssigned={(incident)=>{}} />
 *
 * Requirements:
 * 1. Signature EXACTLY: <AssignOverride incident open onClose onAssigned={(incident)=>{}} />.
 * 2. Loads stations (GET /stations) and shows a Select of stations with each station's
 *    availableVehicles count and distance from the incident (Haversine formula helper).
 *    Disables stations with zero available vehicles and explains why.
 *    The current station is marked.
 * 3. Primary 'Assign station' button with loading state calls assignIncident.
 *    On success calls onAssigned with returned incident and closes.
 *    Shows server errors (409 no vehicle, 400 not assignable) inline.
 */
export default function AssignOverride({
  incident,
  open,
  onClose,
  onAssigned,
}) {
  const [stations, setStations] = useState([]);
  const [stationsLoading, setStationsLoading] = useState(false);
  const [selectedStationId, setSelectedStationId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState(null);

  // Current station ID from incident
  const currentStationId = incident?.stationId || incident?.station?.id || null;

  // Check if status is allowed for override (Decision D1: only 'unassigned' or 'assigned')
  const isStatusAllowed = useMemo(() => {
    if (!incident?.status) return true;
    return ['unassigned', 'assigned'].includes(incident.status);
  }, [incident?.status]);

  // Load stations on open
  useEffect(() => {
    if (!open) {
      setSelectedStationId('');
      setServerError(null);
      return;
    }

    let isMounted = true;
    setStationsLoading(true);
    setServerError(null);

    listStations()
      .then((envelope) => {
        if (!isMounted) return;
        const list = envelope?.data || [];
        setStations(list);

        // Pre-select current station if available, otherwise leave unselected
        if (currentStationId) {
          setSelectedStationId(String(currentStationId));
        } else if (list.length > 0) {
          // If unassigned, don't force a pre-selection to require deliberate choice
          setSelectedStationId('');
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        setServerError(
          err.response?.data?.error?.message || 'Failed to load fire stations. Please retry.'
        );
      })
      .finally(() => {
        if (isMounted) setStationsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [open, currentStationId]);

  // Selected station object
  const selectedStation = useMemo(() => {
    if (!selectedStationId) return null;
    return stations.find((s) => String(s.id) === String(selectedStationId)) || null;
  }, [stations, selectedStationId]);

  // Compute station options for Select
  const stationOptions = useMemo(() => {
    return stations.map((station) => {
      const avail = station.availableVehicles ?? 0;
      const isCurrent = currentStationId && Number(station.id) === Number(currentStationId);
      const isZero = avail === 0;

      const dist = calculateDistanceKm(
        incident?.latitude,
        incident?.longitude,
        station.latitude,
        station.longitude
      );
      const distStr = dist != null ? `${dist} km` : 'distance N/A';

      let label = `${station.name} — ${avail} vehicle${avail === 1 ? '' : 's'} avail · ${distStr}`;
      if (isCurrent) {
        label += ' [Current Station]';
      }
      if (isZero) {
        label += ' (Unavailable: 0 vehicles)';
      }

      return {
        value: String(station.id),
        label,
        disabled: isZero,
        station,
        avail,
        isCurrent,
        isZero,
        dist,
      };
    });
  }, [stations, incident?.latitude, incident?.longitude, currentStationId]);

  // Handle station change
  const handleStationChange = (e) => {
    const newId = e.target.value;
    setSelectedStationId(newId);
    setServerError(null);
  };

  // Check if currently selected station has 0 vehicles
  const selectedHasZeroVehicles = useMemo(() => {
    if (!selectedStation) return false;
    return (selectedStation.availableVehicles ?? 0) === 0;
  }, [selectedStation]);

  // Check if submit button should be disabled
  const isSubmitDisabled =
    !selectedStationId ||
    selectedHasZeroVehicles ||
    submitting ||
    !isStatusAllowed ||
    stationsLoading;

  // Handle submission
  const handleSubmit = useCallback(async () => {
    if (!incident?.id) {
      setServerError('No incident provided.');
      return;
    }

    if (!selectedStationId) {
      setServerError('Please select a target fire station.');
      return;
    }

    if (!isStatusAllowed) {
      setServerError(
        `Cannot reassign incident: Status is '${incident.status}'. Reassignment is only allowed when status is 'unassigned' or 'assigned'.`
      );
      return;
    }

    if (selectedHasZeroVehicles) {
      setServerError(
        `Target station "${selectedStation?.name}" has 0 available vehicles and cannot be assigned.`
      );
      return;
    }

    setSubmitting(true);
    setServerError(null);

    try {
      const targetId = Number(selectedStationId);
      const envelope = await assignIncident(incident.id, { stationId: targetId });

      const updatedIncident = envelope?.data?.incident || envelope?.data || incident;
      if (onAssigned) {
        onAssigned(updatedIncident);
      }
      if (onClose) {
        onClose();
      }
    } catch (err) {
      // Show server errors (409 no vehicle, 400 not assignable) inline per Requirement 3
      const code = err.response?.data?.error?.code;
      const message =
        err.response?.data?.error?.message ||
        err.message ||
        'Failed to reassign station. Please check target station availability.';

      if (err.response?.status === 409 || code === 'CONFLICT') {
        setServerError(`409 Conflict: ${message}`);
      } else if (err.response?.status === 400 || code === 'INVALID_TRANSITION') {
        setServerError(`400 Bad Request: ${message}`);
      } else {
        setServerError(message);
      }
    } finally {
      setSubmitting(false);
    }
  }, [
    incident,
    selectedStationId,
    isStatusAllowed,
    selectedHasZeroVehicles,
    selectedStation,
    onAssigned,
    onClose,
  ]);

  return (
    <Modal
      open={open}
      onClose={submitting ? undefined : onClose}
      title={`Reassign Station · Incident #${incident?.id || '—'}`}
      footer={
        <div className={styles.modalFooter}>
          <Button
            variant="ghost"
            size="md"
            onClick={onClose}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            size="md"
            loading={submitting}
            disabled={isSubmitDisabled}
            onClick={handleSubmit}
          >
            Assign station
          </Button>
        </div>
      }
    >
      <div className={styles.body}>
        {/* Incident Summary Card */}
        <div className={styles.incidentCard}>
          <div className={styles.incidentRow}>
            <span className={styles.incidentLabel}>Status:</span>
            {incident?.status ? (
              <Badge variant="status" value={incident.status} />
            ) : (
              <span>—</span>
            )}
            {incident?.severity && (
              <Badge variant="severity" value={incident.severity} />
            )}
          </div>

          <div className={styles.incidentRow}>
            <span className={styles.incidentLabel}>Address:</span>
            <span className={styles.incidentValue}>
              {incident?.address || 'Pinned location'}
            </span>
          </div>

          {incident?.description && (
            <div className={styles.incidentDesc}>
              <span className={styles.incidentLabel}>Details:</span>
              <p className={styles.descText}>{incident.description}</p>
            </div>
          )}

          {currentStationId && (
            <div className={styles.incidentRow}>
              <span className={styles.incidentLabel}>Currently assigned:</span>
              <span className={styles.currentStationBadge}>
                {incident?.station?.name || `Station #${currentStationId}`}
              </span>
            </div>
          )}
        </div>

        {/* Warning if status is not assignable */}
        {!isStatusAllowed && (
          <div className={styles.statusWarning} role="alert">
            <svg
              className={styles.alertIcon}
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <div>
              <strong>Reassignment Disallowed:</strong> This incident is currently{' '}
              <em>{incident?.status}</em>. Manual overrides are permitted only while an incident is{' '}
              <strong>unassigned</strong> or <strong>assigned</strong> (Decision D1).
            </div>
          </div>
        )}

        {/* Inline Server Error Display per Requirement 3 */}
        {serverError && (
          <div className={styles.errorBanner} role="alert">
            <svg
              className={styles.alertIcon}
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="15" y1="9" x2="9" y2="15" />
              <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
            <div className={styles.errorText}>{serverError}</div>
          </div>
        )}

        {/* Station Selection Field */}
        <div className={styles.formGroup}>
          {stationsLoading ? (
            <div className={styles.loadingWrap}>
              <Skeleton lines={2} />
            </div>
          ) : (
            <>
              <Select
                label="Target Fire Station"
                name="targetStationId"
                options={stationOptions}
                value={selectedStationId}
                onChange={handleStationChange}
                disabled={submitting || !isStatusAllowed}
                placeholder="Choose a fire station to dispatch…"
                required
              />

              {/* Station Details & Zero-Vehicle Explanation per Requirement 2 */}
              {selectedStation && (
                <div
                  className={`${styles.stationDetailCard} ${
                    selectedHasZeroVehicles ? styles.stationDetailZero : ''
                  }`}
                >
                  <div className={styles.stationDetailHeader}>
                    <span className={styles.stationDetailName}>
                      {selectedStation.name}
                    </span>
                    <span className={styles.stationDetailDist}>
                      {calculateDistanceKm(
                        incident?.latitude,
                        incident?.longitude,
                        selectedStation.latitude,
                        selectedStation.longitude
                      ) != null
                        ? `${calculateDistanceKm(
                            incident?.latitude,
                            incident?.longitude,
                            selectedStation.latitude,
                            selectedStation.longitude
                          )} km away`
                        : 'Distance unavailable'}
                    </span>
                  </div>

                  <div className={styles.stationDetailRow}>
                    <span>Available Vehicles:</span>
                    <strong
                      className={
                        selectedHasZeroVehicles
                          ? styles.countZero
                          : styles.countPositive
                      }
                    >
                      {selectedStation.availableVehicles ?? 0}
                    </strong>
                  </div>

                  {selectedHasZeroVehicles && (
                    <div className={styles.zeroVehiclesExplanation}>
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        aria-hidden="true"
                      >
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="8" x2="12" y2="12" />
                        <line x1="12" y1="16" x2="12.01" y2="16" />
                      </svg>
                      <span>
                        <strong>Cannot assign:</strong> This station has 0 available vehicles.
                        Reassigning an incident requires at least one available vehicle to be
                        dispatched to the scene.
                      </span>
                    </div>
                  )}

                  {currentStationId &&
                    Number(selectedStation.id) === Number(currentStationId) && (
                      <p className={styles.currentStationNotice}>
                        Note: This is the station currently assigned to this incident.
                      </p>
                    )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </Modal>
  );
}

export { AssignOverride };
