import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { invoke } from '@tauri-apps/api/core';

interface UserInfo {
  email: string;
  name?: string;
}

interface AuthContextType {
  isAuthenticated: boolean;
  userInfo: UserInfo | null;
  isLoading: boolean;
  checkAuthStatus: () => Promise<void>;
  setAuthenticated: (authenticated: boolean, user?: UserInfo | null) => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const checkAuthStatus = async () => {
    try {
      setIsLoading(true);
      const authenticated = await invoke<boolean>("check_auth");
      setIsAuthenticated(authenticated);

      if (authenticated) {
        // Fetch user info if authenticated
        const info = await invoke<UserInfo | null>("get_current_user");
        setUserInfo(info);
      } else {
        setUserInfo(null);
      }
    } catch (error) {
      console.error("Error checking auth status:", error);
      setIsAuthenticated(false);
      setUserInfo(null);
    } finally {
      setIsLoading(false);
    }
  };

  const setAuthenticated = (authenticated: boolean, user?: UserInfo | null) => {
    setIsAuthenticated(authenticated);
    if (user !== undefined) {
      setUserInfo(user);
    }
  };

  const logout = async () => {
    try {
      await invoke("azure_logout");
      setIsAuthenticated(false);
      setUserInfo(null);
    } catch (error) {
      console.error("Error during logout:", error);
      throw error;
    }
  };

  // Check authentication status on mount
  useEffect(() => {
    checkAuthStatus();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        userInfo,
        isLoading,
        checkAuthStatus,
        setAuthenticated,
        logout,
      }}
    >
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

