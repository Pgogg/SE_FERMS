import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { AlertCircle } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext.jsx';
import { useToast } from '../../../components/ui/Toast/Toast.jsx';
import { ROLE_HOME } from '../../../constants.js';
import Card from '../../../components/ui/Card/Card.jsx';
import FormField from '../../../components/ui/FormField/FormField.jsx';
import Button from '../../../components/ui/Button/Button.jsx';
import styles from './Login.module.css';

import logoUrl from '../../../assets/logo.svg';

export default function Login() {
  const { login, isAuthenticated, user, loading } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [expiredNotice, setExpiredNotice] = useState(() => {
    try {
      const stored = sessionStorage.getItem('ferms_session_expired');
      if (stored) {
        sessionStorage.removeItem('ferms_session_expired');
        return stored;
      }
    } catch {
      // ignore storage error
    }
    if (location.state?.message) {
      return location.state.message;
    }
    const params = new URLSearchParams(location.search);
    if (params.get('expired')) {
      return 'Your session has expired. Please log in again.';
    }
    return '';
  });
  const [fieldErrors, setFieldErrors] = useState({});
  const [busy, setBusy] = useState(false);

  // If already logged in, redirect immediately to ROLE_HOME
  if (!loading && isAuthenticated && user) {
    const home = ROLE_HOME[user.role] ?? '/';
    return <Navigate to={home} replace />;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    const errs = {};
    if (!email.trim()) {
      errs.email = 'Email address is required.';
    }
    if (!password) {
      errs.password = 'Password is required.';
    }

    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs);
      setTimeout(() => {
        if (errs.email) {
          document.getElementById('login-email')?.focus();
        } else if (errs.password) {
          document.getElementById('login-password')?.focus();
        }
      }, 50);
      return;
    }

    setFieldErrors({});
    setBusy(true);
    try {
      const loggedInUser = await login(email.trim(), password);
      toast?.show({
        type: 'success',
        message: 'Signed in successfully.',
      });
      // Navigate to remembered location (set by ProtectedRoute) or ROLE_HOME
      const from = location.state?.from?.pathname || location.state?.from;
      const home = ROLE_HOME[loggedInUser.role] ?? '/';
      navigate(from || home, { replace: true });
    } catch (err) {
      if (!navigator.onLine || err.code === 'NETWORK_ERROR' || /network/i.test(err.message)) {
        setError('Network connection failed. Please check your internet connection and try again.');
      } else {
        setError(err.message || 'Invalid email or password.');
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={styles.page}>
      {/* ── Dark Card panel (hidden below 1024px per §14.7) ── */}
      <Card as="aside" variant="dark" className={styles.panel} aria-hidden="true">
        <div className={styles.panelInner}>
          <img src={logoUrl} alt="FERMS logo" className={styles.panelLogo} />
          <p className={styles.panelTagline}>
            Real-time dispatch. Nearest station. Every time.
          </p>
          <div className={styles.flameDeco} aria-hidden="true">
            <svg viewBox="0 0 120 160" fill="none" xmlns="http://www.w3.org/2000/svg" className={styles.flameSvg}>
              <path d="M60 8C60 8 32 38 32 72C32 96 46 116 60 116C74 116 88 96 88 72C88 38 60 8 60 8Z" fill="var(--color-brand)" fillOpacity="0.25"/>
              <path d="M60 32C60 32 44 52 44 72C44 88 52 100 60 100C68 100 76 88 76 72C76 52 60 32 60 32Z" fill="var(--color-brand)" fillOpacity="0.45"/>
              <path d="M60 56C60 56 52 68 52 76C52 84 56 90 60 90C64 90 68 84 68 76C68 68 60 56 60 56Z" fill="var(--color-brand)" fillOpacity="0.8"/>
            </svg>
          </div>
        </div>
      </Card>

      {/* ── Form section ── */}
      <main className={styles.formSection} id="main-content">
        <div className={styles.formWrap}>
          {/* Mobile logo (shown only below 1024px) */}
          <img src={logoUrl} alt="FERMS" className={styles.mobileLogo} />

          <Card variant="light" className={styles.card}>
            <div className={styles.cardHeader}>
              <h1 className={styles.heading}>Sign in</h1>
              <p className={styles.sub}>
                Don't have an account?{' '}
                <Link to="/register" className={styles.link}>
                  Register
                </Link>
              </p>
            </div>

            {expiredNotice && (
              <div className={styles.infoBanner} role="status">
                <AlertCircle size={18} aria-hidden="true" />
                <span>{expiredNotice}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} noValidate className={styles.form}>
              {/* Inline server error banner */}
              {error && (
                <div className={styles.errorBanner} role="alert" aria-live="assertive">
                  {error}
                </div>
              )}

              <FormField
                label="Email address"
                name="email"
                id="login-email"
                type="email"
                autoComplete="email"
                required
                value={email}
                error={fieldErrors.email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setFieldErrors((prev) => ({ ...prev, email: undefined }));
                  setError('');
                }}
                disabled={busy}
              />

              <FormField
                label="Password"
                name="password"
                id="login-password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                error={fieldErrors.password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setFieldErrors((prev) => ({ ...prev, password: undefined }));
                  setError('');
                }}
                disabled={busy}
              />

              <Button
                type="submit"
                variant="primary"
                size="lg"
                loading={busy}
                disabled={busy}
                className={styles.submitBtn}
              >
                Sign in
              </Button>
            </form>

            <div className={styles.demoHint}>
              <p className={styles.demoTitle}>Demo credentials (all share <code>Passw0rd!</code>)</p>
              <ul className={styles.demoList}>
                <li><strong>Citizen</strong> — citizen@ferms.test</li>
                <li><strong>Operator</strong> — operator@ferms.test</li>
                <li><strong>Firefighter</strong> — firefighter@ferms.test</li>
                <li><strong>Station Officer</strong> — officer@ferms.test</li>
                <li><strong>Admin</strong> — admin@ferms.test</li>
              </ul>
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
}
