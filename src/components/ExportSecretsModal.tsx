import { writeTextFile } from "@tauri-apps/plugin-fs";
import { FileJsonIcon, XIcon } from "lucide-react";
import { useState } from "react";
import { useToast } from "../contexts/ToastContext";
import { exportSecrets } from "../services/azureService";
import type { Secret } from "../types/secrets";
import { Button, FileSaveSelector, IconButton, Modal, ModalFooter } from "./common";

type ExportFormat = "full" | "simple" | "keyValue" | "dotenv";

interface ExportOptions {
  includeName: boolean;
  includeValue: boolean;
  includeAttributes: boolean;
  includeEnabled: boolean;
  includeCreated: boolean;
  includeUpdated: boolean;
  includeRecoveryLevel: boolean;
}

interface ExportSecretsModalProps {
  isOpen: boolean;
  onClose: () => void;
  vaultName: string;
  vaultUri: string;
  secrets: Secret[];
}

const defaultOptions: ExportOptions = {
  includeName: true,
  includeValue: true,
  includeAttributes: false,
  includeEnabled: false,
  includeCreated: false,
  includeUpdated: false,
  includeRecoveryLevel: false,
};

export function ExportSecretsModal({
  isOpen,
  onClose,
  vaultName,
  vaultUri,
  secrets,
}: ExportSecretsModalProps) {
  const [format, setFormat] = useState<ExportFormat>("simple");
  const [options, setOptions] = useState<ExportOptions>(defaultOptions);
  const [isExporting, setIsExporting] = useState(false);
  const [savePath, setSavePath] = useState<string | null>(null);
  const { showSuccess, showError } = useToast();

  const handleOptionChange = (key: keyof ExportOptions) => {
    setOptions((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleExport = async () => {
    if (!savePath) {
      showError("No location selected", "Please select a location to save the file");
      return;
    }

    setIsExporting(true);
    try {
      const exportContent = await exportSecrets(vaultName, vaultUri, {
        format,
        includeValue: options.includeValue,
        includeEnabled: options.includeEnabled,
        includeCreated: options.includeCreated,
        includeUpdated: options.includeUpdated,
        includeRecoveryLevel: options.includeRecoveryLevel,
      });

      await writeTextFile(savePath, exportContent);
      showSuccess(`Exported ${secrets.length} secrets to ${savePath}`);
      onClose();
    } catch (error) {
      showError("Export failed", error instanceof Error ? error.message : String(error));
    } finally {
      setIsExporting(false);
    }
  };

  const formatDescriptions: Record<ExportFormat, string> = {
    full: "Complete export with vault metadata and selected attributes",
    simple: "Array of secrets with name and value only",
    keyValue: 'Simple key-value object { "secret-name": "value" }',
    dotenv: '.env file format (SECRET_NAME="value")',
  };

  const formatExamples: Record<ExportFormat, string> = {
    full: `{
  "vaultName": "${vaultName}",
  "vaultUri": "${vaultUri}",
  "exportedAt": "2026-02-03T...",
  "secrets": [
    { "name": "...", "value": "...", "attributes": {...} }
  ]
}`,
    simple: `{
  "secrets": [
    { "name": "my-secret", "value": "secret-value" }
  ]
}`,
    keyValue: `{
  "my-secret": "secret-value",
  "another-secret": "another-value"
}`,
    dotenv: `MY_SECRET="secret-value"
ANOTHER_SECRET="another-value"`,
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="2xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
            <FileJsonIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Export Secrets</h3>
        </div>
        <IconButton
          icon={<XIcon className="w-5 h-5" />}
          label="Close"
          variant="ghost"
          onClick={onClose}
        />
      </div>

      {/* Format Selection */}
      <div className="mb-6">
        <label
          htmlFor="formatGrid"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3"
        >
          Export Format
        </label>
        <div id="formatGrid" className="grid grid-cols-2 gap-3">
          {(["full", "simple", "keyValue", "dotenv"] as ExportFormat[]).map((fmt) => (
            <button
              key={fmt}
              type="button"
              onClick={() => setFormat(fmt)}
              className={`p-3 text-left rounded-lg border-2 transition-colors ${
                format === fmt
                  ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                  : "border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500"
              }`}
            >
              <div className="font-medium text-sm text-gray-900 dark:text-gray-100 capitalize">
                {fmt === "keyValue" ? "Key-Value" : fmt === "dotenv" ? ".env" : fmt}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {formatDescriptions[fmt]}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Format Preview */}
      <div className="mb-6">
        <label
          htmlFor="formatPreview"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
        >
          Preview
        </label>
        <pre
          id="formatPreview"
          className="text-xs bg-gray-100 dark:bg-gray-900 p-3 rounded-lg text-gray-700 dark:text-gray-300 overflow-auto max-h-32"
        >
          {formatExamples[format]}
        </pre>
      </div>

      {/* Options for Full Format */}
      {format === "full" && (
        <div className="mb-6">
          <label
            htmlFor="includeProperties"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3"
          >
            Include Properties
          </label>
          <div id="includeProperties" className="grid grid-cols-2 gap-2">
            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
              <input
                type="checkbox"
                checked={options.includeName}
                onChange={() => handleOptionChange("includeName")}
                disabled
                className="rounded border-gray-300 dark:border-gray-600"
              />
              Name (required)
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
              <input
                type="checkbox"
                checked={options.includeValue}
                onChange={() => handleOptionChange("includeValue")}
                className="rounded border-gray-300 dark:border-gray-600"
              />
              Value
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
              <input
                type="checkbox"
                checked={options.includeEnabled}
                onChange={() => handleOptionChange("includeEnabled")}
                className="rounded border-gray-300 dark:border-gray-600"
              />
              Enabled status
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
              <input
                type="checkbox"
                checked={options.includeCreated}
                onChange={() => handleOptionChange("includeCreated")}
                className="rounded border-gray-300 dark:border-gray-600"
              />
              Created date
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
              <input
                type="checkbox"
                checked={options.includeUpdated}
                onChange={() => handleOptionChange("includeUpdated")}
                className="rounded border-gray-300 dark:border-gray-600"
              />
              Updated date
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
              <input
                type="checkbox"
                checked={options.includeRecoveryLevel}
                onChange={() => handleOptionChange("includeRecoveryLevel")}
                className="rounded border-gray-300 dark:border-gray-600"
              />
              Recovery level
            </label>
          </div>
        </div>
      )}

      {/* Save Location */}
      <div className="mb-6">
        <label
          htmlFor="saveLocation"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
        >
          Save Location
        </label>
        <FileSaveSelector
          value={savePath}
          onChange={setSavePath}
          defaultFileName={`${vaultName}-secrets-${new Date().toISOString().split("T")[0]}.json`}
          filters={[
            { name: "JSON", extensions: ["json"] },
            { name: "Text", extensions: ["txt", "env"] },
          ]}
        />
      </div>

      {/* Export Info */}
      <div className="mb-6 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          <span className="font-medium">{secrets.length}</span> secret
          {secrets.length !== 1 ? "s" : ""} will be exported from{" "}
          <span className="font-medium">{vaultName}</span>
        </p>
      </div>

      {/* Actions */}
      <ModalFooter>
        <Button variant="secondary" onClick={onClose} disabled={isExporting}>
          Cancel
        </Button>
        <Button
          variant="primary"
          onClick={handleExport}
          disabled={isExporting || !savePath}
          isLoading={isExporting}
          loadingText="Exporting..."
          leftIcon={<FileJsonIcon className="w-4 h-4" />}
        >
          Export
        </Button>
      </ModalFooter>
    </Modal>
  );
}
