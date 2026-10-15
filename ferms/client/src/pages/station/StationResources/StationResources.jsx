// pages/station/StationResources/StationResources.jsx — Station vehicles and personnel management
import React, { useState, useEffect, useCallback } from 'react';
import AppLayout from '../../../components/common/AppLayout/AppLayout';
import SectionHeading from '../../../components/ui/SectionHeading/SectionHeading';
import Button from '../../../components/ui/Button/Button';
import Card from '../../../components/ui/Card/Card';
import Table from '../../../components/ui/Table/Table';
import Tabs from '../../../components/ui/Tabs/Tabs';
import Modal from '../../../components/ui/Modal/Modal';
import FormField from '../../../components/ui/FormField/FormField';
import Select from '../../../components/ui/Select/Select';
import Badge from '../../../components/ui/Badge/Badge';
import { useToast } from '../../../components/ui/Toast/Toast';
import { useAuth } from '../../../context/AuthContext';
import { listStations } from '../../../api/stations.api.js';
import {
  getStationVehicles,
  createVehicle,
  updateVehicle,
  deleteVehicle,
} from '../../../api/vehicles.api.js';
import {
  getStationPersonnel,
  updatePersonnelDuty,
  assignPersonnelStation,
  listAllFirefighters,
} from '../../../api/personnel.api.js';
import styles from './StationResources.module.css';

const VEHICLE_TYPES = [
  { value: 'pumper_truck', label: 'Pumper Truck' },
  { value: 'ladder_truck', label: 'Ladder Truck (50m Aerial)' },
  { value: 'rescue_van', label: 'Heavy Rescue Van' },
  { value: 'water_bowser', label: 'Water Bowser (10,000L)' },
  { value: 'quick_response_unit', label: 'Quick Response Unit (QRU)' },
];

export default function StationResources() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const officerStationId = user?.stationId ? Number(user.stationId) : null;

  const [stations, setStations] = useState([]);
  const [selectedStationId, setSelectedStationId] = useState(officerStationId || null);

  // Active Tab: 'vehicles' | 'personnel'
  const [activeTab, setActiveTab] = useState('vehicles');

  // Resource data
  const [vehicles, setVehicles] = useState([]);
  const [personnel, setPersonnel] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Vehicle Modals
  const [addVehicleOpen, setAddVehicleOpen] = useState(false);
  const [editVehicleOpen, setEditVehicleOpen] = useState(false);
  const [removeVehicleOpen, setRemoveVehicleOpen] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState(null);

  const [vehicleForm, setVehicleForm] = useState({
    type: 'pumper_truck',
    registrationNo: '',
    status: 'available',
  });
  const [vehicleFormError, setVehicleFormError] = useState(null);
  const [vehicleSubmitting, setVehicleSubmitting] = useState(false);
  const [deleteError, setDeleteError] = useState(null);

  // Personnel Modals
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [allFirefighters, setAllFirefighters] = useState([]);
  const [selectedFirefighterId, setSelectedFirefighterId] = useState('');
  const [assignSubmitting, setAssignSubmitting] = useState(false);
  const [assignError, setAssignError] = useState(null);

  const toast = useToast();

  // Load stations list for Admin dropdown
  useEffect(() => {
    let isMounted = true;
    listStations()
      .then((envelope) => {
        if (!isMounted) return;
        const list = envelope?.data || [];
        setStations(list);
        if (isAdmin && !selectedStationId && list.length > 0) {
          setSelectedStationId(list[0].id);
        }
      })
      .catch((err) => {
        if (isMounted) setError(err.message || 'Failed to load fire stations');
      });

    return () => {
      isMounted = false;
    };
  }, [isAdmin, selectedStationId]);

  // If user is station officer, keep station locked to own
  useEffect(() => {
    if (!isAdmin && officerStationId) {
      setSelectedStationId(officerStationId);
    }
  }, [isAdmin, officerStationId]);

  // Load resources for selected station
  const fetchResources = useCallback(async () => {
    if (!selectedStationId) return;
    try {
      setLoading(true);
      setError(null);

      const [vRes, pRes] = await Promise.all([
        getStationVehicles(selectedStationId),
        getStationPersonnel(selectedStationId),
      ]);

      setVehicles(vRes?.data || []);
      setPersonnel(pRes?.data || []);
    } catch (err) {
      setError(err.message || 'Failed to load station resources.');
    } finally {
      setLoading(false);
    }
  }, [selectedStationId]);

  useEffect(() => {
    fetchResources();
  }, [fetchResources]);

  const currentStation = stations.find((s) => s.id === Number(selectedStationId));

  // ==========================================
  // Vehicle Actions
  // ==========================================

  const handleOpenAddVehicle = () => {
    setVehicleForm({
      type: 'pumper_truck',
      registrationNo: '',
      status: 'available',
    });
    setVehicleFormError(null);
    setAddVehicleOpen(true);
  };

  const handleCreateVehicle = async (e) => {
    if (e) e.preventDefault();
    if (!vehicleForm.registrationNo.trim()) {
      setVehicleFormError('Registration number is required.');
      return;
    }

    try {
      setVehicleSubmitting(true);
      setVehicleFormError(null);

      await createVehicle({
        stationId: selectedStationId,
        type: vehicleForm.type,
        registrationNo: vehicleForm.registrationNo.trim().toUpperCase(),
        status: vehicleForm.status,
      });

      toast.show({
        type: 'success',
        message: `Vehicle ${vehicleForm.registrationNo.trim().toUpperCase()} registered successfully.`,
      });
      setAddVehicleOpen(false);
      await fetchResources();
    } catch (err) {
      // Show server's 409 conflict message or validation error
      setVehicleFormError(err.message || 'Failed to create vehicle.');
      toast.show({ type: 'error', message: err.message || 'Vehicle registration failed.' });
    } finally {
      setVehicleSubmitting(false);
    }
  };

  const handleOpenEditVehicle = (vehicle) => {
    setSelectedVehicle(vehicle);
    setVehicleForm({
      type: vehicle.type,
      registrationNo: vehicle.registrationNo,
      status: vehicle.status === 'dispatched' ? 'available' : vehicle.status,
    });
    setVehicleFormError(null);
    setEditVehicleOpen(true);
  };

  const handleUpdateVehicle = async (e) => {
    if (e) e.preventDefault();
    if (!selectedVehicle) return;

    try {
      setVehicleSubmitting(true);
      setVehicleFormError(null);

      await updateVehicle(selectedVehicle.id, {
        type: vehicleForm.type,
        status: vehicleForm.status,
      });

      toast.show({
        type: 'success',
        message: `Vehicle ${selectedVehicle.registrationNo} updated.`,
      });
      setEditVehicleOpen(false);
      await fetchResources();
    } catch (err) {
      setVehicleFormError(err.message || 'Failed to update vehicle.');
      toast.show({ type: 'error', message: err.message });
    } finally {
      setVehicleSubmitting(false);
    }
  };

  const handleQuickStatusToggle = async (vehicle) => {
    const nextStatus = vehicle.status === 'available' ? 'maintenance' : 'available';
    try {
      await updateVehicle(vehicle.id, { status: nextStatus });
      toast.show({
        type: 'success',
        message: `${vehicle.registrationNo} marked as ${nextStatus}.`,
      });
      await fetchResources();
    } catch (err) {
      toast.show({ type: 'error', message: err.message || 'Could not update vehicle status.' });
    }
  };

  const handleOpenRemoveVehicle = (vehicle) => {
    setSelectedVehicle(vehicle);
    setDeleteError(null);
    setRemoveVehicleOpen(true);
  };

  const handleConfirmRemoveVehicle = async () => {
    if (!selectedVehicle) return;
    try {
      setVehicleSubmitting(true);
      setDeleteError(null);

      await deleteVehicle(selectedVehicle.id);
      toast.show({
        type: 'success',
        message: `Vehicle ${selectedVehicle.registrationNo} removed from service.`,
      });
      setRemoveVehicleOpen(false);
      await fetchResources();
    } catch (err) {
      // 409 conflict message if vehicle is currently on an active incident
      setDeleteError(err.message || 'Unable to remove vehicle.');
      toast.show({ type: 'error', message: err.message });
    } finally {
      setVehicleSubmitting(false);
    }
  };

  // ==========================================
  // Personnel Actions
  // ==========================================

  const handleToggleDuty = async (staff) => {
    const nextDuty = !staff.onDuty;
    try {
      await updatePersonnelDuty(staff.id, { onDuty: nextDuty });
      toast.show({
        type: 'success',
        message: `${staff.name} is now ${nextDuty ? 'On Duty' : 'Off Duty'}.`,
      });
      await fetchResources();
    } catch (err) {
      toast.show({ type: 'error', message: err.message || 'Failed to update duty status.' });
    }
  };

  const handleOpenAssignFirefighter = async () => {
    try {
      setAssignError(null);
      setSelectedFirefighterId('');
      const envelope = await listAllFirefighters();
      const allUsers = envelope?.data || [];
      // Filter users who are firefighters/officers not currently assigned to this station
      const available = allUsers.filter(
        (u) =>
          ['firefighter', 'station_officer'].includes(u.role) &&
          u.stationId !== Number(selectedStationId) &&
          u.accountStatus !== 'inactive'
      );
      setAllFirefighters(available);
      if (available.length > 0) {
        setSelectedFirefighterId(String(available[0].id));
      }
      setAssignModalOpen(true);
    } catch (err) {
      toast.show({ type: 'error', message: 'Could not fetch available personnel list.' });
    }
  };

  const handleAssignFirefighter = async (e) => {
    if (e) e.preventDefault();
    if (!selectedFirefighterId) {
      setAssignError('Please select a firefighter to assign.');
      return;
    }

    try {
      setAssignSubmitting(true);
      setAssignError(null);

      await assignPersonnelStation(Number(selectedFirefighterId), {
        stationId: selectedStationId,
      });

      const assigned = allFirefighters.find((f) => String(f.id) === String(selectedFirefighterId));
      toast.show({
        type: 'success',
        message: `${assigned?.name || 'Firefighter'} assigned to station successfully.`,
      });
      setAssignModalOpen(false);
      await fetchResources();
    } catch (err) {
      setAssignError(err.message || 'Failed to assign personnel.');
      toast.show({ type: 'error', message: err.message });
    } finally {
      setAssignSubmitting(false);
    }
  };

  // ==========================================
  // Table Columns
  // ==========================================

  const formatVehicleType = (raw) => {
    const found = VEHICLE_TYPES.find((t) => t.value === raw);
    return found ? found.label : raw.replace(/_/g, ' ').toUpperCase();
  };

  const vehicleColumns = [
    {
      key: 'type',
      header: 'Vehicle Type',
      render: (row) => <strong>{formatVehicleType(row.type)}</strong>,
    },
    {
      key: 'registrationNo',
      header: 'Registration Number',
      render: (row) => <span className={styles.regBadge}>{row.registrationNo}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <Badge variant="vehicle" value={row.status} />,
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (row) => (
        <div className={styles.tableActions}>
          {row.status === 'available' && (
            <Button
              variant="ghost"
              size="md"
              onClick={() => handleQuickStatusToggle(row)}
              className={styles.actionBtn}
            >
              Mark Maintenance
            </Button>
          )}
          {row.status === 'maintenance' && (
            <Button
              variant="ghost"
              size="md"
              onClick={() => handleQuickStatusToggle(row)}
              className={styles.actionBtn}
            >
              Mark Available
            </Button>
          )}
          {row.status === 'dispatched' && (
            <span className={styles.dispatchedHint}>On Active Call</span>
          )}
          <Button
            variant="ghost"
            size="md"
            onClick={() => handleOpenEditVehicle(row)}
            className={styles.actionBtn}
            disabled={row.status === 'dispatched'}
          >
            Edit
          </Button>
          <Button
            variant="ghost"
            size="md"
            onClick={() => handleOpenRemoveVehicle(row)}
            className={`${styles.actionBtn} ${styles.dangerBtn}`}
          >
            Remove
          </Button>
        </div>
      ),
    },
  ];

  const personnelColumns = [
    {
      key: 'name',
      header: 'Staff Member',
      render: (row) => (
        <div className={styles.staffInfo}>
          <strong className={styles.staffName}>{row.name}</strong>
          <span className={styles.staffEmail}>{row.email}</span>
        </div>
      ),
    },
    {
      key: 'role',
      header: 'Operational Role',
      render: (row) => <Badge variant="role" value={row.role} />,
    },
    {
      key: 'dutyStatus',
      header: 'Current Duty',
      render: (row) => (
        <span className={row.onDuty ? styles.dutyOn : styles.dutyOff}>
          <span className={styles.dutyDot} aria-hidden="true" />
          {row.onDuty ? 'On Duty' : 'Off Duty'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Duty Controls',
      render: (row) => (
        <div className={styles.tableActions}>
          <Button
            variant={row.onDuty ? 'ghost' : 'primary'}
            size="md"
            onClick={() => handleToggleDuty(row)}
            className={styles.actionBtn}
          >
            {row.onDuty ? 'Set Off-Duty' : 'Set On-Duty'}
          </Button>
        </div>
      ),
    },
  ];

  return (
    <AppLayout>
      <div className={styles.container}>
        {/* Header & Station Selector */}
        <div className={styles.topBar}>
          <SectionHeading
            eyebrow="Station Fleet & Crew"
            title={currentStation?.name || 'Station Resources'}
            intro={
              currentStation?.address
                ? `Station Location: ${currentStation.address} (${currentStation.latitude?.toFixed(4)}, ${currentStation.longitude?.toFixed(4)})`
                : 'Manage allocated vehicles, readiness levels, and personnel shift assignments.'
            }
          />

          {isAdmin && (
            <div className={styles.stationPicker}>
              <Select
                label="Active Station"
                name="stationSelect"
                value={selectedStationId || ''}
                onChange={(e) => setSelectedStationId(Number(e.target.value))}
                options={stations.map((st) => ({
                  value: st.id,
                  label: `${st.name} (${st.availableVehicles ?? 0} avail)`,
                }))}
              />
            </div>
          )}
        </div>

        {/* Global Error Banner */}
        {error && !loading && (
          <Card variant="warm" className={styles.errorCard}>
            <p className={styles.errorMessage}>{error}</p>
            <Button variant="ghost" size="md" onClick={fetchResources}>
              Retry Loading Resources
            </Button>
          </Card>
        )}

        {/* Resource Tabs */}
        <div className={styles.tabRow}>
          <Tabs
            value={activeTab}
            onChange={(key) => setActiveTab(key)}
            tabs={[
              { key: 'vehicles', label: 'Vehicles', count: vehicles.length },
              { key: 'personnel', label: 'Personnel', count: personnel.length },
            ]}
          />

          {activeTab === 'vehicles' ? (
            <Button variant="primary" size="lg" onClick={handleOpenAddVehicle}>
              + Add Vehicle
            </Button>
          ) : (
            <Button variant="primary" size="lg" onClick={handleOpenAssignFirefighter}>
              + Assign Firefighter
            </Button>
          )}
        </div>

        {/* Tab Content */}
        {activeTab === 'vehicles' ? (
          <Table
            columns={vehicleColumns}
            rows={vehicles}
            rowKey="id"
            loading={loading}
            empty="No vehicles currently assigned to this fire station."
          />
        ) : (
          <Table
            columns={personnelColumns}
            rows={personnel}
            rowKey="id"
            loading={loading}
            empty="No firefighters or officers currently stationed here."
          />
        )}

        {/* ------------------------------------------ */}
        {/* Modal: Add Vehicle */}
        {/* ------------------------------------------ */}
        <Modal
          open={addVehicleOpen}
          onClose={() => !vehicleSubmitting && setAddVehicleOpen(false)}
          title="Register Vehicle to Station Fleet"
          footer={
            <>
              <Button
                variant="ghost"
                onClick={() => setAddVehicleOpen(false)}
                disabled={vehicleSubmitting}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleCreateVehicle}
                loading={vehicleSubmitting}
              >
                Register Vehicle
              </Button>
            </>
          }
        >
          <form onSubmit={handleCreateVehicle} className={styles.modalForm}>
            {vehicleFormError && (
              <p className={styles.errorBanner} role="alert">
                {vehicleFormError}
              </p>
            )}

            <Select
              label="Vehicle Type"
              name="type"
              value={vehicleForm.type}
              onChange={(e) => setVehicleForm({ ...vehicleForm, type: e.target.value })}
              options={VEHICLE_TYPES}
              required
            />

            <FormField
              label="Registration Number"
              name="registrationNo"
              placeholder="e.g. MH-01-PT-2024"
              value={vehicleForm.registrationNo}
              onChange={(e) => setVehicleForm({ ...vehicleForm, registrationNo: e.target.value })}
              hint="Must be a unique state-registered vehicle identifier"
              required
            />

            <Select
              label="Initial Status"
              name="status"
              value={vehicleForm.status}
              onChange={(e) => setVehicleForm({ ...vehicleForm, status: e.target.value })}
              options={[
                { value: 'available', label: 'Available for Dispatch' },
                { value: 'maintenance', label: 'Under Maintenance' },
              ]}
              required
            />
          </form>
        </Modal>

        {/* ------------------------------------------ */}
        {/* Modal: Edit Vehicle */}
        {/* ------------------------------------------ */}
        <Modal
          open={editVehicleOpen}
          onClose={() => !vehicleSubmitting && setEditVehicleOpen(false)}
          title={`Edit Vehicle — ${selectedVehicle?.registrationNo}`}
          footer={
            <>
              <Button
                variant="ghost"
                onClick={() => setEditVehicleOpen(false)}
                disabled={vehicleSubmitting}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleUpdateVehicle}
                loading={vehicleSubmitting}
              >
                Save Changes
              </Button>
            </>
          }
        >
          <form onSubmit={handleUpdateVehicle} className={styles.modalForm}>
            {vehicleFormError && (
              <p className={styles.errorBanner} role="alert">
                {vehicleFormError}
              </p>
            )}

            <Select
              label="Vehicle Type"
              name="type"
              value={vehicleForm.type}
              onChange={(e) => setVehicleForm({ ...vehicleForm, type: e.target.value })}
              options={VEHICLE_TYPES}
              required
            />

            <Select
              label="Operational Status"
              name="status"
              value={vehicleForm.status}
              onChange={(e) => setVehicleForm({ ...vehicleForm, status: e.target.value })}
              options={[
                { value: 'available', label: 'Available' },
                { value: 'maintenance', label: 'Under Maintenance' },
              ]}
              hint="Dispatched status is controlled automatically by incident response dispatch."
              required
            />
          </form>
        </Modal>

        {/* ------------------------------------------ */}
        {/* Modal: Remove Vehicle Confirmation */}
        {/* ------------------------------------------ */}
        <Modal
          open={removeVehicleOpen}
          onClose={() => !vehicleSubmitting && setRemoveVehicleOpen(false)}
          title="Confirm Vehicle Removal"
          footer={
            <>
              <Button
                variant="ghost"
                onClick={() => setRemoveVehicleOpen(false)}
                disabled={vehicleSubmitting}
              >
                Cancel
              </Button>
              <Button
                variant="dark"
                onClick={handleConfirmRemoveVehicle}
                loading={vehicleSubmitting}
              >
                Confirm Removal
              </Button>
            </>
          }
        >
          <div className={styles.modalConfirmBody}>
            {deleteError ? (
              <p className={styles.errorBanner} role="alert">
                {deleteError}
              </p>
            ) : (
              <p className="body">
                Are you sure you want to permanently remove vehicle{' '}
                <strong>{selectedVehicle?.registrationNo}</strong> ({formatVehicleType(selectedVehicle?.type || '')}) from this station?
              </p>
            )}
            <p className={styles.confirmSubtext}>
              Vehicles assigned to an ongoing fire emergency response cannot be deleted until released.
            </p>
          </div>
        </Modal>

        {/* ------------------------------------------ */}
        {/* Modal: Assign Firefighter */}
        {/* ------------------------------------------ */}
        <Modal
          open={assignModalOpen}
          onClose={() => !assignSubmitting && setAssignModalOpen(false)}
          title="Assign Firefighter to Station"
          footer={
            <>
              <Button
                variant="ghost"
                onClick={() => setAssignModalOpen(false)}
                disabled={assignSubmitting}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleAssignFirefighter}
                loading={assignSubmitting}
                disabled={allFirefighters.length === 0}
              >
                Assign to Station
              </Button>
            </>
          }
        >
          <form onSubmit={handleAssignFirefighter} className={styles.modalForm}>
            {assignError && (
              <p className={styles.errorBanner} role="alert">
                {assignError}
              </p>
            )}

            {allFirefighters.length === 0 ? (
              <p className="body">
                No unassigned or transferable firefighters found in the department.
              </p>
            ) : (
              <Select
                label="Select Firefighter / Officer"
                name="firefighterId"
                value={selectedFirefighterId}
                onChange={(e) => setSelectedFirefighterId(e.target.value)}
                options={allFirefighters.map((f) => ({
                  value: f.id,
                  label: `${f.name} (${f.role.replace('_', ' ')}) — ${
                    f.stationId ? `Station ${f.stationId}` : 'Unassigned'
                  }`,
                }))}
                hint="Assigning a firefighter transfers them to this station's on-call roster."
                required
              />
            )}
          </form>
        </Modal>
      </div>
    </AppLayout>
  );
}
