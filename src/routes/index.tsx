import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useAuth } from "../contexts/AuthContext";
import { LoadingSpinner } from "../components/LoadingSpinner";
import { Avatar } from "../components/Avatar";
import { CopyIcon } from "../components/icons";

interface AuthResult {
  success: boolean;
  message: string;
  user_email?: string;
  user_name?: string;
}

interface DeviceCodeInfo {
  user_code: string;
  device_code: string;
  verification_uri: string;
  message: string;
}

export const Route = createFileRoute('/')({
  component: Index,
})

function Index() {
  const { isAuthenticated, userInfo, setAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [deviceCodeInfo, setDeviceCodeInfo] = useState<DeviceCodeInfo | null>(null);
  const [showDeviceCodeFlow, setShowDeviceCodeFlow] = useState(false);

  // Redirect to subscriptions if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate({ to: '/subscriptions' });
    }
  }, [isAuthenticated, navigate]);



  async function handleLogin() {
    setIsLoading(true);
    setMessage("Starting Azure login...");

    try {
      const result = await invoke<AuthResult>("azure_login");

      if (result.success) {
        setAuthenticated(true, {
          email: result.user_email || "",
          name: result.user_name,
        });
        setMessage("Successfully authenticated!");
      } else {
        setMessage(`Login failed: ${result.message}`);
      }
    } catch (error) {
      console.error("Error during login:", error);
      const errorMessage = String(error);

      // Check if Azure CLI failed - offer device code flow as fallback
      if (errorMessage.includes("Azure CLI") || errorMessage.includes("az login")) {
        setMessage("Azure CLI not available. Would you like to use browser authentication instead?");
        setShowDeviceCodeFlow(true);
      } else {
        setMessage(`Error: ${error}`);
      }
    } finally {
      setIsLoading(false);
    }
  }

  async function handleDeviceCodeLogin() {
    setIsLoading(true);
    setMessage("Starting device code authentication...");
    setShowDeviceCodeFlow(false);

    try {
      // Start device code flow
      const deviceInfo = await invoke<DeviceCodeInfo>("start_browser_login");
      setDeviceCodeInfo(deviceInfo);
      setMessage("Please complete authentication in your browser");

      // Automatically poll for completion
      pollForDeviceCodeCompletion();
    } catch (error) {
      console.error("Error starting device code flow:", error);
      setMessage(`Error: ${error}`);
      setIsLoading(false);
    }
  }

  async function pollForDeviceCodeCompletion() {
    try {
      // This will poll automatically in the backend
      const result = await invoke<AuthResult>("complete_browser_login", {
        authCode: "",
        state: ""
      });

      if (result.success) {
        setAuthenticated(true, {
          email: result.user_email || "",
          name: result.user_name,
        });
        setMessage("Successfully authenticated with device code!");
        setDeviceCodeInfo(null);
      } else {
        setMessage(`Authentication failed: ${result.message}`);
      }
    } catch (error) {
      console.error("Error during device code authentication:", error);
      const errorMessage = String(error);

      // Check for specific Azure configuration errors
      if (errorMessage.includes("AADSTS7000218") || errorMessage.includes("client_assertion") || errorMessage.includes("client_secret")) {
        setMessage(
          "❌ Azure App Registration Configuration Error\n\n" +
          "Your app needs to be configured as a Public Client:\n\n" +
          "1. Go to Azure Portal → App Registrations\n" +
          "2. Select your app (Client ID: d904e24e...)\n" +
          "3. Click 'Authentication' → Advanced Settings\n" +
          "4. Set 'Allow public client flows' to YES ✅\n" +
          "5. Click Save\n\n" +
          "See AZURE_APP_REGISTRATION_SETUP.md for detailed instructions."
        );
      } else if (errorMessage.includes("authorization_pending")) {
        setMessage("Still waiting for authentication. Please complete the sign-in in your browser.");
      } else if (errorMessage.includes("expired_token") || errorMessage.includes("timed out")) {
        setMessage("Authentication timed out. Please try again.");
      } else {
        setMessage(`Error: ${error}`);
      }
      setDeviceCodeInfo(null);
    } finally {
      setIsLoading(false);
    }
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
    setMessage("Code copied to clipboard!");
  }

  async function handleLogout() {
    try {
      await logout();
      setMessage("Logged out successfully");
    } catch (error) {
      console.error("Error during logout:", error);
      setMessage(`Error: ${error}`);
    }
  }

  return (
    <div className="h-full flex flex-col items-center justify-center px-4 py-12">
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

            {/* Device Code Display */}
            {deviceCodeInfo && (
              <div className="mb-6 p-6 rounded-lg bg-blue-50 dark:bg-blue-900/30 border-2 border-blue-300 dark:border-blue-700">
                <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-4">
                  Complete Authentication
                </h3>
                <ol className="space-y-3 text-sm text-blue-800 dark:text-blue-200">
                  <li className="flex items-start gap-2">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs font-bold">1</span>
                    <span className="pt-0.5">
                      Visit: <a
                        href={deviceCodeInfo.verification_uri}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium underline hover:text-blue-600 dark:hover:text-blue-300"
                      >
                        {deviceCodeInfo.verification_uri}
                      </a>
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs font-bold">2</span>
                    <div className="pt-0.5 flex-1">
                      <span className="block mb-2">Enter this code:</span>
                      <div className="flex items-center gap-2">
                        <code className="flex-1 px-4 py-2 bg-white dark:bg-gray-800 rounded border border-blue-300 dark:border-blue-600 font-mono text-lg font-bold text-blue-600 dark:text-blue-400 tracking-wider">
                          {deviceCodeInfo.user_code}
                        </code>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(deviceCodeInfo.user_code)}
                          className="px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded transition-colors"
                          title="Copy code"
                        >
                          <CopyIcon />
                        </button>
                      </div>
                    </div>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs font-bold">3</span>
                    <span className="pt-0.5">Sign in with your Microsoft account</span>
                  </li>
                </ol>
                {isLoading && (
                  <div className="mt-4 flex items-center gap-2 text-blue-700 dark:text-blue-300">
                    <LoadingSpinner size="sm" />
                    <span className="text-sm">Waiting for authentication...</span>
                  </div>
                )}
              </div>
            )}

            {/* Login Buttons */}
            {!deviceCodeInfo && (
              <>
                <button
                  type="button"
                  onClick={handleLogin}
                  disabled={isLoading}
                  className="btn-primary w-full"
                >
                  {isLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <LoadingSpinner size="md" />
                      Authenticating...
                    </span>
                  ) : (
                    "Login with Azure"
                  )}
                </button>

                {/* Device Code Flow Option */}
                {showDeviceCodeFlow && (
                  <div className="mt-4 p-4 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                    <p className="text-sm text-amber-800 dark:text-amber-200 mb-3">
                      Azure CLI is not available. You can authenticate using your browser instead.
                    </p>
                    <button
                      type="button"
                      onClick={handleDeviceCodeLogin}
                      className="w-full px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-lg transition-colors"
                    >
                      Use Browser Authentication
                    </button>
                  </div>
                )}
              </>
            )}

            {message && !deviceCodeInfo && (
              <div className={`mt-4 p-4 rounded-lg border ${
                message.includes("Success") || message.includes("authenticated")
                  ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-700 dark:text-green-300"
                  : message.includes("Azure CLI not available") || showDeviceCodeFlow
                  ? "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300"
                  : "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300"
              }`}>
                <p className="text-sm whitespace-pre-wrap">{message}</p>
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
                  <Avatar name={userInfo.name} email={userInfo.email} size="lg" />
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

