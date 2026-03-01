'use client';

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { createClient } from './api';
import type { Vibr8Vault } from '@vibr8vault/sdk';

interface AuthState {
  token: string | null;
  username: string | null;
  client: Vibr8Vault;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [client, setClient] = useState(() => createClient());

  // Restore from sessionStorage on mount
  useEffect(() => {
    const saved = sessionStorage.getItem('ov_token');
    const savedUser = sessionStorage.getItem('ov_username');
    const savedAdmin = sessionStorage.getItem('ov_is_admin');
    if (saved) {
      setToken(saved);
      setUsername(savedUser);
      setIsAdmin(savedAdmin === 'true');
      const restoredClient = createClient(saved);
      setClient(restoredClient);

      // Validate token and refresh admin status from server
      restoredClient.auth.me().then((me) => {
        setIsAdmin(me.admin);
        sessionStorage.setItem('ov_is_admin', String(me.admin));
      }).catch(() => {
        // Token expired or revoked — force logout
        setToken(null);
        setUsername(null);
        setIsAdmin(false);
        sessionStorage.removeItem('ov_token');
        sessionStorage.removeItem('ov_username');
        sessionStorage.removeItem('ov_is_admin');
        setClient(createClient());
      });
    }
  }, []);

  const login = useCallback(async (user: string, password: string) => {
    const anonClient = createClient();
    const resp = await anonClient.auth.login(user, password);
    setToken(resp.token);
    setUsername(resp.user.username);
    setIsAdmin(resp.user.admin);
    sessionStorage.setItem('ov_token', resp.token);
    sessionStorage.setItem('ov_username', resp.user.username);
    sessionStorage.setItem('ov_is_admin', String(resp.user.admin));
    setClient(createClient(resp.token));
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUsername(null);
    setIsAdmin(false);
    sessionStorage.removeItem('ov_token');
    sessionStorage.removeItem('ov_username');
    sessionStorage.removeItem('ov_is_admin');
    setClient(createClient());
  }, []);

  return (
    <AuthContext.Provider value={{ token, username, client, login, logout, isAuthenticated: !!token, isAdmin }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
