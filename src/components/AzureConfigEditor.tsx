import { invoke } from "@tauri-apps/api/core";
import { useEffect, useEffectEvent, useState } from "react";

interface AzureConfig {
  client_id: string | null;
  tenant_id: string | null;
  effective_client_id: string;
  effective_tenant_id: string;
  default_client_id: string;
  default_tenant_id: string;
}

interface AzureConfigEditorProps {
  onConfigSaved?: () => void;
}

export function AzureConfigEditor({ onConfigSaved }: AzureConfigEditorProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [useCustomClientId, setUseCustomClientId] = useState(false);
  const [useCustomTenantId, setUseCustomTenantId] = useState(false);
  const [clientId, setClientId] = useState("");
  const [tenantId, setTenantId] = useState("");
  const [defaultClientId, setDefaultClientId] = useState("");
  const [defaultTenantId, setDefaultTenantId] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const loadConfig = useEffectEvent(async () => {
    setIsLoading(true);
    try {
      const config = await invoke<AzureConfig>("get_azure_config");
      setDefaultClientId(config.default_client_id);
      setDefaultTenantId(config.default_tenant_id);

      // If user has custom values, show them
      if (config.client_id) {
        setUseCustomClientId(true);
        setClientId(config.client_id);
      } else {
        setUseCustomClientId(false);
        setClientId("");
      }

      if (config.tenant_id) {
        setUseCustomTenantId(true);
        setTenantId(config.tenant_id);
      } else {
        setUseCustomTenantId(false);
        setTenantId("");
      }
    } catch (error) {
      console.error("Error loading Azure config:", error);
      setMessage({ type: "error", text: `Failed to load configuration: ${error}` });
    } finally {
      setIsLoading(false);
    }
  });

  useEffect(() => {
    loadConfig();
  }, []);

  async function handleSave() {
    setIsSaving(true);
    setMessage(null);
    try {
      // Empty strings tell the backend to use defaults
      await invoke("save_azure_config", {
        clientId: useCustomClientId ? clientId.trim() : "",
        tenantId: useCustomTenantId ? tenantId.trim() : "",
      });
      setMessage({ type: "success", text: "Configuration saved successfully!" });
      onConfigSaved?.();
      // Auto-hide success message after 3 seconds
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      console.error("Error saving Azure config:", error);
      setMessage({ type: "error", text: `Failed to save configuration: ${error}` });
    } finally {
      setIsSaving(false);
    }
  }

  function handleReset() {
    loadConfig();
    setMessage(null);
  }

  function handleClearAll() {
    setUseCustomClientId(false);
    setUseCustomTenantId(false);
    setClientId("");
    setTenantId("");
  }

  const isValidGuid = (value: string) => {
    if (!value.trim()) return true; // Empty is valid (means use default)
    const guidRegex =
      /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
    return guidRegex.test(value.trim());
  };

  // Form is valid if:
  // - Custom client ID is enabled and has a valid GUID, OR custom client ID is disabled
  // - Same for tenant ID
  const isClientIdValid = !useCustomClientId || (clientId.trim() !== "" && isValidGuid(clientId));
  const isTenantIdValid = !useCustomTenantId || (tenantId.trim() !== "" && isValidGuid(tenantId));
  const isFormValid = isClientIdValid && isTenantIdValid;

  return (
    <div className="mt-6 border-t border-gray-200 dark:border-gray-700 pt-4">
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 transition-colors"
      >
        <svg
          className={`w-4 h-4 transition-transform ${isExpanded ? "rotate-90" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <title>Toggle configuration</title>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        <span className="font-medium">Advanced: Custom Azure Configuration</span>
      </button>

      {isExpanded && (
        <div className="mt-4 space-y-4">
          {isLoading ? (
            <div className="text-center py-4 text-gray-500 dark:text-gray-400">
              Loading configuration...
            </div>
          ) : (
            <>
              {/* Info box about multi-tenant auth */}
              <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                <p className="text-xs text-blue-700 dark:text-blue-300">
                  <strong>Default:</strong> VaultRaider uses its own multi-tenant app registration,
                  allowing users from any Azure organization to sign in without additional setup.
                </p>
              </div>

              <p className="text-xs text-gray-500 dark:text-gray-400">
                Override the defaults below only if you need to use your own Azure App Registration.
                Leave unchecked to use VaultRaider's built-in authentication.
              </p>

              <div className="space-y-4">
                {/* Client ID section */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="useCustomClientId"
                      checked={useCustomClientId}
                      onChange={(e) => {
                        setUseCustomClientId(e.target.checked);
                        if (!e.target.checked) setClientId("");
                      }}
                      className="w-4 h-4 text-primary-500 border-gray-300 rounded focus:ring-primary-500"
                    />
                    <label
                      htmlFor="useCustomClientId"
                      className="text-sm font-medium text-gray-700 dark:text-gray-300"
                    >
                      Use custom Client ID (Application ID)
                    </label>
                  </div>

                  {useCustomClientId ? (
                    <input
                      id="clientId"
                      type="text"
                      value={clientId}
                      onChange={(e) => setClientId(e.target.value)}
                      placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                      className={`w-full px-3 py-2 text-sm border rounded-lg bg-white dark:bg-gray-800 
                        ${
                          clientId && !isValidGuid(clientId)
                            ? "border-red-300 dark:border-red-600"
                            : "border-gray-300 dark:border-gray-600"
                        }
                        text-gray-900 dark:text-gray-100 
                        focus:ring-2 focus:ring-primary-500 focus:border-primary-500
                        placeholder-gray-400 dark:placeholder-gray-500`}
                    />
                  ) : (
                    <div className="px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-500 dark:text-gray-400">
                      Using VaultRaider's app: <code className="text-xs">{defaultClientId}</code>
                    </div>
                  )}
                  {useCustomClientId && clientId && !isValidGuid(clientId) && (
                    <p className="text-xs text-red-500">Please enter a valid GUID format</p>
                  )}
                </div>

                {/* Tenant ID section */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="useCustomTenantId"
                      checked={useCustomTenantId}
                      onChange={(e) => {
                        setUseCustomTenantId(e.target.checked);
                        if (!e.target.checked) setTenantId("");
                      }}
                      className="w-4 h-4 text-primary-500 border-gray-300 rounded focus:ring-primary-500"
                    />
                    <label
                      htmlFor="useCustomTenantId"
                      className="text-sm font-medium text-gray-700 dark:text-gray-300"
                    >
                      Use custom Tenant ID (Directory ID)
                    </label>
                  </div>

                  {useCustomTenantId ? (
                    <input
                      id="tenantId"
                      type="text"
                      value={tenantId}
                      onChange={(e) => setTenantId(e.target.value)}
                      placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                      className={`w-full px-3 py-2 text-sm border rounded-lg bg-white dark:bg-gray-800 
                        ${
                          tenantId && !isValidGuid(tenantId)
                            ? "border-red-300 dark:border-red-600"
                            : "border-gray-300 dark:border-gray-600"
                        }
                        text-gray-900 dark:text-gray-100 
                        focus:ring-2 focus:ring-primary-500 focus:border-primary-500
                        placeholder-gray-400 dark:placeholder-gray-500`}
                    />
                  ) : (
                    <div className="px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-500 dark:text-gray-400">
                      Using multi-tenant auth: <code className="text-xs">{defaultTenantId}</code>{" "}
                      (any Azure organization)
                    </div>
                  )}
                  {useCustomTenantId && tenantId && !isValidGuid(tenantId) && (
                    <p className="text-xs text-red-500">Please enter a valid GUID format</p>
                  )}
                </div>
              </div>

              {message && (
                <div
                  className={`p-3 rounded-lg text-sm ${
                    message.type === "success"
                      ? "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800"
                      : "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800"
                  }`}
                >
                  {message.text}
                </div>
              )}

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={!isFormValid || isSaving}
                  className={`flex-1 px-3 py-2 text-sm font-medium rounded-lg transition-colors
                    ${
                      isFormValid && !isSaving
                        ? "bg-primary-500 hover:bg-primary-600 text-white"
                        : "bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed"
                    }`}
                >
                  {isSaving ? "Saving..." : "Save Configuration"}
                </button>
                <button
                  type="button"
                  onClick={handleClearAll}
                  disabled={isSaving}
                  className="px-3 py-2 text-sm font-medium text-gray-600 dark:text-gray-400
                    hover:text-gray-900 dark:hover:text-gray-200
                    border border-gray-300 dark:border-gray-600 rounded-lg
                    hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  title="Clear all custom values and use defaults"
                >
                  Use Defaults
                </button>
                <button
                  type="button"
                  onClick={handleReset}
                  disabled={isSaving}
                  className="px-3 py-2 text-sm font-medium text-gray-600 dark:text-gray-400
                    hover:text-gray-900 dark:hover:text-gray-200
                    border border-gray-300 dark:border-gray-600 rounded-lg
                    hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  title="Reload saved configuration"
                >
                  Reset
                </button>
              </div>

              <p className="text-xs text-gray-400 dark:text-gray-500">
                Need to use your own Azure App Registration?{" "}
                <a
                  href="https://docs.microsoft.com/en-us/azure/active-directory/develop/quickstart-register-app"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary-500 hover:text-primary-600 underline"
                >
                  View documentation
                </a>
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
