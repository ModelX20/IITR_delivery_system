import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { LoginInput, RegisterInput, User } from '@iitr/shared';
import { api, AUTH_EXPIRED_EVENT } from '../api/client';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (input: LoginInput) => Promise<User>;
  register: (input: RegisterInput) => Promise<User>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<{ user: User }>('/auth/me')
      .then(({ user }) => setUser(user))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));

    const onExpired = () => setUser(null);
    window.addEventListener(AUTH_EXPIRED_EVENT, onExpired);
    return () => window.removeEventListener(AUTH_EXPIRED_EVENT, onExpired);
  }, []);

  const login = useCallback(async (input: LoginInput) => {
    const { user } = await api<{ user: User }>('/auth/login', { method: 'POST', body: input });
    setUser(user);
    return user;
  }, []);

  const register = useCallback(async (input: RegisterInput) => {
    const { user } = await api<{ user: User }>('/auth/register', { method: 'POST', body: input });
    setUser(user);
    return user;
  }, []);

  const logout = useCallback(async () => {
    try {
      await api('/auth/logout', { method: 'POST' });
    } finally {
      setUser(null);
    }
  }, []);

  const value = useMemo(() => ({ user, loading, login, register, logout }), [user, loading, login, register, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
