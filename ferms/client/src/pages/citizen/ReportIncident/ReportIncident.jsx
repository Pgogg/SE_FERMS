// pages/citizen/ReportIncident/ReportIncident.jsx — Citizen page for submitting a new emergency incident (§14.7)
import React from 'react';
import { AlertTriangle } from 'lucide-react';
import AppLayout from '../../../components/common/AppLayout/AppLayout';
import Card from '../../../components/ui/Card/Card';
import EmergencyCallCard from '../../../components/common/EmergencyCallCard/EmergencyCallCard';
import IncidentForm from '../../../components/incidents/IncidentForm/IncidentForm';
import styles from './ReportIncident.module.css';

export default function ReportIncident() {
  return (
    <AppLayout>
      <div className={styles.root}>
        {/* Top Emergency Notice Banner per §14.7 */}
        <div className={styles.topNoticeBanner} role="alert">
          <AlertTriangle size={20} className={styles.bannerIcon} aria-hidden="true" />
          <p className={styles.bannerText}>
            <strong>Call 101 or 112 if anyone is in danger.</strong> FERMS does not replace emergency calls.
          </p>
        </div>

        {/* Page Title & Context */}
        <header className={styles.header}>
          <h1 className={styles.title}>Report a Fire Emergency</h1>
          <p className={styles.subtitle}>
            Submit emergency details directly to fire control for immediate nearest-station dispatch.
          </p>
        </header>

        {/* 2-column layout (EmergencyCallCard beside on desktop, above on mobile) */}
        <div className={styles.layoutGrid}>
          <main className={styles.formColumn}>
            <Card variant="light" className={styles.formCard}>
              <IncidentForm />
            </Card>
          </main>

          <aside className={styles.sidebarColumn} aria-label="Emergency hotline information">
            <EmergencyCallCard />
          </aside>
        </div>
      </div>
    </AppLayout>
  );
}
