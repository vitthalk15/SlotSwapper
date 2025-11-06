import React, { createContext, useContext, useEffect, useState } from 'react';
import { apiClient } from '@/lib/api';

interface User {
  id: string;
  email: string;
  name: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  refreshUser: async () => {},
});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = async () => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const result = await apiClient.getCurrentUser();
        if (result.data?.user) {
          setUser(result.data.user);
          return; // Return after successful update
        } else {
          localStorage.removeItem('token');
          setUser(null);
        }
      } catch (error) {
        console.error('Error refreshing user:', error);
        localStorage.removeItem('token');
        setUser(null);
      }
    } else {
      setUser(null);
    }
  };

  useEffect(() => {
    // Check for existing token and fetch user
    const token = localStorage.getItem('token');
    
    if (token) {
      apiClient.getCurrentUser().then((result) => {
        if (result.data?.user) {
          setUser(result.data.user);
        } else {
          localStorage.removeItem('token');
          setUser(null);
        }
        setLoading(false);
      }).catch(() => {
        localStorage.removeItem('token');
        setUser(null);
        setLoading(false);
      });
    } else {
      setLoading(false);
    }
  }, []);

  // Listen for auth changes (when user signs in/out)
  useEffect(() => {
    const handleAuthChange = () => {
      refreshUser();
    };
    
    window.addEventListener('auth-change', handleAuthChange);

    return () => {
      window.removeEventListener('auth-change', handleAuthChange);
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};
