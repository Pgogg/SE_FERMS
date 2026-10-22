// components/common/NotificationBell/NotificationBell.jsx — Bell icon with unread badge, dropdown Card of 10 newest notifications, role routing, and real-time toast
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { useNotifications } from '../../../hooks/useNotifications';
import { useToast } from '../../ui/Toast/Toast';
import Card from '../../ui/Card/Card';
import Button from '../../ui/Button/Button';
import Skeleton from '../../ui/Skeleton/Skeleton';
import EmptyState from '../../ui/EmptyState/EmptyState';
import styles from './NotificationBell.module.css';

/**
 * Format timestamp to concise relative time: "Just now", "2m ago", "1h ago", "3d ago"
 */
function formatRelativeTime(dateInput) {
  if (!dateInput) return '—';
  const date = new Date(dateInput);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (Number.isNaN(diffInSeconds) || diffInSeconds < 0) return 'Just now';
  if (diffInSeconds < 5) return 'Just now';
  if (diffInSeconds < 60) return `${diffInSeconds}s ago`;
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}h ago`;
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 30) return `${diffInDays}d ago`;
  return date.toLocaleDateString();
}

/**
 * Maps an incidentId to the user's role-appropriate route
 */
function getRoleIncidentPath(role, incidentId) {
  switch (role) {
    case 'firefighter':
    case 'station_officer':
      return `/assignments/${incidentId}`;
    case 'citizen':
      return '/my-reports';
    case 'dispatch_operator':
    case 'admin':
    default:
      return '/dashboard';
  }
}

export default function NotificationBell() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);

  const containerRef = useRef(null);
  const buttonRef = useRef(null);

  // Optional toast support: fires toast when a new notification arrives
  let toast = null;
  try {
    toast = useToast();
  } catch {
    // Graceful fallback if rendered outside ToastProvider
  }

  const handleNewNotification = useCallback(
    (notif) => {
      if (toast?.show && notif?.message) {
        toast.show({
          type: 'info',
          message: notif.message,
        });
      }
    },
    [toast]
  );

  const {
    notifications,
    unreadCount,
    loading,
    error,
    markRead,
    markAllRead,
    refetch,
  } = useNotifications({ onNewNotification: handleNewNotification });

  // 10 newest notifications
  const newestNotifications = (notifications || []).slice(0, 10);

  // Badge count capped at 99+
  const badgeText = unreadCount > 99 ? '99+' : String(unreadCount);

  // Close on outside click and Escape key per Requirement 4
  useEffect(() => {
    if (!isOpen) return;

    const handleOutsideClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
        buttonRef.current?.focus();
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('touchstart', handleOutsideClick);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const toggleDropdown = () => {
    setIsOpen((prev) => !prev);
  };

  const handleItemClick = async (notif) => {
    const isUnread = notif.readStatus === false || notif.read_status === false || (!notif.readStatus && notif.readStatus !== true);
    if (isUnread) {
      await markRead(notif.id);
    }
    setIsOpen(false);

    if (notif.incidentId) {
      const destination = getRoleIncidentPath(user?.role, notif.incidentId);
      navigate(destination, {
        state: {
          highlightId: notif.incidentId,
          selectedIncidentId: notif.incidentId,
        },
      });
    }
  };

  const handleMarkAll = async () => {
    await markAllRead();
  };

  return (
    <div ref={containerRef} className={styles.container}>
      {/* Bell Button with Unread Badge */}
      <button
        ref={buttonRef}
        type="button"
        className={styles.bellBtn}
        onClick={toggleDropdown}
        aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
      >
        <svg
          className={styles.bellIcon}
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>

        {unreadCount > 0 && (
          <span className={styles.badge} aria-hidden="true">
            {badgeText}
          </span>
        )}
      </button>

      {/* Dropdown Card */}
      {isOpen && (
        <Card
          variant="light"
          className={styles.dropdown}
          role="dialog"
          aria-label="Notifications"
        >
          {/* Dropdown Header */}
          <div className={styles.header}>
            <div className={styles.headerTitleWrap}>
              <h2 className={styles.headerTitle}>Notifications</h2>
              {unreadCount > 0 && (
                <span className={styles.unreadPill}>{badgeText} new</span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                type="button"
                className={styles.markAllBtn}
                onClick={handleMarkAll}
              >
                Mark all read
              </button>
            )}
          </div>

          {/* Notifications List, Loading Skeleton, Error with Retry, or Empty State */}
          <div className={styles.body}>
            {loading ? (
              <div className={styles.skeletonWrap} aria-label="Loading notifications…">
                <Skeleton lines={2} height={16} />
                <Skeleton lines={2} height={16} />
                <Skeleton lines={2} height={16} />
              </div>
            ) : error ? (
              <div className={styles.errorWrap} role="alert">
                <p className={styles.errorText}>Unable to load notifications.</p>
                <Button
                  type="button"
                  variant="dark"
                  size="sm"
                  onClick={() => refetch()}
                >
                  Retry
                </Button>
              </div>
            ) : newestNotifications.length === 0 ? (
              <div className={styles.emptyContainer}>
                <EmptyState
                  title="No notifications"
                  description="You have no notifications at this time."
                />
              </div>
            ) : (
              <ul className={styles.list} role="list">
                {newestNotifications.map((notif) => {
                  const isUnread = !notif.readStatus;
                  return (
                    <li key={notif.id} className={styles.listItem}>
                      <button
                        type="button"
                        className={`${styles.itemBtn} ${isUnread ? styles.itemUnread : ''}`}
                        onClick={() => handleItemClick(notif)}
                      >
                        <span
                          className={`${styles.unreadDot} ${isUnread ? styles.unreadDotActive : ''}`}
                          aria-hidden="true"
                        />
                        <div className={styles.itemContent}>
                          <p className={styles.itemMessage}>{notif.message}</p>
                          <span className={styles.itemTime}>
                            {formatRelativeTime(notif.createdAt)}
                          </span>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
