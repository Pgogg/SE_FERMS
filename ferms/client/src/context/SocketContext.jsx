// context/SocketContext.jsx — React context providing the shared Socket.IO client instance, auto-reconnect, and reconnect-resync hook
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
  useSyncExternalStore,
} from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext(null);

const SOCKET_URL =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SOCKET_URL) ||
  'http://localhost:5000';

/* ------------------------------------------------------------------
 * Module-level Singleton Socket Store
 * Ensures a single shared socket connection across the application,
 * supports auto-reconnect with exponential backoff, and provides
 * graceful fallback if components call useSocket() outside SocketProvider.
 * ------------------------------------------------------------------ */
let sharedSocket = null;
let sharedConnected = false;
let currentToken = null;
const listeners = new Set();
let socketSnapshot = { socket: null, connected: false };

function updateSocketSnapshot() {
  if (socketSnapshot.socket !== sharedSocket || socketSnapshot.connected !== sharedConnected) {
    socketSnapshot = { socket: sharedSocket, connected: sharedConnected };
  }
}

function notifyListeners() {
  updateSocketSnapshot();
  for (const listener of listeners) {
    listener();
  }
}

function subscribeSocket(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSocketSnapshot() {
  return socketSnapshot;
}

function initOrUpdateSocket(token, isAuthenticated) {
  // If not authenticated, ensure socket is disconnected
  if (!isAuthenticated || !token) {
    if (sharedSocket) {
      sharedSocket.disconnect();
      sharedSocket = null;
      sharedConnected = false;
      currentToken = null;
      notifyListeners();
    }
    return null;
  }

  // If token unchanged and socket exists, return existing socket
  if (sharedSocket && currentToken === token) {
    if (!sharedSocket.connected && !sharedSocket.connecting) {
      sharedSocket.connect();
    }
    return sharedSocket;
  }

  // If token changed, disconnect old socket first
  if (sharedSocket) {
    sharedSocket.disconnect();
    sharedSocket = null;
    sharedConnected = false;
  }

  currentToken = token;

  // Create single shared socket with reconnection backoff per Requirement 1
  sharedSocket = io(SOCKET_URL, {
    auth: { token },
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    randomizationFactor: 0.5,
    transports: ['websocket', 'polling'],
  });

  sharedSocket.on('connect', () => {
    sharedConnected = true;
    notifyListeners();
  });

  sharedSocket.on('disconnect', () => {
    sharedConnected = false;
    notifyListeners();
  });

  sharedSocket.on('connect_error', () => {
    sharedConnected = false;
    notifyListeners();
  });

  if (sharedSocket.connected) {
    sharedConnected = true;
  }

  notifyListeners();
  return sharedSocket;
}

/**
 * SocketProvider
 * Wraps component tree and manages the shared socket.io connection lifecycle:
 * - When authenticated: connects to VITE_SOCKET_URL with auth { token }.
 * - When logged out: disconnects socket.
 * - Exposes { socket, connected } through context.
 */
export function SocketProvider({ children }) {
  const { token, isAuthenticated } = useAuth();
  const socketState = useSyncExternalStore(subscribeSocket, getSocketSnapshot);

  useEffect(() => {
    initOrUpdateSocket(token, isAuthenticated);
  }, [token, isAuthenticated]);

  const value = React.useMemo(
    () => ({
      socket: socketState.socket,
      connected: socketState.connected,
    }),
    [socketState.socket, socketState.connected]
  );

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
}

/**
 * useSocket()
 * Hook to access the shared socket instance and connection state.
 * Returns { socket, connected }.
 * Works both inside <SocketProvider> and as a resilient fallback.
 */
export const useSocket = () => {
  const ctx = useContext(SocketContext);
  const { token, isAuthenticated } = useAuth();

  // If inside SocketProvider, return context value directly
  if (ctx && (ctx.socket !== undefined || ctx.connected !== undefined)) {
    return ctx;
  }

  // Resilient fallback outside SocketProvider
  const fallback = useSyncExternalStore(subscribeSocket, getSocketSnapshot);

  useEffect(() => {
    initOrUpdateSocket(token, isAuthenticated);
  }, [token, isAuthenticated]);

  return fallback;
};

/**
 * useOnReconnect(callback)
 * Calls the callback on every 'connect' event AFTER the first one (so pages can re-fetch).
 * Always calls the latest callback without re-subscribing.
 */
export function useOnReconnect(callback) {
  const { socket } = useSocket();
  const savedCallback = useRef(callback);

  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  // Track if initial connect has happened
  // If socket is already connected when this hook runs, the initial connection has completed
  const hasConnectedOnceRef = useRef(Boolean(socket?.connected));

  useEffect(() => {
    if (!socket) return;

    if (socket.connected) {
      hasConnectedOnceRef.current = true;
    }

    const handleConnect = () => {
      if (!hasConnectedOnceRef.current) {
        // First connection: mark as connected and do NOT trigger reconnect callback
        hasConnectedOnceRef.current = true;
        return;
      }

      // Subsequent connection (reconnect): fire the callback
      if (savedCallback.current) {
        savedCallback.current();
      }
    };

    socket.on('connect', handleConnect);

    return () => {
      socket.off('connect', handleConnect);
    };
  }, [socket]);
}

export default SocketContext;
