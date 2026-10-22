// components/common/AppNavbar/AppNavbar.jsx — Floating rounded light-grey bar with role-based links and user controls
import React, { useState, useEffect } from 'react';
import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import NotificationBell from '../NotificationBell/NotificationBell';
import Button from '../../ui/Button/Button';
import Badge from '../../ui/Badge/Badge';
import logo from '../../../assets/ferms-logo.svg';
import styles from './AppNavbar.module.css';

const ROLE_LINKS = {
  citizen: [
    { to: '/report', label: 'Report' },
    { to: '/my-reports', label: 'My Reports' },
  ],
  dispatch_operator: [
    { to: '/dashboard', label: 'Dashboard' },
  ],
  firefighter: [
    { to: '/assignments', label: 'Assignments' },
  ],
  station_officer: [
    { to: '/dashboard', label: 'Dashboard' },
    { to: '/assignments', label: 'Assignments' },
    { to: '/station', label: 'My Station' },
  ],
  admin: [
    { to: '/dashboard', label: 'Dashboard' },
    { to: '/admin/stations', label: 'Stations' },
    { to: '/station', label: 'Personnel & Vehicles' },
    { to: '/admin/users', label: 'Users' },
  ],
};

function formatUserName(user) {
  if (!user) return 'User';
  const cleaned = user.name ? user.name.replace(/\bdemo\s*/gi, '').trim() : '';
  if (cleaned) {
    return cleaned;
  }
  if (user.role) {
    return user.role
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase());
  }
  return user.email || 'User';
}

export default function AppNavbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  // Close drawer whenever the route changes
  useEffect(() => {
    setDrawerOpen(false);
  }, [location.pathname]);

  // Lock body scroll when mobile drawer is open
  useEffect(() => {
    if (drawerOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [drawerOpen]);

  const links = user?.role && ROLE_LINKS[user.role] ? ROLE_LINKS[user.role] : [];

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <header className={styles.wrapper}>
      <nav className={styles.navbar} aria-label="Main Navigation">
        {/* Left: Brand Logo */}
        <Link to="/" className={styles.brand}>
          <img src={logo} alt="" width={28} height={28} />
          <span>FERMS</span>
        </Link>

        {/* Center: Desktop Role-Based Links */}
        <div className={styles.centerLinks}>
          {isAuthenticated ? (
            links.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) =>
                  `${styles.navLink} ${isActive ? styles.navLinkActive : ''}`
                }
              >
                {link.label}
              </NavLink>
            ))
          ) : (
            <>
              <NavLink
                to="/"
                className={({ isActive }) =>
                  `${styles.navLink} ${isActive ? styles.navLinkActive : ''}`
                }
              >
                Home
              </NavLink>
              <NavLink
                to="/report"
                className={({ isActive }) =>
                  `${styles.navLink} ${isActive ? styles.navLinkActive : ''}`
                }
              >
                Report a Fire
              </NavLink>
            </>
          )}
        </div>

        {/* Right: Actions / Auth / Bell */}
        <div className={styles.rightActions}>
          {isAuthenticated ? (
            <div className={styles.userSection}>
              <NotificationBell />
              <div className={styles.userInfo}>
                <span className={styles.userName}>{formatUserName(user)}</span>
                {user?.role && <Badge variant="role" value={user.role} />}
              </div>
              <Button
                variant="ghost"
                size="md"
                onClick={handleLogout}
                className={styles.logoutBtn}
              >
                Log Out
              </Button>
            </div>
          ) : (
            <div className={styles.guestSection}>
              <Link to="/login">
                <Button variant="ghost" size="md">
                  Log In
                </Button>
              </Link>
              <Link to="/report">
                <Button variant="primary" size="md">
                  Report a Fire
                </Button>
              </Link>
            </div>
          )}

          {/* Mobile hamburger toggle */}
          <button
            type="button"
            className={styles.menuToggle}
            onClick={() => setDrawerOpen((prev) => !prev)}
            aria-expanded={drawerOpen}
            aria-label={drawerOpen ? 'Close menu' : 'Open menu'}
          >
            {drawerOpen ? (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            ) : (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            )}
          </button>
        </div>
      </nav>

      {/* Mobile Drawer Backdrop & Menu */}
      {drawerOpen && (
        <div className={styles.drawerBackdrop} onClick={() => setDrawerOpen(false)}>
          <div
            className={styles.drawer}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-label="Mobile Navigation"
          >
            <div className={styles.drawerHeader}>
              <div className={styles.brand}>
                <img src={logo} alt="" width={28} height={28} />
                <span>FERMS</span>
              </div>
              <button
                type="button"
                className={styles.drawerClose}
                onClick={() => setDrawerOpen(false)}
                aria-label="Close menu"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className={styles.drawerLinks}>
              {isAuthenticated ? (
                <>
                  <div className={styles.drawerUserInfo}>
                    <span className={styles.userName}>{formatUserName(user)}</span>
                    {user.role && <Badge variant="role" value={user.role} />}
                  </div>
                  <hr className={styles.drawerDivider} />
                  {links.map((link) => (
                    <NavLink
                      key={link.to}
                      to={link.to}
                      className={({ isActive }) =>
                        `${styles.drawerLink} ${isActive ? styles.drawerLinkActive : ''}`
                      }
                    >
                      {link.label}
                    </NavLink>
                  ))}
                  <hr className={styles.drawerDivider} />
                  <Button variant="ghost" size="md" onClick={handleLogout} className={styles.drawerBtn}>
                    Log Out
                  </Button>
                </>
              ) : (
                <>
                  <NavLink
                    to="/"
                    className={({ isActive }) =>
                      `${styles.drawerLink} ${isActive ? styles.drawerLinkActive : ''}`
                    }
                  >
                    Home
                  </NavLink>
                  <NavLink
                    to="/report"
                    className={({ isActive }) =>
                      `${styles.drawerLink} ${isActive ? styles.drawerLinkActive : ''}`
                    }
                  >
                    Report a Fire
                  </NavLink>
                  <hr className={styles.drawerDivider} />
                  <Link to="/login" className={styles.drawerBtnWrap}>
                    <Button variant="ghost" size="md" className={styles.drawerBtn}>
                      Log In
                    </Button>
                  </Link>
                  <Link to="/register" className={styles.drawerBtnWrap}>
                    <Button variant="dark" size="md" className={styles.drawerBtn}>
                      Register
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
