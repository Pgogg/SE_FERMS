// context/AuthContext.jsx — React context providing current user, login, logout, and role helpers
import React, { createContext, useContext, useState, useEffect, useCallback, useSyncExternalStore } from 'react';
import { login as apiLogin, logout as apiLogout, register as apiRegister, getMe } from '../api/auth.api.js';

const AuthContext = createContext(null);

/** Keys used in localStorage (per CONVENTIONS §6) */
const TOKEN_KEY = 'ferms_token';
const USER_KEY  = 'ferms_user';

/**
 * Read a value from localStorage inside a try/catch so that
 * SecurityError (private browsing) never crashes the app.
 * Automatically handles both plain strings and JSON objects.
 */
function readLocal(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return raw;
    }
  } catch {
    return null;
  }
}

/**
 * Write a value to localStorage safely. Strings are stored raw (so Axios Bearer header gets
 * clean token without JSON quotes), objects are JSON-stringified.
 */
function writeLocal(key, value) {
  try {
    if (value === null || value === undefined) {
      localStorage.removeItem(key);
    } else if (typeof value === 'string') {
      localStorage.setItem(key, value);
    } else {
      localStorage.setItem(key, JSON.stringify(value));
    }
  } catch {
    // ignore — SecurityError in private browsing
  }
}

/* ------------------------------------------------------------------
 * Module-level Reactive Store
 * Keeps state synced across all components and provides resilient
 * operation even if <AuthProvider> is mounted at root or nested.
 * ------------------------------------------------------------------ */
let globalState = {
  token: readLocal(TOKEN_KEY),
  user: readLocal(USER_KEY),
  loading: Boolean(readLocal(TOKEN_KEY)), // true on startup only if a token needs validation
};

const listeners = new Set();

function emitChange() {
  for (const listener of listeners) {
    listener();
  }
}

function setGlobalAuth(updater) {
  const next = typeof updater === 'function' ? updater(globalState) : updater;
  globalState = { ...globalState, ...next };
  emitChange();
}

function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return globalState;
}

// Global actions
async function performLogin(email, password) {
  const envelope = await apiLogin({ email, password });
  const { token: newToken, user: newUser } = envelope.data;
  writeLocal(TOKEN_KEY, newToken);
  writeLocal(USER_KEY, newUser);
  setGlobalAuth({ token: newToken, user: newUser, loading: false });
  return newUser;
}

async function performRegister(data) {
  const envelope = await apiRegister(data);
  const { token: newToken, user: newUser } = envelope.data;
  writeLocal(TOKEN_KEY, newToken);
  writeLocal(USER_KEY, newUser);
  setGlobalAuth({ token: newToken, user: newUser, loading: false });
  return newUser;
}

async function performLogout() {
  try {
    await apiLogout();
  } catch {
    // ignore — local state cleared regardless
  }
  writeLocal(TOKEN_KEY, null);
  writeLocal(USER_KEY, null);
  setGlobalAuth({ token: null, user: null, loading: false });
}

// On initial module load: if a token exists, validate with GET /auth/me
if (globalState.token) {
  getMe()
    .then((envelope) => {
      const freshUser = envelope?.data ?? null;
      writeLocal(USER_KEY, freshUser);
      setGlobalAuth({ user: freshUser, loading: false });
    })
    .catch(() => {
      writeLocal(TOKEN_KEY, null);
      writeLocal(USER_KEY, null);
      setGlobalAuth({ token: null, user: null, loading: false });
    });
}

/**
 * <AuthProvider>
 * Wraps tree with AuthContext. Exposes user, token, isAuthenticated, loading, login, register, logout.
 */
export function AuthProvider({ children }) {
  const state = useSyncExternalStore(subscribe, getSnapshot);

  const value = {
    user: state.user,
    token: state.token,
    loading: state.loading,
    isAuthenticated: Boolean(state.token && state.user),
    login: useCallback(performLogin, []),
    register: useCallback(performRegister, []),
    logout: useCallback(performLogout, []),
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

/**
 * useAuth()
 * Provides { user, token, isAuthenticated, loading, login, register, logout }
 * per CONVENTIONS §7.
 */
export const useAuth = () => {
  const ctx = useContext(AuthContext);
  // If wrapped in AuthProvider, return context value
  if (ctx) {
    return ctx;
  }

  // Fallback: use module-level store directly if AuthProvider not yet mounted in AppRouter
  const state = useSyncExternalStore(subscribe, getSnapshot);
  return {
    user: state.user,
    token: state.token,
    loading: state.loading,
    isAuthenticated: Boolean(state.token && state.user),
    login: performLogin,
    register: performRegister,
    logout: performLogout,
  };
};
