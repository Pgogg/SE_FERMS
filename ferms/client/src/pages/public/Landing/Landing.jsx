// pages/public/Landing/Landing.jsx — Full public landing page per §14.8 (W7-P-FE-1)
// Eight sections exactly as specified in SystemDesign §14.8.
// No images yet; hero uses CSS gradient fallback (var(--color-dark)).
// Images to add: hero background fire-station photo (WebP, from Unsplash, CC0).
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Flame, Zap, MapPin, BarChart3, ShieldCheck,
  User, Radio, Truck, Building2, Settings2,
  PhoneCall, ArrowRight, Clock, CheckCircle2,
} from 'lucide-react';

import AppNavbar from '../../../components/common/AppNavbar/AppNavbar';
import EmergencyCallCard from '../../../components/common/EmergencyCallCard/EmergencyCallCard';
import Button from '../../../components/ui/Button/Button';
import Card from '../../../components/ui/Card/Card';
import SectionHeading from '../../../components/ui/SectionHeading/SectionHeading';
import Marquee from '../../../components/ui/Marquee/Marquee';
import FlameCard from '../../../components/ui/FlameCard/FlameCard';
import StatTile from '../../../components/ui/StatTile/StatTile';
import StepCard from '../../../components/ui/StepCard/StepCard';
import { useAuth } from '../../../context/AuthContext';
import styles from './Landing.module.css';

// ── Marquee phrases (§14.8) ────────────────────────────────────────────────
const MARQUEE_ITEMS = [
  'Real-time dispatch',
  'Nearest-station assignment',
  'Live incident tracking',
  'Built for five roles',
  'Location-aware reporting',
  'Resolve and close with history',
];

// ── Key features (§14.8 §4) ────────────────────────────────────────────────
const FEATURES = [
  {
    id: 'f1',
    num: '01',
    title: 'Location-aware reporting',
    body: 'Citizens pick their location on a map or enter an address. The report reaches the server with exact coordinates, so the nearest station can be calculated instantly.',
    icon: <MapPin size={20} strokeWidth={1.5} aria-hidden="true" />,
  },
  {
    id: 'f2',
    num: '02',
    title: 'Nearest-station dispatch',
    body: 'The dispatch engine scores all stations by proximity, picks the one with an available vehicle, and creates the assignment automatically — target under 5 seconds (PE-4).',
    icon: <Zap size={20} strokeWidth={1.5} aria-hidden="true" />,
  },
  {
    id: 'f3',
    num: '03',
    title: 'Live incident monitoring',
    body: 'Operators and officers see the map update in real time as incidents are reported, assigned, and actioned via Socket.IO. No page refresh required.',
    icon: <BarChart3 size={20} strokeWidth={1.5} aria-hidden="true" />,
  },
  {
    id: 'f4',
    num: '04',
    title: 'Resolve and close with history',
    body: 'Each status transition is timestamped and stored. The resolving firefighter writes a closing summary. Officers archive the incident with a single confirmation.',
    icon: <CheckCircle2 size={20} strokeWidth={1.5} aria-hidden="true" />,
  },
];

// ── Roles (§14.8 §5) ───────────────────────────────────────────────────────
const ROLES = [
  {
    icon: <User size={28} strokeWidth={1.5} aria-hidden="true" />,
    title: 'Citizen',
    desc: 'Report fires instantly from your device. Track your report status live.',
  },
  {
    icon: <Radio size={28} strokeWidth={1.5} aria-hidden="true" />,
    title: 'Dispatch Operator',
    desc: 'Monitor the live map, override assignments, and manage all active incidents.',
  },
  {
    icon: <Truck size={28} strokeWidth={1.5} aria-hidden="true" />,
    title: 'Firefighter',
    desc: 'See your assigned incidents, update status in the field, and write field notes.',
  },
  {
    icon: <Building2 size={28} strokeWidth={1.5} aria-hidden="true" />,
    title: 'Station Officer',
    desc: 'Manage your station fleet and crew. View incidents assigned to your station.',
  },
  {
    icon: <Settings2 size={28} strokeWidth={1.5} aria-hidden="true" />,
    title: 'Administrator',
    desc: 'Create users, manage all stations, assign personnel, and close incidents.',
  },
];

// ── True facts as StatTiles (§14.8 §5 — no invented numbers) ──────────────
const STATS = [
  { value: '5', label: 'User roles' },
  { value: '4', label: 'Severity levels' },
  { value: '<5s', label: 'Nearest-station target (PE-4)' },
  { value: 'Live', label: 'Real-time updates via Socket.IO' },
];

// ── Main component ─────────────────────────────────────────────────────────
export default function Landing() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [activeFeature, setActiveFeature] = useState('f1');

  const handleReport = () => navigate('/report');

  return (
    <div className={styles.page}>
      {/* ══════════════════════════════════════════════════════════════
          §1 HERO — dark band, AppNavbar floating over it
          ══════════════════════════════════════════════════════════════ */}
      <section className={styles.hero} aria-label="Hero">
        {/* AppNavbar is positioned absolute/sticky over the hero */}
        <AppNavbar />

        <div className={styles.heroInner}>
          <div className={styles.heroContent}>
            {/* Single h1 on the page (§14.10) */}
            <span className={styles.heroEyebrow}>
              Fire Emergency Response Management
            </span>
            <h1 className={styles.heroTitle}>
              Report a fire.{' '}
              <span className={styles.heroTitleAccent}>
                Reach the nearest station.
              </span>
            </h1>
            <p className={styles.heroBody}>
              FERMS connects citizens with fire stations automatically.
              Report an incident from your device and the nearest station
              with an available vehicle is dispatched within seconds.
            </p>
            <div className={styles.heroCtas}>
              <Button
                variant="primary"
                size="lg"
                onClick={handleReport}
                id="hero-report-btn"
              >
                <Flame size={18} strokeWidth={1.5} aria-hidden="true" />
                Report a Fire
              </Button>
              {!isAuthenticated && (
                <Button
                  as={Link}
                  to="/login"
                  variant="ghost"
                  size="lg"
                  className={styles.heroLoginBtn}
                  id="hero-login-btn"
                >
                  Log In
                </Button>
              )}
            </div>
            {/* Safety disclaimer — visible, never hidden */}
            <p className={styles.safetyLine}>
              <ShieldCheck size={14} strokeWidth={1.5} aria-hidden="true" />
              {' '}If anyone is in immediate danger, call{' '}
              <a href="tel:101" className={styles.safetyLink}>101</a> or{' '}
              <a href="tel:112" className={styles.safetyLink}>112</a>.
              FERMS does not replace emergency calls.
            </p>
          </div>

          {/* EmergencyCallCard at the lower right of the hero */}
          <aside
            className={styles.heroEmergencyCard}
            aria-label="Emergency hotline"
          >
            <EmergencyCallCard />
          </aside>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════
          §2 MARQUEE BAND (§14.8 §2)
          ══════════════════════════════════════════════════════════════ */}
      <Marquee items={MARQUEE_ITEMS} speed={28} />

      {/* ══════════════════════════════════════════════════════════════
          §3 ABOUT / WHY FERMS (§14.8 §3)
          ══════════════════════════════════════════════════════════════ */}
      <section className={styles.section} aria-labelledby="about-heading">
        <div className={styles.container}>
          <div className={styles.aboutGrid}>
            <div className={styles.aboutText}>
              <SectionHeading
                eyebrow="Why FERMS"
                title="Faster response. Better coordination."
                intro="Traditional fire-reporting relies on phone calls and manual dispatch.
                  FERMS gives every role a purpose-built interface and automates the
                  assignment logic so resources reach the scene sooner."
                id="about-heading"
              />

              <Card variant="accent" className={styles.aboutHighlights}>
                <div className={styles.highlightRow}>
                  <PhoneCall size={20} strokeWidth={1.5} aria-hidden="true" />
                  <div>
                    <strong>Report in seconds</strong>
                    <p>Tap the map, describe the incident, choose severity — done. No call wait time.</p>
                  </div>
                </div>
                <div className={styles.highlightRow}>
                  <Zap size={20} strokeWidth={1.5} aria-hidden="true" />
                  <div>
                    <strong>Dispatch with confidence</strong>
                    <p>Operators see every incident on a live map. Override any auto-assignment in one click.</p>
                  </div>
                </div>
              </Card>
            </div>

            {/* SVG illustration — no copyrighted image used */}
            <figure className={styles.aboutIllustration} aria-hidden="true">
              <svg
                viewBox="0 0 320 280"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className={styles.aboutSvg}
                aria-hidden="true"
                focusable="false"
              >
                {/* Station building */}
                <rect x="90" y="100" width="140" height="120" rx="8" fill="var(--color-dark)" />
                <rect x="120" y="150" width="40" height="70" rx="4" fill="var(--color-dark-2)" />
                <rect x="180" y="130" width="35" height="30" rx="4" fill="var(--color-dark-2)" />
                {/* Roof */}
                <polygon points="80,100 160,40 240,100" fill="var(--color-brand)" />
                {/* Flag / flame detail */}
                <circle cx="160" cy="52" r="10" fill="var(--color-bg)" />
                <path d="M160 46c-1.5 3-3 5-2 8 1 2.5 4 2.5 4 2.5s-1-3 1-5c2 2 2 5 2 5s3 0 3-3c0-3-2-5-3-7.5-1 1.5-4 0-5 0z" fill="var(--color-brand)" />
                {/* Truck */}
                <rect x="40" y="185" width="80" height="35" rx="6" fill="var(--sev-high)" />
                <rect x="100" y="175" width="40" height="20" rx="4" fill="var(--sev-high)" />
                <circle cx="55" cy="222" r="9" fill="var(--color-dark)" />
                <circle cx="55" cy="222" r="4" fill="var(--color-bg-warm)" />
                <circle cx="108" cy="222" r="9" fill="var(--color-dark)" />
                <circle cx="108" cy="222" r="4" fill="var(--color-bg-warm)" />
                {/* Signal waves */}
                <path d="M240 90 q20-10 20-30" stroke="var(--color-brand)" strokeWidth="2" strokeLinecap="round" fill="none" />
                <path d="M240 90 q32-16 30-46" stroke="var(--color-brand)" strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.5" />
                {/* Map pin */}
                <circle cx="240" cy="155" r="16" fill="var(--color-brand)" />
                <circle cx="240" cy="152" r="5" fill="var(--color-ink)" />
                <path d="M240 165 l0 12" stroke="var(--color-brand)" strokeWidth="3" strokeLinecap="round" />
              </svg>
            </figure>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════
          §4 KEY FEATURES — numbered 01–04, active item in orange tab
          ══════════════════════════════════════════════════════════════ */}
      <section
        className={`${styles.section} ${styles.sectionWarm}`}
        aria-labelledby="features-heading"
      >
        <div className={styles.container}>
          <SectionHeading
            eyebrow="Key Features"
            title="Everything a fire team needs"
            align="center"
            id="features-heading"
          />

          <div className={styles.featuresLayout}>
            {/* Left: numbered tabs */}
            <nav
              className={styles.featureTabs}
              aria-label="Key features navigation"
            >
              {FEATURES.map((f) => (
                <button
                  key={f.id}
                  className={`${styles.featureTab} ${activeFeature === f.id ? styles.featureTabActive : ''}`}
                  onClick={() => setActiveFeature(f.id)}
                  aria-pressed={activeFeature === f.id}
                  aria-controls={`feature-panel-${f.id}`}
                  id={`feature-tab-${f.id}`}
                >
                  <span className={`${styles.featureNum} ${activeFeature === f.id ? styles.featureNumActive : ''}`}>
                    {f.num}
                  </span>
                  <span className={styles.featureTabTitle}>{f.title}</span>
                </button>
              ))}
            </nav>

            {/* Right: active feature panel */}
            {FEATURES.map((f) => (
              <div
                key={f.id}
                id={`feature-panel-${f.id}`}
                role="region"
                aria-labelledby={`feature-tab-${f.id}`}
                className={`${styles.featurePanel} ${activeFeature === f.id ? styles.featurePanelVisible : ''}`}
                hidden={activeFeature !== f.id}
              >
                <div className={styles.featurePanelIcon} aria-hidden="true">
                  {f.icon}
                </div>
                <h3 className={styles.featurePanelTitle}>{f.title}</h3>
                <p className={styles.featurePanelBody}>{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════
          §5 BUILT FOR FIVE ROLES + STAT TILES
          ══════════════════════════════════════════════════════════════ */}
      <section className={styles.section} aria-labelledby="roles-heading">
        <div className={styles.container}>
          <SectionHeading
            eyebrow="Built for five roles"
            title="Every role. One system."
            intro="FERMS is purpose-built for the entire emergency response chain,
              from the citizen who spots the fire to the administrator who reviews
              the closed report."
            align="center"
            id="roles-heading"
          />

          <div className={styles.rolesGrid}>
            {ROLES.map((r) => (
              <FlameCard key={r.title} icon={r.icon} title={r.title}>
                {r.desc}
              </FlameCard>
            ))}
          </div>
        </div>

        {/* Dark band of true-fact StatTiles */}
        <div className={styles.statsBand} aria-label="Project facts">
          <div className={styles.container}>
            <div className={styles.statsGrid}>
              {STATS.map((s) => (
                <StatTile key={s.label} tone="dark" value={s.value} label={s.label} />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════
          §6 HOW IT WORKS — three StepCards
          ══════════════════════════════════════════════════════════════ */}
      <section
        className={`${styles.section} ${styles.sectionWarm}`}
        aria-labelledby="how-heading"
      >
        <div className={styles.container}>
          <SectionHeading
            eyebrow="How it works"
            title="Three steps. Seconds apart."
            align="center"
            id="how-heading"
          />

          <div className={styles.stepsGrid}>
            <StepCard
              number={1}
              title="Report"
              description="Open FERMS, pick your location on the map, describe the incident and choose severity. Hit Submit — your report lands on the dispatch operator's screen instantly."
              icon={<Flame size={22} strokeWidth={1.5} aria-hidden="true" />}
            />
            <StepCard
              number={2}
              title="Dispatch"
              description="The system scores nearby stations, reserves a vehicle at the closest available one, and notifies the assigned firefighters — automatically. The operator can override at any time."
              icon={<Zap size={22} strokeWidth={1.5} aria-hidden="true" />}
              active
            />
            <StepCard
              number={3}
              title="Resolve"
              description="The attending firefighter marks progress in the field. When the situation is contained, they submit a closing summary. The station officer confirms and the incident is archived."
              icon={<CheckCircle2 size={22} strokeWidth={1.5} aria-hidden="true" />}
            />
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════
          §7 CALL TO ACTION
          ══════════════════════════════════════════════════════════════ */}
      <section className={styles.section} aria-labelledby="cta-heading">
        <div className={styles.container}>
          <Card variant="dark" className={styles.ctaCard}>
            <div className={styles.ctaInner}>
              <div className={styles.ctaText}>
                <span className={styles.ctaEyebrow}>Ready?</span>
                <h2 className={styles.ctaTitle} id="cta-heading">
                  Need to report a fire now?
                </h2>
                <p className={styles.ctaBody}>
                  The Report a Fire form takes under 30 seconds. Your location is
                  picked automatically so you can focus on staying safe.
                </p>
              </div>
              <div className={styles.ctaActions}>
                <Button
                  variant="primary"
                  size="lg"
                  onClick={handleReport}
                  id="cta-report-btn"
                >
                  <Flame size={18} strokeWidth={1.5} aria-hidden="true" />
                  Report a Fire
                </Button>
                {!isAuthenticated && (
                  <Button
                    as={Link}
                    to="/login"
                    variant="ghost"
                    size="lg"
                    className={styles.ctaLoginBtn}
                    id="cta-login-btn"
                  >
                    Log In
                    <ArrowRight size={16} strokeWidth={1.5} aria-hidden="true" />
                  </Button>
                )}
              </div>
            </div>
          </Card>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════
          §8 FOOTER — dark, logo, links, credit, giant wordmark
          ══════════════════════════════════════════════════════════════ */}
      <footer className={styles.footer} role="contentinfo">
        <div className={styles.container}>
          <div className={styles.footerTop}>
            {/* Logo */}
            <div className={styles.footerLogo} aria-label="FERMS home">
              <svg
                width="28"
                height="34"
                viewBox="0 0 28 34"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
                focusable="false"
              >
                <path
                  d="M14 2C11.5 7.5 8 11.5 5 16.5C2 21.5 2.5 27 6 31C9 34.5 12 36 14 38C16 36 19 34.5 22 31C25.5 27 26 21.5 23 16.5C20 11.5 16.5 7.5 14 2Z"
                  fill="var(--color-brand)"
                />
                <path
                  d="M14 11C12.5 14.5 9.5 18 9.5 22C9.5 25.5 11.5 28.5 14 31C16.5 28.5 18.5 25.5 18.5 22C18.5 18 15.5 14.5 14 11Z"
                  fill="var(--color-ink)"
                  fillOpacity="0.7"
                />
              </svg>
              <span className={styles.footerLogoName}>FERMS</span>
            </div>

            {/* Nav links */}
            <nav aria-label="Footer navigation">
              <ul className={styles.footerLinks}>
                <li><a href="#" className={styles.footerLink}>Home</a></li>
                <li><a href="#how-heading" className={styles.footerLink}>How it works</a></li>
                <li>
                  <Link to="/login" className={styles.footerLink}>Log In</Link>
                </li>
                <li>
                  <Link to="/register" className={styles.footerLink}>Register</Link>
                </li>
              </ul>
            </nav>

            {/* Emergency numbers */}
            <div className={styles.footerEmergency}>
              <Clock size={14} strokeWidth={1.5} aria-hidden="true" />
              <span>Emergency: <a href="tel:101" className={styles.footerEmergencyLink}>101</a> / <a href="tel:112" className={styles.footerEmergencyLink}>112</a></span>
            </div>
          </div>

          {/* Project credit */}
          <p className={styles.footerCredit}>
            FERMS — Fire Emergency Response Management System
            &nbsp;·&nbsp;
            Parth Goggi &amp; Vedant Ghuge
            &nbsp;·&nbsp;
            Sardar Patel Institute of Technology, Div A Batch D
          </p>

          {/* Giant outlined wordmark (§14.1, §14.8 §8) */}
          <div className={styles.wordmark} aria-hidden="true">FERMS</div>
        </div>
      </footer>
    </div>
  );
}
