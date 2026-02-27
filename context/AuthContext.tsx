
import React, { createContext, useState, useEffect, useCallback } from 'react';
import { User } from '../types';

interface AuthContextType {
  currentUser: User | null;
  isAuthenticated: boolean;
  login: (role: 'viewer' | 'editor') => Promise<boolean>;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextType>({
  currentUser: null,
  isAuthenticated: false,
  login: async () => false, // Placeholder for initial context value
  logout: () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const isAuthenticated = !!currentUser;

  useEffect(() => {
    // Attempt to load user from sessionStorage on initial load
    try {
      const userString = sessionStorage.getItem('currentUser');
      if (userString) {
        setCurrentUser(JSON.parse(userString));
      }
    } catch (error) {
      console.error('Error loading current user from sessionStorage:', error);
    }
  }, []);

  const login = useCallback(async (role: 'viewer' | 'editor') => {
    // Mock authentication based on selected role
    let user: User | null = null;
    if (role === 'viewer') {
      user = { id: 'mock-viewer-id', username: 'viewer@example.com', role: 'viewer' };
    } else if (role === 'editor') {
      user = { id: 'mock-editor-id', username: 'editor@example.com', role: 'editor' };
    }

    if (user) {
      setCurrentUser(user);
      try {
        sessionStorage.setItem('currentUser', JSON.stringify(user));
      } catch (error) {
        console.error('Error saving current user to sessionStorage:', error);
      }
      return true;
    } else {
      setCurrentUser(null);
      try {
        sessionStorage.removeItem('currentUser');
      } catch (error) {
        console.error('Error removing current user from sessionStorage:', error);
      }
      return false;
    }
  }, []);

  const logout = useCallback(() => {
    setCurrentUser(null);
    try {
      sessionStorage.removeItem('currentUser');
    } catch (error) {
      console.error('Error removing current user from sessionStorage:', error);
    }
  }, []);

  return (
    <AuthContext.Provider value={{ currentUser, isAuthenticated, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};