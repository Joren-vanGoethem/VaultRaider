import { invoke } from "@tauri-apps/api/core";
import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useEffectEvent,
  useState,
} from "react";

interface UserInfo {
  email: string;
  name?: string;
}

interface AuthResult {
  success: boolean;
  message: string;
  user_email?: string;
  user_name?: string;
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

  const checkAuthStatus = useEffectEvent(async () => {
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
  });

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

  // Check authentication status on mount and attempt auto-login if enabled
  useEffect(() => {
    const initAuth = async () => {
      try {
        setIsLoading(true);

        // First check if already authenticated
        const authenticated = await invoke<boolean>("check_auth");

        if (authenticated) {
          setIsAuthenticated(true);
          const info = await invoke<UserInfo | null>("get_current_user");
          setUserInfo(info);
        } else {
          // Not authenticated, check if auto-login is enabled
          try {
            const autoLoginEnabled = await invoke<boolean>("get_auto_login");

            if (autoLoginEnabled) {
              console.log("Auto-login enabled, attempting CLI login...");
              const result = await invoke<AuthResult>("azure_login");

              if (result.success) {
                setIsAuthenticated(true);
                setUserInfo({
                  email: result.user_email || "",
                  name: result.user_name,
                });
                console.log("Auto-login successful");
              } else {
                console.log("Auto-login failed:", result.message);
              }
            }
          } catch (autoLoginError) {
            console.error("Auto-login error:", autoLoginError);
            // Don't throw - just log and continue
          }
        }
      } catch (error) {
        console.error("Error during auth initialization:", error);
        setIsAuthenticated(false);
        setUserInfo(null);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
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
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
