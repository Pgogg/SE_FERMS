// pages/admin/StationManagement/StationManagement.jsx — Admin fire station registry and coordinate management
import React, { useState, useEffect, useCallback } from 'react';
import AppLayout from '../../../components/common/AppLayout/AppLayout';
import SectionHeading from '../../../components/ui/SectionHeading/SectionHeading';
import Button from '../../../components/ui/Button/Button';
import Card from '../../../components/ui/Card/Card';
import Table from '../../../components/ui/Table/Table';
import Modal from '../../../components/ui/Modal/Modal';
import FormField from '../../../components/ui/FormField/FormField';
import Badge from '../../../components/ui/Badge/Badge';
import { useToast } from '../../../components/ui/Toast/Toast';
import { listStations, createStation, updateStation } from '../../../api/stations.api.js';
import styles from './StationManagement.module.css';

const INITIAL_FORM = {
  name: '',
  address: '',
  latitude: '',
  longitude: '',
  contact: '',
};

export default function StationManagement() {
  const [stations, setStations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modal form state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingStation, setEditingStation] = useState(null);
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const toast = useToast();

  const fetchStations = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const envelope = await listStations();
      setStations(envelope?.data || []);
    } catch (err) {
      setError(err.message || 'Failed to load fire stations.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStations();
  }, [fetchStations]);

  const handleOpenAdd = () => {
    setEditingStation(null);
    setFormData(INITIAL_FORM);
    setFormErrors({});
    setModalOpen(true);
  };

  const handleOpenEdit = (station) => {
    setEditingStation(station);
    setFormData({
      name: station.name || '',
      address: station.address || '',
      latitude: station.latitude !== undefined ? String(station.latitude) : '',
      longitude: station.longitude !== undefined ? String(station.longitude) : '',
      contact: station.contact || '',
    });
    setFormErrors({});
    setModalOpen(true);
  };

  const validate = () => {
    const errors = {};
    if (!formData.name.trim()) {
      errors.name = 'Station name is required.';
    } else if (formData.name.length > 150) {
      errors.name = 'Station name must be 150 characters or fewer.';
    }

    if (!formData.address.trim()) {
      errors.address = 'Street address is required.';
    } else if (formData.address.length > 255) {
      errors.address = 'Address must be 255 characters or fewer.';
    }

    const lat = Number(formData.latitude);
    if (formData.latitude === '' || isNaN(lat)) {
      errors.latitude = 'Valid numeric latitude is required.';
    } else if (lat < -90 || lat > 90) {
      errors.latitude = 'Latitude must be between -90 and 90 degrees.';
    }

    const lng = Number(formData.longitude);
    if (formData.longitude === '' || isNaN(lng)) {
      errors.longitude = 'Valid numeric longitude is required.';
    } else if (lng < -180 || lng > 180) {
      errors.longitude = 'Longitude must be between -180 and 180 degrees.';
    }

    if (formData.contact && formData.contact.length > 100) {
      errors.contact = 'Contact number must be 100 characters or fewer.';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!validate()) return;

    try {
      setSubmitting(true);
      const payload = {
        name: formData.name.trim(),
        address: formData.address.trim(),
        latitude: Number(formData.latitude),
        longitude: Number(formData.longitude),
        contact: formData.contact.trim() || undefined,
      };

      if (editingStation) {
        await updateStation(editingStation.id, payload);
        toast.show({ type: 'success', message: `Station '${payload.name}' updated successfully.` });
      } else {
        await createStation(payload);
        toast.show({ type: 'success', message: `Station '${payload.name}' created successfully.` });
      }

      setModalOpen(false);
      await fetchStations();
    } catch (err) {
      toast.show({ type: 'error', message: err.message || 'Failed to save station.' });
      setFormErrors((prev) => ({
        ...prev,
        form: err.message || 'An error occurred while saving the station.',
      }));
    } finally {
      setSubmitting(false);
    }
  };

  const columns = [
    {
      key: 'name',
      header: 'Station Name',
      render: (row) => (
        <div className={styles.stationNameCell}>
          <span className={styles.stationTitle}>{row.name}</span>
          <span className={styles.stationContact}>{row.contact || 'No phone listed'}</span>
        </div>
      ),
    },
    {
      key: 'address',
      header: 'Address',
      render: (row) => <span className={styles.addressCell}>{row.address}</span>,
    },
    {
      key: 'coordinates',
      header: 'Coordinates (Lat, Lng)',
      render: (row) => (
        <span className={styles.coordsBadge}>
          {typeof row.latitude === 'number' ? row.latitude.toFixed(4) : row.latitude},{' '}
          {typeof row.longitude === 'number' ? row.longitude.toFixed(4) : row.longitude}
        </span>
      ),
    },
    {
      key: 'availableVehicles',
      header: 'Vehicles Available',
      render: (row) => (
        <div className={styles.countBadgeWrap}>
          <Badge variant="vehicle" value="available" />
          <span className={styles.countNumber}>{row.availableVehicles ?? 0}</span>
        </div>
      ),
    },
    {
      key: 'onDutyPersonnel',
      header: 'On-Duty Staff',
      render: (row) => (
        <span className={styles.staffCount}>
          <strong>{row.onDutyPersonnel ?? 0}</strong> active
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (row) => (
        <Button
          variant="ghost"
          size="md"
          onClick={() => handleOpenEdit(row)}
          className={styles.editBtn}
        >
          Edit
        </Button>
      ),
    },
  ];

  return (
    <AppLayout>
      <div className={styles.container}>
        {/* Header bar */}
        <div className={styles.headerRow}>
          <SectionHeading
            eyebrow="Administration"
            title="Station Management"
            intro="Register and configure fire stations, GPS coordinates for dispatch calculations, and contact info."
          />
          <Button
            variant="primary"
            size="lg"
            onClick={handleOpenAdd}
            className={styles.addBtn}
          >
            + Add Station
          </Button>
        </div>

        {/* Error state */}
        {error && !loading && (
          <Card variant="warm" className={styles.errorCard}>
            <p className={styles.errorMessage}>{error}</p>
            <Button variant="ghost" size="md" onClick={fetchStations}>
              Retry Loading Stations
            </Button>
          </Card>
        )}

        {/* Stations Table */}
        <Table
          columns={columns}
          rows={stations}
          rowKey="id"
          loading={loading}
          empty="No fire stations registered yet."
        />

        {/* Add / Edit Station Modal */}
        <Modal
          open={modalOpen}
          onClose={() => !submitting && setModalOpen(false)}
          title={editingStation ? 'Edit Station Details' : 'Add New Fire Station'}
          footer={
            <>
              <Button
                variant="ghost"
                onClick={() => setModalOpen(false)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleSubmit}
                loading={submitting}
              >
                {editingStation ? 'Update Station' : 'Create Station'}
              </Button>
            </>
          }
        >
          <form onSubmit={handleSubmit} className={styles.modalForm}>
            {formErrors.form && (
              <p className={styles.formErrorBanner} role="alert">
                {formErrors.form}
              </p>
            )}

            <FormField
              label="Station Name"
              name="name"
              placeholder="e.g. Downtown Central Station 1"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              error={formErrors.name}
              required
            />

            <FormField
              label="Street Address"
              name="address"
              placeholder="e.g. 100 Main Street, Downtown"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              error={formErrors.address}
              required
            />

            <div className={styles.coordsGrid}>
              <FormField
                label="Latitude (-90 to 90)"
                name="latitude"
                type="number"
                step="any"
                placeholder="e.g. 19.0760"
                value={formData.latitude}
                onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                error={formErrors.latitude}
                hint="Used for Haversine distance calculations"
                required
              />

              <FormField
                label="Longitude (-180 to 180)"
                name="longitude"
                type="number"
                step="any"
                placeholder="e.g. 72.8777"
                value={formData.longitude}
                onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                error={formErrors.longitude}
                hint="Used for Haversine distance calculations"
                required
              />
            </div>

            <FormField
              label="Station Contact / Emergency Phone"
              name="contact"
              placeholder="e.g. 555-FIRE-01"
              value={formData.contact}
              onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
              error={formErrors.contact}
              hint="Direct dispatch line or station chief contact"
            />
          </form>
        </Modal>
      </div>
    </AppLayout>
  );
}
