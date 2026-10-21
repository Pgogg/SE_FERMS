// components/ui/Marquee/Marquee.jsx — Looping orange ticker band (§14.1, §14.8 marquee band)
// CSS-only animation; no JS timers. Duplicate track is aria-hidden per §14.10.
import React from 'react';
import styles from './Marquee.module.css';

const DOT = '\u00A0\u2022\u00A0'; // non-breaking space · non-breaking space

/**
 * Marquee – scrolling orange band with ink-coloured display-font text.
 *
 * @param {string[]} items  – phrases to display (e.g. ['Real-time dispatch', 'Live tracking'])
 * @param {number}   speed  – seconds for one full loop (default 24). Smaller = faster.
 */
export default function Marquee({ items = [], speed = 24 }) {
  if (!items.length) return null;

  // Build a single separator-joined string from the items array
  const track = items.join(DOT) + DOT;

  return (
    <div
      className={styles.band}
      /* The element is purely decorative; screen readers skip it */
      aria-hidden="true"
      role="presentation"
    >
      <div
        className={styles.inner}
        style={{ '--marquee-speed': `${speed}s` }}
      >
        {/* Primary (visible) track */}
        <span className={styles.track}>{track}</span>
        {/* Duplicate track that seamlessly loops; hidden from AT */}
        <span className={styles.track} aria-hidden="true">{track}</span>
      </div>
    </div>
  );
}
