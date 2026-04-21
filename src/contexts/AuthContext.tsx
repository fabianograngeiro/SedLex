import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { 
  onAuthStateChanged, 
  User as FirebaseUser, 
  signOut 
} from 'firebase/auth';
import { auth, signInWithGoogle } from '../lib/firebase';

export type UserRole = 'admin' | 'defensor' | 'analista';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  org: string;
  plan: 'trial' | 'pro' | 'enterprise';
  status: 'active' | 'pending' | 'suspended';
  lastActive: string;
  expirationDate?: string;
}

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  login: () => Promise<void>;
  mockLogin: (role: UserRole) => void;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setLoading(true);
      if (fbUser) {
        // Sync with backend via Express API
        const profileData = {
          id: fbUser.uid,
          name: fbUser.displayName || 'Usuário Jurídico',
          email: fbUser.email || '',
          role: 'defensor',
          org: 'DP-Geral',
          plan: 'trial',
          status: 'active'
        };

        try {
          const response = await fetch('/api/users', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(profileData)
          });

          if (response.ok) {
            const syncedUser = await response.json();
            setUser(syncedUser);
          }
        } catch (err) {
          console.error("Backend sync failed:", err);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async () => {
    try {
      await signInWithGoogle();
    } catch (error) {
      console.error("Login failed:", error);
    }
  };

  const mockLogin = (role: UserRole) => {
    const mockProfiles: Record<UserRole, UserProfile> = {
      admin: { id: 'mock_admin', name: 'Administrador SaaS', email: 'admin@defensoria.ia', role: 'admin', org: 'Sede Central', plan: 'enterprise', status: 'active', lastActive: new Date().toISOString(), expirationDate: '2026-12-31' },
      defensor: { id: 'mock_defensor', name: 'Dr. Lucas Defensor', email: 'lucas@defensoria.ia', role: 'defensor', org: 'DP-Geral', plan: 'pro', status: 'active', lastActive: new Date().toISOString(), expirationDate: '2026-06-15' },
      analista: { id: 'mock_analista', name: 'Analista Juris WP', email: 'analista@defensoria.ia', role: 'analista', org: 'Núcleo Pesquisa', plan: 'trial', status: 'active', lastActive: new Date().toISOString(), expirationDate: '2026-05-21' }
    };
    setUser(mockProfiles[role]);
  };

  const refreshUser = async () => {
    if (!auth.currentUser) return;
    try {
       const response = await fetch('/api/users/me', {
         headers: { 'x-user-id': auth.currentUser.uid }
       });
       if (response.ok) {
         const syncedUser = await response.json();
         setUser(syncedUser);
       }
    } catch (err) {
      console.error("Refresh failed:", err);
    }
  };

  const logout = async () => {
    await signOut(auth);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, mockLogin, logout, refreshUser, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
