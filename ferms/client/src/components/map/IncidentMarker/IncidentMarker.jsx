// components/map/IncidentMarker/IncidentMarker.jsx — Custom Leaflet marker for incidents colour-coded by severity
import React, { useMemo, useRef, useEffect } from 'react';
import { Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import Badge from '../../ui/Badge/Badge';
import Button from '../../ui/Button/Button';
import styles from './IncidentMarker.module.css';

export default function IncidentMarker({ incident, isSelected = false, onSelect }) {
  if (!incident) return null;
  const lat = parseFloat(incident.latitude);
  const lng = parseFloat(incident.longitude);
  if (isNaN(lat) || isNaN(lng)) return null;

  const severity = (incident.severity || 'medium').toLowerCase();
  const markerRef = useRef(null);

  // Auto-open popup when marker becomes selected
  useEffect(() => {
    if (isSelected && markerRef.current) {
      markerRef.current.openPopup();
    }
  }, [isSelected]);

  const customIcon = useMemo(() => {
    // Selected marker is larger (42x52 vs 32x40)
    const size = isSelected ? [42, 52] : [32, 40];
    const anchor = isSelected ? [21, 52] : [16, 40];
    const popupAnchor = isSelected ? [0, -48] : [0, -38];
    const sevColor = `var(--sev-${severity}, var(--color-brand))`;

    return L.divIcon({
      className: `${styles.markerContainer} ${isSelected ? styles.selected : ''}`,
      html: `
        <div class="${styles.flameWrap} ${isSelected ? styles.isFlameSelected : ''}" style="--marker-color: ${sevColor};">
          ${isSelected ? `<div class="${styles.pulseRing}"></div>` : ''}
          <div class="${styles.flamePin}">
            <svg class="${styles.flameSvg}" viewBox="0 0 32 40" width="${size[0]}" height="${size[1]}" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M16 2C13.5 7.5 10 11.5 7 16.5C4 21.5 4.5 27 8 32C11 36 14 38.5 16 40C18 38.5 21 36 24 32C27.5 27 28 21.5 25 16.5C22 11.5 18.5 7.5 16 2Z" fill="var(--marker-color)" stroke="var(--color-ink)" stroke-width="1.5"/>
              <path d="M16 13C14.5 16.5 11.5 20 11.5 24C11.5 27.5 13.5 30.5 16 33C18.5 30.5 20.5 27.5 20.5 24C20.5 20 17.5 16.5 16 13Z" fill="var(--color-bg)" fill-opacity="0.85"/>
            </svg>
          </div>
        </div>
      `,
      iconSize: size,
      iconAnchor: anchor,
      popupAnchor: popupAnchor,
    });
  }, [severity, isSelected]);

  const eventHandlers = useMemo(
    () => ({
      click() {
        if (onSelect) {
          onSelect(incident);
        }
      },
    }),
    [incident, onSelect]
  );

  return (
    <Marker
      position={[lat, lng]}
      icon={customIcon}
      ref={markerRef}
      zIndexOffset={isSelected ? 1000 : 0}
      eventHandlers={eventHandlers}
    >
      <Popup className={styles.popup}>
        <div className={styles.popupContent}>
          <div className={styles.popupHeader}>
            <h4 className={styles.incidentId}>Incident #{incident.id}</h4>
          </div>
          <div className={styles.badgeRow}>
            {/* Severity text label in popup (never colour alone) */}
            <Badge variant="severity" value={incident.severity} />
            <Badge variant="status" value={incident.status} />
          </div>
          <p className={styles.incidentDesc}>{incident.description}</p>
          {incident.address && (
            <p className={styles.incidentAddress}>{incident.address}</p>
          )}
          <div className={styles.actionRow}>
            <Button
              variant="primary"
              size="md"
              className={styles.selectBtn}
              onClick={() => onSelect && onSelect(incident)}
            >
              Select Incident
            </Button>
          </div>
        </div>
      </Popup>
    </Marker>
  );
}
