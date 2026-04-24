import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import type { User } from '../api/client';
import { authLogin, authSignup, authGetMe } from '../api/client';
import { applyUserSettingsToDocument, loadStoredUserSettings } from '../utils/userPreferences';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = async () => {
    const response = await authGetMe();
    setUser(response.data.user);
    applyUserSettingsToDocument(response.data.user.settings);
  };

  // Check if user is logged in on mount
  useEffect(() => {
    applyUserSettingsToDocument(loadStoredUserSettings());

    const checkAuth = async () => {
      const token = localStorage.getItem('authToken');
      if (token) {
        try {
          await refreshUser();
        } catch {
          localStorage.removeItem('authToken');
        }
      }
      setLoading(false);
    };
    checkAuth();
  }, []);

  const login = async (email: string, password: string) => {
    const response = await authLogin(email.trim().toLowerCase(), password);
    if (!response.data.success) {
      throw new Error('Invalid email or password.');
    }

    localStorage.setItem('authToken', response.data.token);
    await refreshUser();
  };

  const signup = async (email: string, password: string) => {
    const response = await authSignup(email.trim().toLowerCase(), password);
    if (!response.data.success) {
      throw new Error('Registration failed.');
    }

    localStorage.setItem('authToken', response.data.token);
    await refreshUser();
  };

  const logout = () => {
    localStorage.removeItem('authToken');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, isAuthenticated: !!user, login, signup, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
