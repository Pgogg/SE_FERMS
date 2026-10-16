// components/incidents/IncidentForm/LocationPicker.jsx — Interactive Leaflet map for picking incident coordinates
import React, { useMemo, useRef, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin } from 'lucide-react';
import styles from './LocationPicker.module.css';

// Fix default Leaflet marker icons in Vite
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

// Default center: Mumbai (19.0760, 72.8777)
const DEFAULT_CENTER = [19.0760, 72.8777];

/**
 * Listens for click events on the Leaflet map and updates coordinates
 */
function MapEventsHandler({ onSelect }) {
  useMapEvents({
    click(e) {
      if (onSelect) {
        onSelect(e.latlng.lat, e.latlng.lng);
      }
    },
  });
  return null;
}

/**
 * Draggable Leaflet marker that fires onDragEnd when the user finishes dragging
 */
function DraggablePin({ position, onDragEnd }) {
  const markerRef = useRef(null);

  const eventHandlers = useMemo(
    () => ({
      dragend() {
        const marker = markerRef.current;
        if (marker != null) {
          const latlng = marker.getLatLng();
          onDragEnd(latlng.lat, latlng.lng);
        }
      },
    }),
    [onDragEnd]
  );

  return (
    <Marker
      draggable={true}
      eventHandlers={eventHandlers}
      position={position}
      ref={markerRef}
    />
  );
}

/**
 * Smoothly re-centers map when coordinates change
 */
function MapRecenter({ position }) {
  const map = useMap();
  useEffect(() => {
    if (position && position[0] != null && position[1] != null) {
      map.setView(position, map.getZoom(), { animate: true });
    }
  }, [position, map]);
  return null;
}

export default function LocationPicker({
  latitude,
  longitude,
  onChange,
  disabled = false,
  error,
}) {
  const hasCoords =
    latitude !== null &&
    latitude !== undefined &&
    latitude !== '' &&
    longitude !== null &&
    longitude !== undefined &&
    longitude !== '';

  const numLat = hasCoords ? parseFloat(latitude) : null;
  const numLng = hasCoords ? parseFloat(longitude) : null;
  const position = hasCoords ? [numLat, numLng] : null;
  const center = position || DEFAULT_CENTER;

  const handleSelectCoords = (lat, lng) => {
    if (disabled || !onChange) return;
    onChange({
      latitude: parseFloat(lat.toFixed(6)),
      longitude: parseFloat(lng.toFixed(6)),
    });
  };

  return (
    <div className={`${styles.root} ${error ? styles.hasError : ''}`}>
      <div className={styles.mapContainer}>
        <MapContainer
          center={center}
          zoom={13}
          scrollWheelZoom={false}
          className={styles.map}
          attributionControl={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {!disabled && <MapEventsHandler onSelect={handleSelectCoords} />}
          {hasCoords && (
            <DraggablePin position={position} onDragEnd={handleSelectCoords} />
          )}
          {hasCoords && <MapRecenter position={position} />}
        </MapContainer>
      </div>

      <div className={styles.infoBar}>
        <div className={styles.coords}>
          <MapPin size={16} className={styles.pinIcon} aria-hidden="true" />
          {hasCoords ? (
            <span>
              <strong>Selected:</strong> Lat {numLat.toFixed(6)}, Lon {numLng.toFixed(6)}
            </span>
          ) : (
            <span className={styles.prompt}>
              Click anywhere on the map or drag the pin to set the exact coordinates.
            </span>
          )}
        </div>
        {hasCoords && (
          <span className={styles.badge}>Pin placed</span>
        )}
      </div>

      {error && (
        <p className={styles.errorText} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
