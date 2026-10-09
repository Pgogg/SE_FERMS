// components/ui/StepCard/StepCard.jsx — Individual step card within the report-an-incident wizard flow
import React from 'react';
import styles from './StepCard.module.css';

export default function StepCard({ children }) { return <div className={styles.root}>{children}</div>; }
