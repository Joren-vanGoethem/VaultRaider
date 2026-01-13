import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import "./App.css";

interface AuthResult {
  success: boolean;
  message: string;
  user_email?: string;
}

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");

  // Check authentication status on mount
  useEffect(() => {
    checkAuthStatus();
  }, []);

  async function checkAuthStatus() {
    try {
      const authenticated = await invoke<boolean>("check_auth");
      setIsAuthenticated(authenticated);
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
        setMessage(result.message);
      } else {
        setMessage("Login failed: " + result.message);
      }
    } catch (error) {
      setMessage("Error: " + String(error));
    } finally {
      setIsLoading(false);
    }
  }

  async function handleLogout() {
    try {
      await invoke("azure_logout");
      setIsAuthenticated(false);
      setMessage("Logged out successfully");
    } catch (error) {
      setMessage("Error logging out: " + String(error));
    }
  }

  return (
    <main className="container">
      <h1>VaultRaider</h1>
      <p className="subtitle">Azure Key Vault Manager</p>

      <div className="auth-section">
        {!isAuthenticated ? (
          <div className="login-container">
            <h2>Sign in to Azure</h2>
            <p>Connect to your Azure account to manage Key Vaults</p>

            <button
              onClick={handleLogin}
              disabled={isLoading}
              className="login-button"
            >
              {isLoading ? "Authenticating..." : "Sign in with Azure"}
            </button>

            {message && (
              <div className={`message ${message.includes("Error") || message.includes("failed") ? "error" : "success"}`}>
                {message}
              </div>
            )}
          </div>
        ) : (
          <div className="authenticated-container">
            <h2>✓ Connected to Azure</h2>
            <p className="success-message">{message}</p>

            <div className="actions">
              <button onClick={handleLogout} className="logout-button">
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
