// pages/dev/Styleguide/Styleguide.jsx — Visual style guide displaying design tokens, typography, and UI kit components
import React, { useState } from 'react';
import Button from '../../../components/ui/Button/Button';
import Card from '../../../components/ui/Card/Card';
import Badge from '../../../components/ui/Badge/Badge';
import FormField from '../../../components/ui/FormField/FormField';
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

export default function Styleguide() {
  const [btnLoading, setBtnLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: 'Fire Station 01',
    code: 'ST-01',
    address: '',
  });

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

      {/* 2. Spacing Variables */}
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

            <FormField label="Incident Severity" name="severity" hint="Choose the assessed urgency level">
              <select className={styles.select}>
                <option value="low">Low - Controlled brush or minor smoke</option>
                <option value="medium">Medium - Residential structure fire</option>
                <option value="high">High - Commercial or multiple casualties</option>
                <option value="critical">Critical - Industrial or hazardous chemical</option>
              </select>
            </FormField>
          </div>
        </Card>
      </section>
    </main>
  );
}
