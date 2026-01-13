import { createFileRoute, Link } from '@tanstack/react-router'
import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import "../App.css";

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

  async function checkAuthStatus() {
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
  }

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
    <div className="container">
      <h1>Welcome to VaultRaider</h1>

      <div className="card">
        {!isAuthenticated ? (
          <div>
            <button onClick={handleLogin} disabled={isLoading}>
              {isLoading ? "Authenticating..." : "Login with Azure"}
            </button>
            {message && <p className="message">{message}</p>}
          </div>
        ) : (
          <div>
            <h2>You are logged in!</h2>
            {userInfo && (
              <div className="user-info">
                <p>
                  <strong>Email:</strong> {userInfo.email}
                </p>
                {userInfo.name && (
                  <p>
                    <strong>Name:</strong> {userInfo.name}
                  </p>
                )}
              </div>
            )}
            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem', justifyContent: 'center' }}>
              <Link to="/dashboard" style={{ padding: '0.5rem 1rem', background: '#646cff', color: 'white', borderRadius: '8px', textDecoration: 'none' }}>
                Go to Dashboard
              </Link>
              <button onClick={handleLogout}>Logout</button>
            </div>
            {message && <p className="message">{message}</p>}
          </div>
        )}
      </div>

      <p className="read-the-docs">
        Click on the Tauri, Vite, and React logos to learn more
      </p>
    </div>
  );
}

