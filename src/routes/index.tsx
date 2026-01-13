import { createFileRoute, Link } from '@tanstack/react-router'
import {useState, useEffect, useEffectEvent} from "react";
import { invoke } from "@tauri-apps/api/core";

interface AuthResult {
  success: boolean;
  message: string;
  user_email?: string;
  user_name?: string;
}

interface UserInfo {
  email: string;
  name?: string;
}

export const Route = createFileRoute('/')({
  component: Index,
})

function Index() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);

  // Check authentication status on mount
  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = useEffectEvent(async () =>{
    try {
      const authenticated = await invoke<boolean>("check_auth");
      setIsAuthenticated(authenticated);

      if (authenticated) {
        // Fetch user info if authenticated
        const info = await invoke<UserInfo | null>("get_current_user");
        setUserInfo(info);
      }
    } catch (error) {
      console.error("Error checking auth status:", error);
    }
  });

  async function handleLogin() {
    setIsLoading(true);
    setMessage("Starting Azure login...");

    try {
      const result = await invoke<AuthResult>("azure_login");

      if (result.success) {
        setIsAuthenticated(true);
        setUserInfo({
          email: result.user_email || "",
          name: result.user_name,
        });
        setMessage("Successfully authenticated!");
      } else {
        setMessage(`Login failed: ${result.message}`);
      }
    } catch (error) {
      console.error("Error during login:", error);
      setMessage(`Error: ${error}`);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleLogout() {
    try {
      await invoke("logout");
      setIsAuthenticated(false);
      setUserInfo(null);
      setMessage("Logged out successfully");
    } catch (error) {
      console.error("Error during logout:", error);
      setMessage(`Error: ${error}`);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12">
      <h1 className="text-5xl md:text-6xl font-bold mb-12 gradient-text">
        Welcome to VaultRaider
      </h1>

      <div className="w-full max-w-md">
        {!isAuthenticated ? (
          <div className="card">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
              Sign In
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Sign in with your Azure account to access your Key Vaults
            </p>
            <button
              type="button"
              onClick={handleLogin}
              disabled={isLoading}
              className="btn-primary w-full"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Authenticating...
                </span>
              ) : (
                "Login with Azure"
              )}
            </button>
            {message && (
              <div className="mt-4 p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                <p className="text-sm text-blue-700 dark:text-blue-300">{message}</p>
              </div>
            )}
          </div>
        ) : (
          <div className="card">
            <h2 className="text-2xl font-bold text-green-600 dark:text-green-400 mb-6">
              You are logged in!
            </h2>
            {userInfo && (
              <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-6 mb-6 space-y-3">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-white text-xl font-bold flex-shrink-0">
                    {userInfo.name ? userInfo.name.charAt(0).toUpperCase() : userInfo.email.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    {userInfo.name && (
                      <p className="text-lg font-semibold text-gray-900 dark:text-gray-100 truncate">
                        {userInfo.name}
                      </p>
                    )}
                    <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                      {userInfo.email}
                    </p>
                  </div>
                </div>
              </div>
            )}
            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                to="/dashboard"
                className="flex-1 px-6 py-3 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 text-center"
              >
                Go to Dashboard
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                className="btn-secondary"
              >
                Logout
              </button>
            </div>
            {message && (
              <div className="mt-4 p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                <p className="text-sm text-green-700 dark:text-green-300">{message}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

