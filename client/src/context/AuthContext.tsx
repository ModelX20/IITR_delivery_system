import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { CompleteProfileInput, LoginInput, RegisterFormInput, SignupStarted, User } from '@iitr/shared';
import { api, AUTH_EXPIRED_EVENT } from '../api/client';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (input: LoginInput) => Promise<User>;
  /** Step 1 of sign-up: validates the form and emails a verification code. No account exists yet. */
  startSignup: (input: RegisterFormInput) => Promise<SignupStarted>;
  /** Step 2: creates the account (and logs in) if the code is right. */
  verifySignup: (email: string, code: string) => Promise<User>;
  logout: () => Promise<void>;
  completeProfile: (input: CompleteProfileInput) => Promise<User>;
  /** Re-reads the current user from the server (e.g. to see if an admin approved them). */
  refreshUser: () => Promise<void>;
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

  const startSignup = useCallback(
    (input: RegisterFormInput) => api<SignupStarted>('/auth/register', { method: 'POST', body: input }),
    [],
  );

  const verifySignup = useCallback(async (email: string, code: string) => {
    const { user } = await api<{ user: User }>('/auth/register/verify', { method: 'POST', body: { email, code } });
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

  const completeProfile = useCallback(async (input: CompleteProfileInput) => {
    const { user } = await api<{ user: User }>('/auth/profile', { method: 'PATCH', body: input });
    setUser(user);
    return user;
  }, []);

  const refreshUser = useCallback(async () => {
    const { user } = await api<{ user: User }>('/auth/me');
    setUser(user);
  }, []);

  const value = useMemo(
    () => ({ user, loading, login, startSignup, verifySignup, logout, completeProfile, refreshUser }),
    [user, loading, login, startSignup, verifySignup, logout, completeProfile, refreshUser],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
