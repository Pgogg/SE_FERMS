// components/map/LeafletMap/LeafletMap.jsx — Full-screen Leaflet map container with tile layer and control scaffolding
import React, { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import StationMarker from '../StationMarker/StationMarker';
import IncidentMarker from '../IncidentMarker/IncidentMarker';
import styles from './LeafletMap.module.css';

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

// Default center: Mumbai [19.0760, 72.8777]
const DEFAULT_CENTER = [19.0760, 72.8777];
const DEFAULT_ZOOM = 12;

/**
 * MapController component handles:
 * 1. Fitting map bounds to station & incident markers (defaulting to Mumbai when empty)
 * 2. Invalidating map size when container dimensions change (resize observer + window resize)
 * 3. Smoothly panning to the selected incident
 */
function MapController({ stations = [], incidents = [], selectedId }) {
  const map = useMap();
  const prevBoundsKeyRef = useRef('');

  // Invalidate size on mount and whenever the container or window resizes
  useEffect(() => {
    map.invalidateSize();
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 150);

    const container = map.getContainer();
    let resizeObserver = null;
    if (typeof ResizeObserver !== 'undefined' && container) {
      resizeObserver = new ResizeObserver(() => {
        map.invalidateSize();
      });
      resizeObserver.observe(container);
    }

    const handleWindowResize = () => {
      map.invalidateSize();
    };
    window.addEventListener('resize', handleWindowResize);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', handleWindowResize);
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
    };
  }, [map]);

  // Fit bounds when station or incident positions change
  useEffect(() => {
    const points = [];

    stations.forEach((st) => {
      const lat = parseFloat(st.latitude);
      const lng = parseFloat(st.longitude);
      if (!isNaN(lat) && !isNaN(lng)) {
        points.push([lat, lng]);
      }
    });

    incidents.forEach((inc) => {
      if (inc.status === 'closed') return;
      const lat = parseFloat(inc.latitude);
      const lng = parseFloat(inc.longitude);
      if (!isNaN(lat) && !isNaN(lng)) {
        points.push([lat, lng]);
      }
    });

    const key = points.map((p) => `${p[0]},${p[1]}`).sort().join(';');
    if (key !== prevBoundsKeyRef.current) {
      prevBoundsKeyRef.current = key;
      if (points.length > 0) {
        const bounds = L.latLngBounds(points);
        if (bounds.isValid()) {
          map.fitBounds(bounds, {
            padding: [40, 40],
            maxZoom: 15,
          });
        }
      } else {
        // Default to Mumbai when empty
        map.setView(DEFAULT_CENTER, DEFAULT_ZOOM);
      }
    }
  }, [stations, incidents, map]);

  // Pan to selected incident when selectedId changes
  useEffect(() => {
    if (!selectedId) return;
    const selected = incidents.find((inc) => String(inc.id) === String(selectedId));
    if (selected) {
      const lat = parseFloat(selected.latitude);
      const lng = parseFloat(selected.longitude);
      if (!isNaN(lat) && !isNaN(lng)) {
        map.panTo([lat, lng], { animate: true });
      }
    }
  }, [selectedId, incidents, map]);

  return null;
}

export default function LeafletMap({
  stations = [],
  incidents = [],
  selectedId,
  onSelectIncident,
}) {
  // Ensure closed incidents are excluded from the map (§14.7 / Requirement 4)
  const activeIncidents = (incidents || []).filter(
    (inc) =>
      inc.status !== 'closed' &&
      inc.latitude != null &&
      inc.longitude != null &&
      !isNaN(parseFloat(inc.latitude)) &&
      !isNaN(parseFloat(inc.longitude))
  );

  const validStations = (stations || []).filter(
    (st) =>
      st.latitude != null &&
      st.longitude != null &&
      !isNaN(parseFloat(st.latitude)) &&
      !isNaN(parseFloat(st.longitude))
  );

  return (
    <div className={styles.root}>
      <MapContainer
        center={DEFAULT_CENTER}
        zoom={DEFAULT_ZOOM}
        scrollWheelZoom={true}
        className={styles.map}
        attributionControl={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapController
          stations={validStations}
          incidents={activeIncidents}
          selectedId={selectedId}
        />

        {validStations.map((st) => (
          <StationMarker key={`station-${st.id}`} station={st} />
        ))}

        {activeIncidents.map((inc) => (
          <IncidentMarker
            key={`incident-${inc.id}`}
            incident={inc}
            isSelected={selectedId != null && String(inc.id) === String(selectedId)}
            onSelect={onSelectIncident}
          />
        ))}
      </MapContainer>
    </div>
  );
}
