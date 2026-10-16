// components/common/EmergencyCallCard/EmergencyCallCard.jsx — Prominent card showing the emergency hotline for the public landing page
import React from 'react';
import Card from '../../ui/Card/Card';
import { EMERGENCY_NUMBERS } from '../../../constants';
import styles from './EmergencyCallCard.module.css';

export default function EmergencyCallCard() {
  return (
    <Card variant="dark" className={styles.root}>
      <div className={styles.iconWrap} aria-hidden="true">
        {/* Phone icon (inline SVG) */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="currentColor"
          width="24"
          height="24"
          aria-hidden="true"
        >
          <path d="M6.62 10.79a15.053 15.053 0 0 0 6.59 6.59l2.2-2.2a1 1 0 0 1 1.02-.24c1.12.37 2.33.57 3.57.57a1 1 0 0 1 1 1V20a1 1 0 0 1-1 1C10.61 21 3 13.39 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.45.57 3.57a1 1 0 0 1-.25 1.02l-2.2 2.2z" />
        </svg>
      </div>

      <div className={styles.body}>
        <p className={styles.text}>
          Emergency? Call{' '}
          <a
            href={`tel:${EMERGENCY_NUMBERS.fire}`}
            className={styles.telLink}
            aria-label={`Call Fire Emergency ${EMERGENCY_NUMBERS.fire}`}
          >
            {EMERGENCY_NUMBERS.fire}
          </a>{' '}
          (Fire) or{' '}
          <a
            href={`tel:${EMERGENCY_NUMBERS.general}`}
            className={styles.telLink}
            aria-label={`Call General Emergency ${EMERGENCY_NUMBERS.general}`}
          >
            {EMERGENCY_NUMBERS.general}
          </a>
        </p>
      </div>
    </Card>
  );
}
