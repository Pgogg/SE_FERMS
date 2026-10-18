// pages/admin/UserManagement/UserManagement.jsx — Admin user management page per §5.5, §14.7, UC-14
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import AppLayout from '../../../components/common/AppLayout/AppLayout';
import SectionHeading from '../../../components/ui/SectionHeading/SectionHeading';
import Button from '../../../components/ui/Button/Button';
import Card from '../../../components/ui/Card/Card';
import Table from '../../../components/ui/Table/Table';
import Modal from '../../../components/ui/Modal/Modal';
import FormField from '../../../components/ui/FormField/FormField';
import Select from '../../../components/ui/Select/Select';
import Badge from '../../../components/ui/Badge/Badge';
import { useToast } from '../../../components/ui/Toast/Toast';
import { useAuth } from '../../../context/AuthContext';
import {
  listUsers,
  createUser,
  updateUser,
  updateUserRole,
  deactivateUser,
} from '../../../api/users.api.js';
import { listStations } from '../../../api/stations.api.js';
import styles from './UserManagement.module.css';

const ROLE_OPTIONS = [
  { value: 'citizen', label: 'Citizen' },
  { value: 'dispatch_operator', label: 'Dispatch Operator' },
  { value: 'firefighter', label: 'Firefighter' },
  { value: 'station_officer', label: 'Station Officer' },
  { value: 'admin', label: 'Administrator' },
];

const FILTER_ROLE_OPTIONS = [
  { value: '', label: 'All Roles' },
  ...ROLE_OPTIONS,
];

const FILTER_STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
];

const INITIAL_FORM = {
  name: '',
  email: '',
  phone: '',
  role: 'citizen',
  stationId: '',
  password: '',
};

export default function UserManagement() {
  const { user: currentUser } = useAuth();
  const toast = useToast();

  const [users, setUsers] = useState([]);
  const [stations, setStations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Create / Edit User Modal
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [userFormData, setUserFormData] = useState(INITIAL_FORM);
  const [fieldErrors, setFieldErrors] = useState({});
  const [userSubmitting, setUserSubmitting] = useState(false);

  // Change Role Modal
  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [selectedUserForRole, setSelectedUserForRole] = useState(null);
  const [newRole, setNewRole] = useState('citizen');
  const [roleStationId, setRoleStationId] = useState('');
  const [roleSubmitting, setRoleSubmitting] = useState(false);
  const [roleError, setRoleError] = useState(null);

  // Deactivate Modal
  const [deactivateModalOpen, setDeactivateModalOpen] = useState(false);
  const [selectedUserForDeactivate, setSelectedUserForDeactivate] = useState(null);
  const [deactivateSubmitting, setDeactivateSubmitting] = useState(false);
  const [deactivateError, setDeactivateError] = useState(null);

  // Station map for quick lookup
  const stationMap = useMemo(() => {
    const map = {};
    for (const s of stations) {
      map[s.id] = s;
    }
    return map;
  }, [stations]);

  // Load stations for station select
  useEffect(() => {
    let isMounted = true;
    listStations()
      .then((envelope) => {
        if (isMounted) {
          setStations(envelope?.data || []);
        }
      })
      .catch((err) => {
        console.error('Failed to load stations:', err);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  // Fetch users with filters
  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = {};
      if (roleFilter) params.role = roleFilter;
      if (statusFilter) params.status = statusFilter;

      const envelope = await listUsers(params);
      let list = envelope?.data || [];
      // Client-side safety filter in case mock/server does not filter
      if (roleFilter) {
        list = list.filter((u) => u.role === roleFilter);
      }
      if (statusFilter) {
        list = list.filter((u) => (u.accountStatus || 'active') === statusFilter);
      }
      setUsers(list);
    } catch (err) {
      setError(err.message || 'Failed to load users.');
    } finally {
      setLoading(false);
    }
  }, [roleFilter, statusFilter]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // ==========================================
  // Create / Edit User Handlers
  // ==========================================

  const handleOpenCreate = () => {
    setEditingUser(null);
    setUserFormData(INITIAL_FORM);
    setFieldErrors({});
    setUserModalOpen(true);
  };

  const handleOpenEdit = (user) => {
    setEditingUser(user);
    setUserFormData({
      name: user.name || '',
      email: user.email || '',
      phone: user.phone || '',
      role: user.role || 'citizen',
      stationId: user.stationId ? String(user.stationId) : '',
      password: '',
    });
    setFieldErrors({});
    setUserModalOpen(true);
  };

  const validateUserForm = () => {
    const errors = {};
    if (!userFormData.name.trim()) {
      errors.name = 'Full name is required.';
    }

    if (!userFormData.email.trim()) {
      errors.email = 'Email address is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(userFormData.email.trim())) {
      errors.email = 'Please provide a valid email address.';
    }

    if (!editingUser) {
      if (!userFormData.password) {
        errors.password = 'Password is required.';
      } else if (userFormData.password.length < 8) {
        errors.password = 'Password must be at least 8 characters long.';
      }
    }

    const isStaffRole = ['firefighter', 'station_officer'].includes(userFormData.role);
    if (isStaffRole && !userFormData.stationId) {
      errors.stationId = 'Station assignment is required for firefighters and station officers.';
    }

    return errors;
  };

  const handleSaveUser = async (e) => {
    if (e) e.preventDefault();
    const errors = validateUserForm();
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    const isStaffRole = ['firefighter', 'station_officer'].includes(userFormData.role);
    const stationIdVal = isStaffRole && userFormData.stationId ? Number(userFormData.stationId) : null;

    try {
      setUserSubmitting(true);
      setFieldErrors({});

      if (editingUser) {
        await updateUser(editingUser.id, {
          name: userFormData.name.trim(),
          email: userFormData.email.trim().toLowerCase(),
          phone: userFormData.phone.trim() || null,
          role: userFormData.role,
          stationId: stationIdVal,
        });
        toast.show({ type: 'success', message: 'User account updated successfully.' });
      } else {
        await createUser({
          name: userFormData.name.trim(),
          email: userFormData.email.trim().toLowerCase(),
          password: userFormData.password,
          phone: userFormData.phone.trim() || null,
          role: userFormData.role,
          stationId: stationIdVal,
        });
        toast.show({ type: 'success', message: 'User created successfully.' });
      }

      setUserModalOpen(false);
      await fetchUsers();
    } catch (err) {
      // Server error handling: check for duplicate email or conflict
      if (err.status === 409 || err.code === 'CONFLICT' || /email/i.test(err.message)) {
        setFieldErrors({ email: err.message || 'Email is already registered.' });
      } else {
        setFieldErrors({ form: err.message || 'Failed to save user account.' });
      }
      toast.show({ type: 'error', message: err.message || 'Failed to save user account.' });
    } finally {
      setUserSubmitting(false);
    }
  };

  // ==========================================
  // Role Modal Handlers
  // ==========================================

  const handleOpenRoleModal = (user) => {
    setSelectedUserForRole(user);
    setNewRole(user.role || 'citizen');
    setRoleStationId(user.stationId ? String(user.stationId) : '');
    setRoleError(null);
    setRoleModalOpen(true);
  };

  const handleSaveRole = async () => {
    if (!selectedUserForRole) return;

    const isStaffRole = ['firefighter', 'station_officer'].includes(newRole);
    if (isStaffRole && !roleStationId) {
      setRoleError('Station assignment is required for staff roles.');
      return;
    }

    try {
      setRoleSubmitting(true);
      setRoleError(null);

      await updateUserRole(selectedUserForRole.id, newRole);

      // If station assignment is also needed or updated
      if (isStaffRole && roleStationId && Number(roleStationId) !== selectedUserForRole.stationId) {
        await updateUser(selectedUserForRole.id, { stationId: Number(roleStationId) });
      }

      toast.show({
        type: 'success',
        message: `Role for ${selectedUserForRole.name} updated to ${newRole.replace(/_/g, ' ')}.`,
      });
      setRoleModalOpen(false);
      await fetchUsers();
    } catch (err) {
      setRoleError(err.message || 'Failed to update user role.');
      toast.show({ type: 'error', message: err.message || 'Failed to update user role.' });
    } finally {
      setRoleSubmitting(false);
    }
  };

  // ==========================================
  // Deactivate Modal Handlers
  // ==========================================

  const handleOpenDeactivateModal = (user) => {
    setSelectedUserForDeactivate(user);
    setDeactivateError(null);
    setDeactivateModalOpen(true);
  };

  const handleConfirmDeactivate = async () => {
    if (!selectedUserForDeactivate) return;
    try {
      setDeactivateSubmitting(true);
      setDeactivateError(null);

      await deactivateUser(selectedUserForDeactivate.id);
      toast.show({
        type: 'success',
        message: `User ${selectedUserForDeactivate.name} deactivated successfully.`,
      });
      setDeactivateModalOpen(false);
      await fetchUsers();
    } catch (err) {
      setDeactivateError(err.message || 'Failed to deactivate user.');
      toast.show({ type: 'error', message: err.message || 'Failed to deactivate user.' });
    } finally {
      setDeactivateSubmitting(false);
    }
  };

  // ==========================================
  // Table Columns Definition
  // ==========================================

  const columns = [
    {
      key: 'name',
      header: 'Name',
      render: (row) => (
        <div className={styles.nameCell}>
          <span className={styles.userName}>{row.name}</span>
          {row.phone && <span className={styles.userPhone}>{row.phone}</span>}
        </div>
      ),
    },
    {
      key: 'email',
      header: 'Email',
      render: (row) => <span className={styles.emailText}>{row.email}</span>,
    },
    {
      key: 'role',
      header: 'Role',
      render: (row) => <Badge variant="role" value={row.role} />,
    },
    {
      key: 'station',
      header: 'Station',
      render: (row) => {
        const station = row.stationId ? stationMap[row.stationId] || row.station : null;
        if (station?.name) {
          return <span className={styles.stationText}>{station.name}</span>;
        }
        return <span className={styles.unassigned}>—</span>;
      },
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => {
        const isInactive = (row.accountStatus || row.status) === 'inactive';
        return (
          <Badge
            variant="status"
            className={isInactive ? styles.inactiveBadge : styles.activeBadge}
            value={isInactive ? 'inactive' : 'active'}
          />
        );
      },
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (row) => {
        const isSelf = currentUser?.id && row.id === currentUser.id;
        const isInactive = (row.accountStatus || row.status) === 'inactive';

        return (
          <div className={styles.tableActions}>
            <Button
              variant="ghost"
              size="md"
              onClick={() => handleOpenEdit(row)}
              className={styles.actionBtn}
              aria-label={`Edit ${row.name}`}
            >
              Edit
            </Button>
            <Button
              variant="ghost"
              size="md"
              onClick={() => handleOpenRoleModal(row)}
              className={styles.actionBtn}
              aria-label={`Change role for ${row.name}`}
            >
              Change Role
            </Button>
            <div
              className={styles.tooltipWrap}
              title={
                isSelf
                  ? 'You cannot deactivate your own account.'
                  : isInactive
                  ? 'Account is already inactive'
                  : 'Deactivate user account'
              }
            >
              <Button
                variant="ghost"
                size="md"
                disabled={isSelf || isInactive}
                onClick={() => handleOpenDeactivateModal(row)}
                className={`${styles.actionBtn} ${styles.dangerBtn}`}
                aria-label={`Deactivate ${row.name}`}
              >
                Deactivate
              </Button>
            </div>
          </div>
        );
      },
    },
  ];

  const isStaffRoleForm = ['firefighter', 'station_officer'].includes(userFormData.role);

  return (
    <AppLayout>
      <div className={styles.container}>
        {/* Header & Add User Button */}
        <div className={styles.headerRow}>
          <SectionHeading
            eyebrow="Administration"
            title="User Management"
            intro="Manage system users, assigned roles, station affiliations, and access credentials."
          />
          <Button
            variant="primary"
            size="lg"
            onClick={handleOpenCreate}
            className={styles.addBtn}
          >
            + Add User
          </Button>
        </div>

        {/* Filters Bar */}
        <div className={styles.filterBar}>
          <div className={styles.filterItem}>
            <Select
              label="Filter by Role"
              name="roleFilter"
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              options={FILTER_ROLE_OPTIONS}
              placeholder="All Roles"
            />
          </div>
          <div className={styles.filterItem}>
            <Select
              label="Filter by Status"
              name="statusFilter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              options={FILTER_STATUS_OPTIONS}
              placeholder="All Statuses"
            />
          </div>
          {(roleFilter || statusFilter) && (
            <Button
              variant="ghost"
              size="md"
              onClick={() => {
                setRoleFilter('');
                setStatusFilter('');
              }}
              className={styles.clearFiltersBtn}
            >
              Clear Filters
            </Button>
          )}
        </div>

        {/* Global Error Banner */}
        {error && !loading && (
          <Card variant="warm" className={styles.errorCard}>
            <p className={styles.errorMessage}>{error}</p>
            <Button variant="ghost" size="md" onClick={fetchUsers}>
              Retry Loading Users
            </Button>
          </Card>
        )}

        {/* Users Table */}
        <Table
          columns={columns}
          rows={users}
          rowKey="id"
          loading={loading}
          empty={
            roleFilter || statusFilter
              ? 'No users match the selected filters.'
              : 'No users registered in the system yet.'
          }
        />

        {/* ------------------------------------------ */}
        {/* Modal: Create or Edit User */}
        {/* ------------------------------------------ */}
        <Modal
          open={userModalOpen}
          onClose={() => !userSubmitting && setUserModalOpen(false)}
          title={editingUser ? `Edit User: ${editingUser.name}` : 'Add New User'}
          footer={
            <>
              <Button
                variant="ghost"
                onClick={() => setUserModalOpen(false)}
                disabled={userSubmitting}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleSaveUser}
                loading={userSubmitting}
              >
                {editingUser ? 'Save Changes' : 'Create User'}
              </Button>
            </>
          }
        >
          <form onSubmit={handleSaveUser} className={styles.modalForm}>
            {fieldErrors.form && (
              <p className={styles.formErrorBanner} role="alert">
                {fieldErrors.form}
              </p>
            )}

            <div className={styles.formGrid}>
              <FormField
                label="Full Name"
                name="name"
                placeholder="e.g. John Doe"
                required
                value={userFormData.name}
                onChange={(e) => {
                  setUserFormData({ ...userFormData, name: e.target.value });
                  if (fieldErrors.name) setFieldErrors({ ...fieldErrors, name: null });
                }}
                error={fieldErrors.name}
              />

              <FormField
                label="Email Address"
                name="email"
                type="email"
                placeholder="e.g. jdoe@ferms.test"
                required
                value={userFormData.email}
                onChange={(e) => {
                  setUserFormData({ ...userFormData, email: e.target.value });
                  if (fieldErrors.email) setFieldErrors({ ...fieldErrors, email: null });
                }}
                error={fieldErrors.email}
                hint="Unique login address"
              />
            </div>

            <div className={styles.formGrid}>
              <FormField
                label="Phone Number"
                name="phone"
                type="tel"
                placeholder="e.g. 555-0199"
                value={userFormData.phone}
                onChange={(e) => {
                  setUserFormData({ ...userFormData, phone: e.target.value });
                  if (fieldErrors.phone) setFieldErrors({ ...fieldErrors, phone: null });
                }}
                error={fieldErrors.phone}
              />

              <Select
                label="System Role"
                name="role"
                required
                value={userFormData.role}
                onChange={(e) => {
                  setUserFormData({ ...userFormData, role: e.target.value });
                  if (fieldErrors.role) setFieldErrors({ ...fieldErrors, role: null });
                }}
                options={ROLE_OPTIONS}
                error={fieldErrors.role}
              />
            </div>

            {/* Station Select (shown for staff roles: firefighter, station_officer) */}
            {isStaffRoleForm && (
              <Select
                label="Assigned Fire Station"
                name="stationId"
                required
                value={userFormData.stationId}
                onChange={(e) => {
                  setUserFormData({ ...userFormData, stationId: e.target.value });
                  if (fieldErrors.stationId) setFieldErrors({ ...fieldErrors, stationId: null });
                }}
                options={stations.map((st) => ({
                  value: st.id,
                  label: st.name,
                }))}
                placeholder="Select a fire station"
                error={fieldErrors.stationId}
                hint="Station where this personnel will be stationed"
              />
            )}

            {/* Password (Create Only, at least 8 characters) */}
            {!editingUser && (
              <FormField
                label="Initial Password"
                name="password"
                type="password"
                placeholder="At least 8 characters"
                required
                value={userFormData.password}
                onChange={(e) => {
                  setUserFormData({ ...userFormData, password: e.target.value });
                  if (fieldErrors.password) setFieldErrors({ ...fieldErrors, password: null });
                }}
                error={fieldErrors.password}
                hint="Must be at least 8 characters long."
              />
            )}
          </form>
        </Modal>

        {/* ------------------------------------------ */}
        {/* Modal: Change Role */}
        {/* ------------------------------------------ */}
        <Modal
          open={roleModalOpen}
          onClose={() => !roleSubmitting && setRoleModalOpen(false)}
          title={`Change Role: ${selectedUserForRole?.name || 'User'}`}
          footer={
            <>
              <Button
                variant="ghost"
                onClick={() => setRoleModalOpen(false)}
                disabled={roleSubmitting}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleSaveRole}
                loading={roleSubmitting}
              >
                Update Role
              </Button>
            </>
          }
        >
          <div className={styles.modalBodyContent}>
            <p className={styles.modalInfoText}>
              Select a new system role for <strong>{selectedUserForRole?.name}</strong> (
              {selectedUserForRole?.email}).
            </p>

            {roleError && (
              <p className={styles.formErrorBanner} role="alert">
                {roleError}
              </p>
            )}

            <Select
              label="New Role"
              name="newRoleSelect"
              value={newRole}
              onChange={(e) => setNewRole(e.target.value)}
              options={ROLE_OPTIONS}
              required
            />

            {['firefighter', 'station_officer'].includes(newRole) && (
              <Select
                label="Assigned Fire Station"
                name="roleStationSelect"
                value={roleStationId}
                onChange={(e) => setRoleStationId(e.target.value)}
                options={stations.map((s) => ({ value: s.id, label: s.name }))}
                placeholder="Select a fire station"
                required
                hint="Staff roles require an assigned fire station"
              />
            )}
          </div>
        </Modal>

        {/* ------------------------------------------ */}
        {/* Modal: Confirm Deactivation */}
        {/* ------------------------------------------ */}
        <Modal
          open={deactivateModalOpen}
          onClose={() => !deactivateSubmitting && setDeactivateModalOpen(false)}
          title="Deactivate User Account"
          footer={
            <>
              <Button
                variant="ghost"
                onClick={() => setDeactivateModalOpen(false)}
                disabled={deactivateSubmitting}
              >
                Cancel
              </Button>
              <Button
                variant="dark"
                onClick={handleConfirmDeactivate}
                loading={deactivateSubmitting}
                className={styles.confirmDeactivateBtn}
              >
                Confirm Deactivation
              </Button>
            </>
          }
        >
          <div className={styles.modalBodyContent}>
            {deactivateError && (
              <p className={styles.formErrorBanner} role="alert">
                {deactivateError}
              </p>
            )}

            <p className={styles.deactivatePrompt}>
              Are you sure you want to deactivate the account for{' '}
              <strong>{selectedUserForDeactivate?.name}</strong> (
              {selectedUserForDeactivate?.email})?
            </p>

            <p className={styles.deactivateWarning}>
              The user will be immediately rejected upon their next request and will no longer be able to log in.
            </p>
          </div>
        </Modal>
      </div>
    </AppLayout>
  );
}
