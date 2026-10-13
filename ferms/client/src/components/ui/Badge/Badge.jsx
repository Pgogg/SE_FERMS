// components/ui/Badge/Badge.jsx — Accessible badge with tinted backgrounds, dark ink text, icons, and labels per §14.3
import React from 'react';
import {
  Clock,
  AlertCircle,
  UserCheck,
  Flame,
  CheckCircle2,
  Archive,
  Info,
  AlertTriangle,
  AlertOctagon,
  Truck,
  Wrench,
  User,
  Radio,
  Shield,
  ShieldCheck,
  Tag,
} from 'lucide-react';
import styles from './Badge.module.css';

// Variant mappings per §14.3 and §14.6
const STATUS_CONFIG = {
  reported: {
    label: 'Reported',
    token: 'var(--st-reported)',
    Icon: Clock,
  },
  unassigned: {
    label: 'Needs dispatch',
    token: 'var(--st-unassigned)',
    Icon: AlertCircle,
  },
  assigned: {
    label: 'Assigned',
    token: 'var(--st-assigned)',
    Icon: UserCheck,
  },
  in_progress: {
    label: 'In progress',
    token: 'var(--st-progress)',
    Icon: Flame,
  },
  resolved: {
    label: 'Resolved',
    token: 'var(--st-resolved)',
    Icon: CheckCircle2,
  },
  closed: {
    label: 'Closed',
    token: 'var(--st-closed)',
    Icon: Archive,
  },
};

const SEVERITY_CONFIG = {
  low: {
    label: 'Low',
    token: 'var(--sev-low)',
    Icon: Info,
  },
  medium: {
    label: 'Medium',
    token: 'var(--sev-medium)',
    Icon: AlertTriangle,
  },
  high: {
    label: 'High',
    token: 'var(--sev-high)',
    Icon: Flame,
  },
  critical: {
    label: 'Critical',
    token: 'var(--sev-critical)',
    Icon: AlertOctagon,
  },
};

const VEHICLE_CONFIG = {
  available: {
    label: 'Available',
    token: 'var(--st-resolved)', // Green token per requirement
    Icon: CheckCircle2,
  },
  dispatched: {
    label: 'Dispatched',
    token: 'var(--st-assigned)', // Blue token per requirement
    Icon: Truck,
  },
  maintenance: {
    label: 'Maintenance',
    token: 'var(--st-closed)', // Grey token per requirement
    Icon: Wrench,
  },
};

const ROLE_CONFIG = {
  citizen: {
    label: 'Citizen',
    token: 'var(--color-muted)',
    Icon: User,
  },
  dispatch_operator: {
    label: 'Dispatch Operator',
    token: 'var(--color-muted)',
    Icon: Radio,
  },
  firefighter: {
    label: 'Firefighter',
    token: 'var(--color-muted)',
    Icon: Flame,
  },
  station_officer: {
    label: 'Station Officer',
    token: 'var(--color-muted)',
    Icon: Shield,
  },
  admin: {
    label: 'Admin',
    token: 'var(--color-muted)',
    Icon: ShieldCheck,
  },
};

export default function Badge({
  variant = 'status',
  value = '',
  className = '',
  children,
}) {
  const normValue = String(value || children || '').toLowerCase().trim();

  let config = null;

  switch (variant) {
    case 'status':
      config = STATUS_CONFIG[normValue];
      break;
    case 'severity':
      config = SEVERITY_CONFIG[normValue];
      break;
    case 'vehicle':
      config = VEHICLE_CONFIG[normValue];
      break;
    case 'role':
      config = ROLE_CONFIG[normValue];
      break;
    default:
      config = null;
  }

  // Fallback neutral badge for unknown values, preventing any runtime crash
  if (!config) {
    const rawLabel = String(value || children || 'Unknown');
    const displayLabel = rawLabel
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');

    config = {
      label: displayLabel,
      token: 'var(--color-muted)',
      Icon: Tag,
    };
  }

  const { label, token, Icon } = config;

  return (
    <span
      className={`${styles.badge} ${className}`.trim()}
      style={{ '--badge-token': token }}
    >
      <Icon className={styles.icon} size={14} aria-hidden="true" />
      <span className={styles.label}>{label}</span>
    </span>
  );
}
