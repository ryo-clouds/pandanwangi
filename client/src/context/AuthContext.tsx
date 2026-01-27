import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { loginAdmin } from '../lib/api';

interface AuthContextType {
  token: string | null;
  isAdmin: boolean;
  loading: boolean;
  signIn: (password: string) => Promise<void>;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check local storage on mount
    const storedToken = localStorage.getItem('admin_token');
    if (storedToken) {
      setToken(storedToken);
    }
    setLoading(false);
  }, []);

  const signIn = async (password: string) => {
    try {
      const newToken = await loginAdmin(password);
      localStorage.setItem('admin_token', newToken);
      setToken(newToken);
    } catch (error) {
      throw error;
    }
  };

  const signOut = () => {
    localStorage.removeItem('admin_token');
    setToken(null);
  };

  const value = {
    token,
    isAdmin: !!token,
    loading,
    signIn,
    signOut
  };

  return (
    <AuthContext.Provider value={value}>
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
