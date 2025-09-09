import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { apiService } from './api-full';

interface User {
  id: string;
  email: string;
  firstName: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  register: (email: string, password: string, firstName: string) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const token = localStorage.getItem('authToken');
      if (token) {
        apiService.setAuthToken(token);
        const userData = await apiService.getUserProfile();
        setUser({
          id: userData.id,
          email: userData.email,
          firstName: userData.firstName,
        });
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      localStorage.removeItem('authToken');
      apiService.setAuthToken(null);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      const response = await apiService.login(email, password);
      
      if (response.token && response.user) {
        localStorage.setItem('authToken', response.token);
        apiService.setAuthToken(response.token);
        setUser({
          id: response.user.id,
          email: response.user.email,
          firstName: response.user.firstName,
        });
        return true;
      }
      return false;
    } catch (error) {
      console.error('Login failed:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (email: string, password: string, firstName: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      const response = await apiService.register(email, password, firstName);
      
      if (response.token && response.user) {
        localStorage.setItem('authToken', response.token);
        apiService.setAuthToken(response.token);
        setUser({
          id: response.user.id,
          email: response.user.email,
          firstName: response.user.firstName,
        });
        return true;
      }
      return false;
    } catch (error) {
      console.error('Registration failed:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('authToken');
    apiService.setAuthToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{
      user,
      isLoading,
      login,
      register,
      logout,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
