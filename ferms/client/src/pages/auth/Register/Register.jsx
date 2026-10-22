// pages/auth/Register/Register.jsx — Citizen self-registration page with split layout per §14.7
import React, { useState } from 'react';
import { Link, useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext.jsx';
import { useToast } from '../../../components/ui/Toast/Toast.jsx';
import { ROLE_HOME } from '../../../constants.js';
import Card from '../../../components/ui/Card/Card.jsx';
import FormField from '../../../components/ui/FormField/FormField.jsx';
import Button from '../../../components/ui/Button/Button.jsx';
import styles from './Register.module.css';

import logoUrl from '../../../assets/logo.svg';

export default function Register() {
  const { register, isAuthenticated, user, loading } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [fieldErrors, setFieldErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [busy, setBusy] = useState(false);

  // If already logged in, redirect immediately to ROLE_HOME
  if (!loading && isAuthenticated && user) {
    const home = ROLE_HOME[user.role] ?? '/report';
    return <Navigate to={home} replace />;
  }

  function validate() {
    const errs = {};

    if (!name.trim()) {
      errs.name = 'Name is required.';
    }

    if (!email.trim()) {
      errs.email = 'Email is required.';
    }

    if (!password) {
      errs.password = 'Password is required.';
    } else if (password.length < 8) {
      errs.password = 'Password must be at least 8 characters.';
    }

    if (!confirmPassword) {
      errs.confirmPassword = 'Confirm password is required.';
    } else if (password !== confirmPassword) {
      errs.confirmPassword = 'Passwords do not match.';
    }

    return errs;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setServerError('');

    const errors = validate();
    setFieldErrors(errors);

    if (Object.keys(errors).length > 0) {
      setTimeout(() => {
        const firstKey = Object.keys(errors)[0];
        const el = document.getElementById(`register-${firstKey}`);
        el?.focus();
      }, 50);
      return;
    }

    setBusy(true);
    try {
      await register({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim() || undefined,
        password,
      });

      toast?.show({
        type: 'success',
        message: 'Account created successfully. Welcome to FERMS.',
      });

      // After successful registration, log user in and go to /report
      navigate('/report', { replace: true });
    } catch (err) {
      if (!navigator.onLine || err.code === 'NETWORK_ERROR' || /network/i.test(err.message)) {
        setServerError('Network connection failed. Please check your internet connection and try again.');
      } else {
        setServerError(err.message || 'Registration failed. Please try again.');
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
              <h1 className={styles.heading}>Create account</h1>
              <p className={styles.sub}>
                Already have an account?{' '}
                <Link to="/login" className={styles.link}>
                  Sign in
                </Link>
              </p>
            </div>

            <form onSubmit={handleSubmit} noValidate className={styles.form}>
              {/* Inline server error banner */}
              {serverError && (
                <div className={styles.errorBanner} role="alert" aria-live="assertive">
                  {serverError}
                </div>
              )}

              <FormField
                label="Full name"
                name="name"
                id="register-name"
                type="text"
                autoComplete="name"
                required
                value={name}
                error={fieldErrors.name}
                onChange={(e) => {
                  setName(e.target.value);
                  setFieldErrors((prev) => ({ ...prev, name: undefined }));
                  setServerError('');
                }}
                disabled={busy}
              />

              <FormField
                label="Email address"
                name="email"
                id="register-email"
                type="email"
                autoComplete="email"
                required
                value={email}
                error={fieldErrors.email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setFieldErrors((prev) => ({ ...prev, email: undefined }));
                  setServerError('');
                }}
                disabled={busy}
              />

              <FormField
                label="Phone number"
                name="phone"
                id="register-phone"
                type="tel"
                autoComplete="tel"
                hint="Optional. Used to contact you regarding reports."
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                disabled={busy}
              />

              <FormField
                label="Password"
                name="password"
                id="register-password"
                type="password"
                autoComplete="new-password"
                required
                hint="Must be at least 8 characters."
                value={password}
                error={fieldErrors.password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setFieldErrors((prev) => ({ ...prev, password: undefined }));
                  setServerError('');
                }}
                disabled={busy}
              />

              <FormField
                label="Confirm password"
                name="confirmPassword"
                id="register-confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                value={confirmPassword}
                error={fieldErrors.confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  setFieldErrors((prev) => ({ ...prev, confirmPassword: undefined }));
                  setServerError('');
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
                Create account
              </Button>
            </form>
          </Card>
        </div>
      </main>
    </div>
  );
}
