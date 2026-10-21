// pages/dev/Styleguide/Styleguide.jsx — Visual style guide displaying design tokens, typography, and UI kit components
import React, { useState } from 'react';
import { Flame, Shield, Radio, Wrench, User } from 'lucide-react';
import Button from '../../../components/ui/Button/Button';
import Card from '../../../components/ui/Card/Card';
import Badge from '../../../components/ui/Badge/Badge';
import FormField from '../../../components/ui/FormField/FormField';
import Select from '../../../components/ui/Select/Select';
import SeverityPicker from '../../../components/ui/SeverityPicker/SeverityPicker';
import SectionHeading from '../../../components/ui/SectionHeading/SectionHeading';
import StatTile from '../../../components/ui/StatTile/StatTile';
import Stepper from '../../../components/ui/Stepper/Stepper';
import StepCard from '../../../components/ui/StepCard/StepCard';
import Table from '../../../components/ui/Table/Table';
import Tabs from '../../../components/ui/Tabs/Tabs';
import Modal from '../../../components/ui/Modal/Modal';
import { ToastProvider, useToast } from '../../../components/ui/Toast/Toast';
import EmptyState from '../../../components/ui/EmptyState/EmptyState';
import Skeleton from '../../../components/ui/Skeleton/Skeleton';
import Marquee from '../../../components/ui/Marquee/Marquee';
import FlameCard from '../../../components/ui/FlameCard/FlameCard';
import styles from './Styleguide.module.css';

const COLOR_GROUPS = [
  {
    title: 'Brand',
    tokens: [
      { name: '--color-brand', label: 'Brand Action' },
      { name: '--color-brand-hover', label: 'Brand Hover' },
      { name: '--color-brand-tint', label: 'Brand Tint' },
      { name: '--color-brand-text', label: 'Brand Text' },
    ],
  },
  {
    title: 'Ink & Dark',
    tokens: [
      { name: '--color-ink', label: 'Ink Heading / Text' },
      { name: '--color-dark', label: 'Dark Surface' },
      { name: '--color-dark-2', label: 'Dark Raised' },
    ],
  },
  {
    title: 'Backgrounds & Surfaces',
    tokens: [
      { name: '--color-bg', label: 'Page Background' },
      { name: '--color-bg-warm', label: 'Warm Background' },
      { name: '--color-card', label: 'Card Surface' },
      { name: '--color-border', label: 'Hairline Border' },
    ],
  },
  {
    title: 'Severity Tokens',
    tokens: [
      { name: '--sev-low', label: 'Low Severity' },
      { name: '--sev-medium', label: 'Medium Severity' },
      { name: '--sev-high', label: 'High Severity' },
      { name: '--sev-critical', label: 'Critical Severity' },
    ],
  },
  {
    title: 'Status Tokens',
    tokens: [
      { name: '--st-reported', label: 'Reported' },
      { name: '--st-unassigned', label: 'Needs Dispatch' },
      { name: '--st-assigned', label: 'Assigned' },
      { name: '--st-progress', label: 'In Progress' },
      { name: '--st-resolved', label: 'Resolved' },
      { name: '--st-closed', label: 'Closed' },
    ],
  },
];

const SPACING_STEPS = [
  { name: '--space-1', value: '4px' },
  { name: '--space-2', value: '8px' },
  { name: '--space-3', value: '12px' },
  { name: '--space-4', value: '16px' },
  { name: '--space-5', value: '24px' },
  { name: '--space-6', value: '32px' },
  { name: '--space-7', value: '48px' },
  { name: '--space-8', value: '64px' },
  { name: '--space-9', value: '96px' },
];

function ToastControls() {
  const toast = useToast();

  return (
    <div className={styles.row}>
      <Button
        variant="primary"
        onClick={() => toast.show({ type: 'success', message: 'Engine E-01 dispatched to Marine Drive.' })}
      >
        Trigger Success Toast
      </Button>
      <Button
        variant="dark"
        onClick={() => toast.show({ type: 'error', message: 'Failed to assign station: No available vehicles.' })}
      >
        Trigger Error Toast
      </Button>
      <Button
        variant="ghost"
        onClick={() => toast.show({ type: 'info', message: 'Broadcast: High wind warning in zone 4.' })}
      >
        Trigger Info Toast
      </Button>
    </div>
  );
}

function StyleguideContent() {
  const [btnLoading, setBtnLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: 'Fire Station 01',
    code: 'ST-01',
    address: '',
  });

  // UI Kit interactive state
  const [selectedStation, setSelectedStation] = useState('st-1');
  const [severity, setSeverity] = useState('high');
  const [stepperKey, setStepperKey] = useState('02');
  const [activeTab, setActiveTab] = useState('vehicles');
  const [modalOpen, setModalOpen] = useState(false);
  const [tableLoading, setTableLoading] = useState(false);

  const sampleColumns = [
    { key: 'code', header: 'Call Sign' },
    { key: 'type', header: 'Vehicle Type' },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <Badge variant="vehicle" value={row.status} />,
    },
    { key: 'station', header: 'Station' },
  ];

  const sampleRows = [
    { id: 1, code: 'ENG-101', type: 'Pumper Truck', status: 'available', station: 'Station 1 — Marine Lines' },
    { id: 2, code: 'LDR-204', type: 'Ladder 50m', status: 'dispatched', station: 'Station 2 — Byculla' },
    { id: 3, code: 'RES-302', type: 'Heavy Rescue', status: 'maintenance', station: 'Station 1 — Marine Lines' },
    { id: 4, code: 'WTR-401', type: 'Water Bowser 10KL', status: 'available', station: 'Station 3 — Dadar' },
  ];

  return (
    <main className={styles.container}>
      <header className={styles.header}>
        <span className="eyebrow">Design System & UI Kit</span>
        <h1 className="display-hero">FERMS Styleguide</h1>
        <p className="body">
          Interactive catalog of color tokens, typography scale, spacing variables, and foundational UI components.
        </p>
      </header>

      {/* 1. Color Tokens */}
      <section className={styles.section}>
        <h2 className="display-section">1. Color Tokens</h2>
        <div className={styles.swatchGrid}>
          {COLOR_GROUPS.map((group) => (
            <div key={group.title} className={styles.groupCard}>
              <h3 className={styles.groupTitle}>{group.title}</h3>
              <div className={styles.swatchList}>
                {group.tokens.map((t) => (
                  <div key={t.name} className={styles.swatchRow}>
                    <div
                      className={styles.swatchBox}
                      style={{ backgroundColor: `var(${t.name})` }}
                    />
                    <div className={styles.swatchMeta}>
                      <span className={styles.tokenName}>{t.name}</span>
                      <span className={styles.tokenLabel}>{t.label}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 2. Spacing Scale */}
      <section className={styles.section}>
        <h2 className="display-section">2. Spacing Scale</h2>
        <div className={styles.spacingGrid}>
          {SPACING_STEPS.map((s) => (
            <div key={s.name} className={styles.spacingItem}>
              <div
                className={styles.spacingBar}
                style={{ width: `var(${s.name})` }}
              />
              <span className={styles.spacingName}>
                {s.name} ({s.value})
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* 3. Typography Scale */}
      <section className={styles.section}>
        <h2 className="display-section">3. Typography Scale</h2>
        <Card variant="light" className={styles.typeCard}>
          <div className={styles.typeRow}>
            <span className={styles.typeTag}>.display-hero</span>
            <div className="display-hero">Emergency Fire Response</div>
          </div>
          <div className={styles.typeRow}>
            <span className={styles.typeTag}>.display-section</span>
            <div className="display-section">Nearest Station Dispatch</div>
          </div>
          <div className={styles.typeRow}>
            <span className={styles.typeTag}>.display-card</span>
            <div className="display-card">Incident Details &amp; Timeline</div>
          </div>
          <div className={styles.typeRow}>
            <span className={styles.typeTag}>.eyebrow</span>
            <span className="eyebrow">Real-time Emergency Monitoring</span>
          </div>
          <div className={styles.typeRow}>
            <span className={styles.typeTag}>.body</span>
            <p className="body">
              FERMS provides end-to-end incident logging, automated resource allocation, and multi-agency coordination
              across regional fire stations. Built for high performance and WCAG AA accessibility compliance.
            </p>
          </div>
          <div className={styles.typeRow}>
            <span className={styles.typeTag}>.caption</span>
            <span className="caption">
              Updated 2 minutes ago &bull; GPS coordinates: 19.0760 N, 72.8777 E &bull; Confidential
            </span>
          </div>
        </Card>
      </section>

      {/* 4. Buttons */}
      <section className={styles.section}>
        <h2 className="display-section">4. Buttons</h2>
        <div className={styles.componentGrid}>
          <Card variant="light">
            <h3 className="display-card">Primary (Orange Pill, Ink Text)</h3>
            <div className={styles.row}>
              <Button variant="primary" size="lg">Large Action</Button>
              <Button variant="primary" size="md">Medium Action</Button>
              <Button variant="primary" size="md" disabled>Disabled</Button>
            </div>
          </Card>

          <Card variant="light">
            <h3 className="display-card">Dark &amp; Ghost</h3>
            <div className={styles.row}>
              <Button variant="dark" size="lg">Dark Pill Large</Button>
              <Button variant="dark" size="md">Dark Medium</Button>
              <Button variant="ghost" size="md">Ghost Outlined</Button>
            </div>
          </Card>

          <Card variant="light">
            <h3 className="display-card">Loading &amp; Link States</h3>
            <div className={styles.row}>
              <Button
                variant="primary"
                loading={btnLoading}
                onClick={() => setBtnLoading(!btnLoading)}
              >
                {btnLoading ? 'Processing...' : 'Toggle Loading'}
              </Button>
              <Button variant="dark" loading>Submitting</Button>
              <Button as="a" href="#buttons" variant="ghost">Link as Button</Button>
            </div>
          </Card>
        </div>
      </section>

      {/* 5. Cards */}
      <section className={styles.section}>
        <h2 className="display-section">5. Cards</h2>
        <div className={styles.cardGrid}>
          <Card variant="light">
            <span className="eyebrow">Variant: Light</span>
            <h3 className="display-card">Default Card Surface</h3>
            <p className="body">Background: var(--color-card) with hairline border.</p>
          </Card>

          <Card variant="warm">
            <span className="eyebrow">Variant: Warm</span>
            <h3 className="display-card">Warm Section Card</h3>
            <p className="body">Background: var(--color-bg-warm) for alternate sections.</p>
          </Card>

          <Card variant="dark">
            <span className="eyebrow" style={{ color: 'var(--color-brand)' }}>Variant: Dark</span>
            <h3 className="display-card" style={{ color: 'var(--color-bg)' }}>Emergency Floating Card</h3>
            <p className="body" style={{ color: 'var(--color-bg)' }}>
              Background: var(--color-dark) with white text.
            </p>
          </Card>

          <Card variant="accent">
            <span className="eyebrow" style={{ color: 'var(--color-ink)' }}>Variant: Accent</span>
            <h3 className="display-card" style={{ color: 'var(--color-ink)' }}>Brand Orange Accent</h3>
            <p className="body" style={{ color: 'var(--color-ink)' }}>
              Background: var(--color-brand) with dark ink text.
            </p>
          </Card>
        </div>
      </section>

      {/* 6. Badges */}
      <section className={styles.section}>
        <h2 className="display-section">6. Badges</h2>
        <div className={styles.componentGrid}>
          <Card variant="light">
            <h3 className="display-card">Status Badges</h3>
            <div className={styles.badgeRow}>
              <Badge variant="status" value="reported" />
              <Badge variant="status" value="unassigned" />
              <Badge variant="status" value="assigned" />
              <Badge variant="status" value="in_progress" />
              <Badge variant="status" value="resolved" />
              <Badge variant="status" value="closed" />
            </div>
          </Card>

          <Card variant="light">
            <h3 className="display-card">Severity Badges</h3>
            <div className={styles.badgeRow}>
              <Badge variant="severity" value="low" />
              <Badge variant="severity" value="medium" />
              <Badge variant="severity" value="high" />
              <Badge variant="severity" value="critical" />
            </div>
          </Card>

          <Card variant="light">
            <h3 className="display-card">Vehicle &amp; Role Badges</h3>
            <div className={styles.badgeRow}>
              <Badge variant="vehicle" value="available" />
              <Badge variant="vehicle" value="dispatched" />
              <Badge variant="vehicle" value="maintenance" />
              <Badge variant="role" value="citizen" />
              <Badge variant="role" value="dispatch_operator" />
              <Badge variant="role" value="firefighter" />
              <Badge variant="role" value="station_officer" />
              <Badge variant="role" value="admin" />
              <Badge variant="status" value="custom_unknown" />
            </div>
          </Card>
        </div>
      </section>

      {/* 7. FormField */}
      <section className={styles.section}>
        <h2 className="display-section">7. FormField</h2>
        <Card variant="light" className={styles.formCard}>
          <div className={styles.formGrid}>
            <FormField
              label="Station Name"
              name="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />

            <FormField
              label="Station Call Sign"
              name="code"
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value })}
              hint="Must be a unique 5-character alphanumeric identifier"
              required
            />

            <FormField
              label="Street Address"
              name="address"
              placeholder="e.g. 104 Marine Lines, Mumbai"
              error="Address is required to calculate nearest station distance"
              required
            />
          </div>
        </Card>
      </section>

      {/* 8. SectionHeading */}
      <section className={styles.section}>
        <h2 className="display-section">8. SectionHeading</h2>
        <Card variant="light">
          <SectionHeading
            eyebrow="Real-Time Response"
            title="Rapid Emergency Dispatch"
            intro="Instant nearest-station vehicle routing with live status telemetry."
          />
        </Card>
      </section>

      {/* 9. StatTile */}
      <section className={styles.section}>
        <h2 className="display-section">9. StatTile</h2>
        <div className={styles.statGrid}>
          <StatTile
            tone="light"
            value="14"
            label="Active Incidents"
            sublabel="3 critical priority"
          />
          <StatTile
            tone="light"
            value="98.4%"
            label="Nearest Station Match"
            sublabel="Average dispatch 4.2s"
          />
          <StatTile
            tone="dark"
            value="38"
            label="On-Duty Personnel"
            sublabel="12 stations online"
          />
          <StatTile
            tone="dark"
            value="5"
            label="Operating Roles"
            sublabel="Role-based access active"
          />
        </div>
      </section>

      {/* 10. Select */}
      <section className={styles.section}>
        <h2 className="display-section">10. Select</h2>
        <Card variant="light">
          <div className={styles.formGrid}>
            <Select
              label="Assigned Fire Station"
              name="stationId"
              value={selectedStation}
              onChange={(e) => setSelectedStation(e.target.value)}
              options={[
                { value: 'st-1', label: 'Station 01 — Marine Lines (6 Available)' },
                { value: 'st-2', label: 'Station 02 — Byculla (3 Available)' },
                { value: 'st-3', label: 'Station 03 — Dadar (8 Available)' },
              ]}
              hint="Selecting an active station routes dispatch directly."
            />
            <Select
              label="Station with Error State"
              name="stationError"
              value=""
              error="A valid station selection is required for this unit."
              options={[]}
            />
          </div>
        </Card>
      </section>

      {/* 11. SeverityPicker */}
      <section className={styles.section}>
        <h2 className="display-section">11. SeverityPicker</h2>
        <Card variant="light">
          <p className="caption" style={{ marginBottom: 'var(--space-3)' }}>
            Selected urgency level: <strong>{severity.toUpperCase()}</strong>
          </p>
          <SeverityPicker
            value={severity}
            onChange={(val) => setSeverity(val)}
          />
        </Card>
      </section>

      {/* 12. Stepper */}
      <section className={styles.section}>
        <h2 className="display-section">12. Stepper</h2>
        <Card variant="light">
          <Stepper
            currentKey={stepperKey}
            onStepClick={(key) => setStepperKey(key)}
            steps={[
              { key: '01', label: 'Location' },
              { key: '02', label: 'Incident Details' },
              { key: '03', label: 'Confirmation' },
            ]}
          />
          <div style={{ marginTop: 'var(--space-4)', display: 'flex', gap: 'var(--space-2)' }}>
            <Button size="md" variant="ghost" onClick={() => setStepperKey('01')}>Step 01</Button>
            <Button size="md" variant="ghost" onClick={() => setStepperKey('02')}>Step 02</Button>
            <Button size="md" variant="ghost" onClick={() => setStepperKey('03')}>Step 03</Button>
          </div>
        </Card>
      </section>

      {/* 13. StepCard */}
      <section className={styles.section}>
        <h2 className="display-section">13. StepCard</h2>
        <div className={styles.cardGrid}>
          <StepCard
            number={1}
            title="Report"
            description="Citizens submit verified coordinates and live photo assessments with emergency priority."
            active={stepperKey === '01'}
          />
          <StepCard
            number={2}
            title="Dispatch"
            description="Automated nearest-station engine calculates turnouts and assigns available pumpers."
            active={stepperKey === '02'}
          />
          <StepCard
            number={3}
            title="Resolve"
            description="Responders mark progress from Assigned to In-Progress, Resolved, and Closed."
            active={stepperKey === '03'}
          />
        </div>
      </section>

      {/* 14. Table */}
      <section className={styles.section}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 className="display-section" style={{ margin: 0 }}>14. Table</h2>
          <Button
            size="md"
            variant="ghost"
            onClick={() => setTableLoading((prev) => !prev)}
          >
            {tableLoading ? 'Show Loaded Rows' : 'Show Skeleton Loading'}
          </Button>
        </div>
        <Table
          columns={sampleColumns}
          rows={sampleRows}
          rowKey="id"
          loading={tableLoading}
          onRowClick={(row) => alert(`Selected vehicle: ${row.code} (${row.type})`)}
        />
      </section>

      {/* 15. Tabs */}
      <section className={styles.section}>
        <h2 className="display-section">15. Tabs</h2>
        <Card variant="light">
          <Tabs
            value={activeTab}
            onChange={(key) => setActiveTab(key)}
            tabs={[
              { key: 'vehicles', label: 'Vehicles', count: 18 },
              { key: 'personnel', label: 'Personnel', count: 42 },
              { key: 'equipment', label: 'Station Logs' },
            ]}
          />
          <div style={{ marginTop: 'var(--space-4)', padding: 'var(--space-4)', background: 'var(--color-bg-warm)', borderRadius: 'var(--radius-sm)' }}>
            Active tab content: <strong>{activeTab.toUpperCase()}</strong>
          </div>
        </Card>
      </section>

      {/* 16. Modal, Toast, Skeleton, EmptyState */}
      <section className={styles.section}>
        <h2 className="display-section">16. Feedback &amp; Overlays</h2>
        <div className={styles.componentGrid}>
          <Card variant="light">
            <h3 className="display-card">Modal Dialog</h3>
            <p className="body" style={{ marginBottom: 'var(--space-4)' }}>
              Accessible modal dialog with focus management, backdrop blur, and escape key listener.
            </p>
            <Button variant="primary" onClick={() => setModalOpen(true)}>
              Open Confirmation Modal
            </Button>

            <Modal
              open={modalOpen}
              onClose={() => setModalOpen(false)}
              title="Confirm Incident Escalation"
              footer={
                <>
                  <Button variant="ghost" onClick={() => setModalOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    onClick={() => {
                      setModalOpen(false);
                      alert('Escalated to 2nd Alarm Dispatch!');
                    }}
                  >
                    Confirm 2nd Alarm
                  </Button>
                </>
              }
            >
              <p className="body">
                Are you sure you want to escalate Incident #INC-2024-81 to <strong>Critical Severity</strong>?
                This will dispatch 2 additional pumpers and notify the duty chief.
              </p>
            </Modal>
          </Card>

          <Card variant="light">
            <h3 className="display-card">Toast System</h3>
            <p className="body" style={{ marginBottom: 'var(--space-4)' }}>
              Non-blocking notification toasts with auto-dismiss after 5s and polite aria-live announcement.
            </p>
            <ToastControls />
          </Card>

          <Card variant="light">
            <h3 className="display-card">Skeleton Loader</h3>
            <p className="body" style={{ marginBottom: 'var(--space-3)' }}>
              Multi-line shimmering skeleton state for loading cards and tables.
            </p>
            <Skeleton lines={3} />
          </Card>

          <Card variant="light">
            <h3 className="display-card">EmptyState</h3>
            <EmptyState
              title="No Incidents Logged"
              description="All sectors are clear. Any incoming calls will show here in real-time."
              action={
                <Button variant="ghost" size="md">
                  Refresh Status
                </Button>
              }
            />
          </Card>
        </div>
      </section>

      {/* 17. Marquee */}
      <section className={styles.section}>
        <h2 className="display-section">17. Marquee</h2>
        <p className="body" style={{ marginBottom: 'var(--space-4)' }}>
          Looping orange ticker band — CSS animation only. Hover to pause. Reduced-motion: static wrapped text.
        </p>

        {/* Default speed */}
        <div style={{ marginBottom: 'var(--space-4)' }}>
          <p className="body" style={{ marginBottom: 'var(--space-2)', color: 'var(--color-muted)' }}>Default speed (24 s)</p>
          <Marquee
            items={[
              'Real-time dispatch',
              'Nearest-station assignment',
              'Live incident tracking',
              'Built for five roles',
              'Resolve and close with history',
            ]}
          />
        </div>

        {/* Fast speed */}
        <div>
          <p className="body" style={{ marginBottom: 'var(--space-2)', color: 'var(--color-muted)' }}>Fast speed (10 s)</p>
          <Marquee
            speed={10}
            items={[
              'Fire Emergency Response',
              'Dispatch in seconds',
              'Live map tracking',
              'Nearest station auto-assigned',
            ]}
          />
        </div>
      </section>

      {/* 18. FlameCard */}
      <section className={styles.section}>
        <h2 className="display-section">18. FlameCard</h2>
        <p className="body" style={{ marginBottom: 'var(--space-5)' }}>
          Flame/teardrop shaped card (original CSS clip-path). Hover for lift + orange glow.
          Used on the landing "Built for five roles" band. Wraps into a flex grid on phones.
        </p>

        {/* Warm-band background matches the landing section */}
        <div
          style={{
            background: 'var(--color-bg-warm)',
            borderRadius: 'var(--radius-lg)',
            padding: 'var(--space-7) var(--space-5)',
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'center',
            gap: 'var(--space-5)',
          }}
          role="list"
          aria-label="Five user roles"
        >
          <div role="listitem">
            <FlameCard
              icon={<User size={28} strokeWidth={1.5} />}
              title="Citizen"
            >
              Report fires instantly
            </FlameCard>
          </div>
          <div role="listitem">
            <FlameCard
              icon={<Radio size={28} strokeWidth={1.5} />}
              title="Dispatch"
            >
              Auto nearest-station
            </FlameCard>
          </div>
          <div role="listitem">
            <FlameCard
              icon={<Flame size={28} strokeWidth={1.5} />}
              title="Firefighter"
            >
              Respond in the field
            </FlameCard>
          </div>
          <div role="listitem">
            <FlameCard
              icon={<Shield size={28} strokeWidth={1.5} />}
              title="Station Officer"
            >
              Manage resources
            </FlameCard>
          </div>
          <div role="listitem">
            <FlameCard
              icon={<Wrench size={28} strokeWidth={1.5} />}
              title="Administrator"
            >
              Full system control
            </FlameCard>
          </div>
        </div>
      </section>
    </main>
  );
}

export default function Styleguide() {
  return (
    <ToastProvider>
      <StyleguideContent />
    </ToastProvider>
  );
}
