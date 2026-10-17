// hooks/useNotifications.js — Custom hook for fetching and managing user notifications with unread count
import { useState, useEffect, useCallback, useRef } from 'react';
import {
  listNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from '../api/notifications.api';
import { useSocketEvent } from './useSocketEvent';
import { useOnReconnect } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';

/**
 * useNotifications(options)
 *
 * Requirements:
 * - Loads GET /notifications
 * - Exposes { notifications, unreadCount, markRead(id), markAllRead(), refetch }
 * - Adds new notifications from 'notification:new' event to the top
 * - Refetches on socket reconnect
 */
export function useNotifications(options = {}) {
  const { onNewNotification } = options;
  const { isAuthenticated } = useAuth();

  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const onNewNotifRef = useRef(onNewNotification);
  useEffect(() => {
    onNewNotifRef.current = onNewNotification;
  }, [onNewNotification]);

  const fetchNotifications = useCallback(async () => {
    if (!isAuthenticated) {
      setNotifications([]);
      setUnreadCount(0);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const envelope = await listNotifications();
      const list = envelope?.data || [];
      setNotifications(list);

      const unread =
        envelope?.meta?.unreadCount !== undefined
          ? envelope.meta.unreadCount
          : list.filter((n) => !n.readStatus).length;
      setUnreadCount(unread);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  // Initial fetch on mount or auth change
  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Refetch on reconnect (every connect AFTER the first one)
  useOnReconnect(() => {
    fetchNotifications();
  });

  // Real-time: receive 'notification:new' and prepend to top
  useSocketEvent('notification:new', (payload) => {
    const item = payload?.notification || payload;
    if (!item) return;

    setNotifications((prev) => {
      // Avoid duplicate insertion if notification already exists
      if (item.id && prev.some((n) => n.id === item.id)) {
        return prev;
      }
      return [item, ...prev];
    });

    if (!item.readStatus) {
      setUnreadCount((prev) => prev + 1);
    }

    if (onNewNotifRef.current) {
      onNewNotifRef.current(item);
    }
  });

  // Mark single notification as read
  const markRead = useCallback(
    async (id) => {
      if (!id) return;

      // Optimistic update
      setNotifications((prev) => {
        let wasUnread = false;
        const next = prev.map((item) => {
          if (item.id === id) {
            if (!item.readStatus) wasUnread = true;
            return { ...item, readStatus: true };
          }
          return item;
        });
        if (wasUnread) {
          setUnreadCount((count) => Math.max(0, count - 1));
        }
        return next;
      });

      try {
        await markNotificationRead(id);
      } catch (err) {
        // Re-sync with server state on failure
        fetchNotifications();
      }
    },
    [fetchNotifications]
  );

  // Mark all notifications as read
  const markAllRead = useCallback(async () => {
    // Optimistic update
    setNotifications((prev) =>
      prev.map((item) => ({ ...item, readStatus: true }))
    );
    setUnreadCount(0);

    try {
      await markAllNotificationsRead();
    } catch (err) {
      // Re-sync with server state on failure
      fetchNotifications();
    }
  }, [fetchNotifications]);

  return {
    notifications,
    unreadCount,
    markRead,
    markAllRead,
    refetch: fetchNotifications,
    loading,
    error,
  };
}

export default useNotifications;
