// pages/public/Landing/Landing.jsx — Public landing placeholder with UI Kit shortcuts & emergency contact info
import React from 'react';
import { Link } from 'react-router-dom';
import Button from '../../../components/ui/Button/Button';
import Card from '../../../components/ui/Card/Card';
import Badge from '../../../components/ui/Badge/Badge';
import { EMERGENCY_NUMBERS } from '../../../constants';
import styles from './Landing.module.css';

export default function Landing() {
  return (
    <main className={styles.root}>
      <div className={styles.container}>
        <Card variant="light" className={styles.heroCard}>
          <div className={styles.badgeRow}>
            <Badge variant="status" value="in_progress">
              System Online
            </Badge>
            <Badge variant="role" value="dispatch_operator">
              Development Mode
            </Badge>
          </div>

          <h1 className={`display-hero ${styles.title}`}>FERMS</h1>
          <p className={`eyebrow ${styles.subtitle}`}>
            Fire &amp; Emergency Response Management System
          </p>

          <p className={`body ${styles.description}`}>
            Welcome to FERMS. The full public landing experience is scheduled for development in Track 1.
            In the meantime, the design token foundation, typography, and UI component catalog (Button, Card, Badge, FormField) are available in the interactive styleguide.
          </p>

          <div className={styles.actionRow}>
            <Link to="/dev/styleguide" style={{ textDecoration: 'none' }}>
              <Button variant="primary" size="lg">
                View UI Styleguide (/dev/styleguide)
              </Button>
            </Link>
            <Link to="/login" style={{ textDecoration: 'none' }}>
              <Button variant="dark" size="lg">
                Go to Login (/login)
              </Button>
            </Link>
          </div>
        </Card>

        <aside className={styles.emergencyBanner} aria-label="Emergency hotline information">
          <div className={styles.emergencyInfo}>
            <span className={styles.emergencyTitle}>Immediate Fire Emergency?</span>
            <span className={styles.emergencyText}>
              Direct hotline for immediate response assistance:
            </span>
          </div>
          <span className={styles.emergencyPhone}>
            DIAL {EMERGENCY_NUMBERS.fire} / {EMERGENCY_NUMBERS.general}
          </span>
        </aside>
      </div>
    </main>
  );
}
