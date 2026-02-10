import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { invoke } from "@tauri-apps/api/core";
import { useEffect, useState } from "react";
import { Avatar } from "../components/Avatar";
import { AzureConfigEditor } from "../components/AzureConfigEditor";
import { CopyIcon } from "../components/icons";
import { LoadingSpinner } from "../components/LoadingSpinner";
import { useAuth } from "../contexts/AuthContext";

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

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const { isAuthenticated, userInfo, setAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [deviceCodeInfo, setDeviceCodeInfo] = useState<DeviceCodeInfo | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<"cli" | "browser" | null>(null);

  // Redirect to subscriptions if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate({ to: "/subscriptions" });
    }
  }, [isAuthenticated, navigate]);

  async function handleCliLogin() {
    setSelectedMethod("cli");
    setIsLoading(true);
    setMessage("Authenticating with Azure CLI...");

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
      console.error("Error during CLI login:", error);
      setMessage(
        `Azure CLI login failed: ${error}\n\nMake sure you have run 'az login' in your terminal first.`,
      );
    } finally {
      setIsLoading(false);
    }
  }

  async function handleBrowserLogin() {
    setSelectedMethod("browser");
    setIsLoading(true);
    setMessage("Starting browser authentication...");

    try {
      // Start device code flow
      const deviceInfo = await invoke<DeviceCodeInfo>("start_browser_login");
      setDeviceCodeInfo(deviceInfo);
      setMessage("Please complete authentication in your browser");

      // Automatically poll for completion
      pollForDeviceCodeCompletion();
    } catch (error) {
      console.error("Error starting browser login:", error);
      setMessage(`Error: ${error}`);
      setIsLoading(false);
    }
  }

  async function pollForDeviceCodeCompletion() {
    try {
      // This will poll automatically in the backend
      const result = await invoke<AuthResult>("complete_browser_login", {
        authCode: "",
        state: "",
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
      if (
        errorMessage.includes("AADSTS7000218") ||
        errorMessage.includes("client_assertion") ||
        errorMessage.includes("client_secret")
      ) {
        setMessage(
          "❌ Azure App Registration Configuration Error\n\n" +
            "Your app needs to be configured as a Public Client:\n\n" +
            "1. Go to Azure Portal → App Registrations\n" +
            "2. Select your app (Client ID: d904e24e...)\n" +
            "3. Click 'Authentication' → Advanced Settings\n" +
            "4. Set 'Allow public client flows' to YES ✅\n" +
            "5. Click Save\n\n" +
            "See AZURE_APP_REGISTRATION_SETUP.md for detailed instructions.",
        );
      } else if (errorMessage.includes("authorization_pending")) {
        setMessage(
          "Still waiting for authentication. Please complete the sign-in in your browser.",
        );
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
      <h1 className="text-5xl md:text-6xl font-bold mb-12 gradient-text">Welcome to VaultRaider</h1>

      <div className="w-full max-w-md">
        {!isAuthenticated ? (
          <div className="card">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">Sign In</h2>
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
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs font-bold">
                      1
                    </span>
                    <span className="pt-0.5">
                      Visit:{" "}
                      <a
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
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs font-bold">
                      2
                    </span>
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
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs font-bold">
                      3
                    </span>
                    <span className="pt-0.5">Sign in with your Microsoft account</span>
                  </li>
                </ol>
                {isLoading && (
                  <div className="mt-4 flex items-center gap-2 text-blue-700 dark:text-blue-300">
                    <LoadingSpinner size="sm" />
                    <span className="text-sm">Waiting for authentication...</span>
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setDeviceCodeInfo(null);
                    setIsLoading(false);
                    setMessage("");
                    setSelectedMethod(null);
                  }}
                  className="mt-4 w-full px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
              </div>
            )}

            {/* Login Method Selection */}
            {!deviceCodeInfo && (
              <div className="space-y-4">
                {/* Azure CLI Authentication - Recommended */}
                <div className="p-4 rounded-lg border-2 border-primary-200 dark:border-primary-800 bg-primary-50/50 dark:bg-primary-900/20">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-2 py-0.5 text-xs font-medium bg-primary-500 text-white rounded">
                      Recommended
                    </span>
                  </div>
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">Azure CLI</h3>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">
                    Use your existing Azure CLI session. Run{" "}
                    <code className="px-1 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-xs">
                      az login
                    </code>{" "}
                    in your terminal first, then click below.
                  </p>
                  <button
                    type="button"
                    onClick={handleCliLogin}
                    disabled={isLoading}
                    className="btn-primary w-full"
                  >
                    {isLoading && selectedMethod === "cli" ? (
                      <span className="flex items-center justify-center gap-2">
                        <LoadingSpinner size="md" />
                        Authenticating...
                      </span>
                    ) : (
                      "Sign in with Azure CLI"
                    )}
                  </button>
                </div>

                {/* Divider */}
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-300 dark:border-gray-600" />
                  </div>
                  <div className="relative flex justify-center text-xs">
                    <span className="px-2 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                      or
                    </span>
                  </div>
                </div>

                {/* Browser Authentication */}
                <div className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">
                    Browser Authentication
                  </h3>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                    Sign in using your browser with a device code.
                  </p>
                  <p className="text-xs text-amber-600 dark:text-amber-400 mb-3">
                    ⚠️ May require admin consent in some organizations
                  </p>
                  <button
                    type="button"
                    onClick={handleBrowserLogin}
                    disabled={isLoading}
                    className="w-full px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading && selectedMethod === "browser" ? (
                      <span className="flex items-center justify-center gap-2">
                        <LoadingSpinner size="md" />
                        Starting...
                      </span>
                    ) : (
                      "Sign in with Browser"
                    )}
                  </button>
                </div>
              </div>
            )}

            {message && !deviceCodeInfo && (
              <div
                className={`mt-4 p-4 rounded-lg border ${
                  message.includes("Success") || message.includes("authenticated")
                    ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-700 dark:text-green-300"
                    : "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300"
                }`}
              >
                <p className="text-sm whitespace-pre-wrap">{message}</p>
              </div>
            )}

            {/* Azure Configuration Editor */}
            <AzureConfigEditor />
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
                to="/subscriptions"
                className="flex-1 px-6 py-3 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 text-center"
              >
                Go to Subscriptions
              </Link>
              <button type="button" onClick={handleLogout} className="btn-secondary">
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
