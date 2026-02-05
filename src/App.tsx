import { invoke } from "@tauri-apps/api/core";
import { useCallback, useEffect, useState } from "react";
import "./App.css";

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

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);

  const checkAuthStatus = useCallback(async () => {
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
  }, []);

  // Check authentication status on mount
  useEffect(() => {
    checkAuthStatus();
  }, [checkAuthStatus]);

  async function handleLogin() {
    setIsLoading(true);
    setMessage("Starting Azure login...");

    try {
      const result = await invoke<AuthResult>("azure_login");

      if (result.success) {
        setIsAuthenticated(true);
        setMessage(result.message);

        // Store user info from login result
        if (result.user_email) {
          setUserInfo({
            email: result.user_email,
            name: result.user_name,
          });
        }
      } else {
        setMessage(`Login failed: ${result.message}`);
      }
    } catch (error) {
      setMessage(`Error: ${String(error)}`);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleLogout() {
    try {
      await invoke("azure_logout");
      setIsAuthenticated(false);
      setUserInfo(null);
      setMessage("Logged out successfully");
    } catch (error) {
      setMessage(`Error logging out: ${String(error)}`);
    }
  }

  return (
    <main>
      <h1>VaultRaider</h1>
      <p className="subtitle">Azure Key Vault Manager</p>

      <div className="auth-section">
        {!isAuthenticated ? (
          <div className="login-container">
            <h2>Sign in to Azure</h2>
            <p>Connect to your Azure account to manage Key Vaults</p>

            <button
              type="button"
              onClick={handleLogin}
              disabled={isLoading}
              className="login-button"
            >
              {isLoading ? "Authenticating..." : "Sign in with Azure"}
            </button>

            {message && (
              <div
                className={`message ${message.includes("Error") || message.includes("failed") ? "error" : "success"}`}
              >
                {message}
              </div>
            )}
          </div>
        ) : (
          <div className="authenticated-container">
            <h2>✓ Connected to Azure</h2>

            {userInfo && (
              <div className="user-info">
                <div className="user-avatar">
                  {userInfo.name
                    ? userInfo.name.charAt(0).toUpperCase()
                    : userInfo.email.charAt(0).toUpperCase()}
                </div>
                <div className="user-details">
                  {userInfo.name && <p className="user-name">{userInfo.name}</p>}
                  <p className="user-email">{userInfo.email}</p>
                </div>
              </div>
            )}

            <p className="success-message">{message}</p>

            <div className="actions">
              <button type="button" onClick={handleLogout} className="logout-button">
                Sign Out
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

export default App;
