// components/map/StationMarker/StationMarker.jsx — Custom Leaflet marker for fire stations with popup showing resources
import React, { useMemo } from 'react';
import { Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import styles from './StationMarker.module.css';

export default function StationMarker({ station }) {
  if (!station) return null;
  const lat = parseFloat(station.latitude);
  const lng = parseFloat(station.longitude);
  if (isNaN(lat) || isNaN(lng)) return null;

  const availableVehicles =
    station.availableVehicles ??
    station.availableVehicleCount ??
    (Array.isArray(station.vehicles)
      ? station.vehicles.filter((v) => v.status === 'available').length
      : 0);

  const customIcon = useMemo(() => {
    return L.divIcon({
      className: styles.markerContainer,
      html: `
        <div class="${styles.pinWrap}">
          <div class="${styles.pin}">
            <svg class="${styles.pinIcon}" viewBox="0 0 32 40" width="32" height="40" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M16 1C7.716 1 1 7.716 1 16C1 26.5 14.5 38.5 15.35 39.26C15.73 39.6 16.27 39.6 16.65 39.26C17.5 38.5 31 26.5 31 16C31 7.716 24.284 1 16 1Z" fill="var(--marker-pin-dark)" stroke="var(--marker-station-border)" stroke-width="1.5"/>
              <path d="M16 7L9 11.5V17C9 21.5 12 24.8 16 26C20 24.8 23 21.5 23 17V11.5L16 7Z" fill="none" stroke="var(--color-bg)" stroke-width="1.5" stroke-linejoin="round"/>
              <path d="M13.5 16H18.5M16 13.5V18.5" stroke="var(--color-bg)" stroke-width="1.5" stroke-linecap="round"/>
            </svg>
          </div>
        </div>
      `,
      iconSize: [32, 40],
      iconAnchor: [16, 40],
      popupAnchor: [0, -38],
    });
  }, []);

  return (
    <Marker position={[lat, lng]} icon={customIcon}>
      <Popup className={styles.popup}>
        <div className={styles.popupContent}>
          <div className={styles.popupHeader}>
            <span className={styles.stationBadge}>Fire Station</span>
            <h4 className={styles.stationName}>{station.name}</h4>
          </div>
          {station.address && (
            <p className={styles.stationAddress}>{station.address}</p>
          )}
          <div className={styles.statBox}>
            <span className={styles.statLabel}>Available Vehicles:</span>
            <span className={styles.statValue}>{availableVehicles}</span>
          </div>
          {station.contact && (
            <p className={styles.stationContact}>
              <strong>Contact:</strong> {station.contact}
            </p>
          )}
        </div>
      </Popup>
    </Marker>
  );
}
