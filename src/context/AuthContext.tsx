import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { DB } from '../services/db';

interface User {
  id: number;
  username: string;
  fullname: string;
  role: string;
  department: string;
  phone: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (username: string, phone: string) => Promise<boolean>;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Initialize DB then check session
    const initAuth = async () => {
      try {
        await DB.init();
      } catch (e) {
        console.error("DB Initialization Error", e);
      }
      const sessionUser = DB.getSession();
      if (sessionUser) {
        setUser(sessionUser);
      }
      setLoading(false);
    };
    initAuth();
  }, []);

  const login = async (username: string, phone: string) => {
    const loggedInUser = await DB.login(username, phone);
    if (loggedInUser) {
      setUser(loggedInUser);
      return true;
    }
    return false;
  };

  const logout = () => {
    DB.clearSession();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, login, logout, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
