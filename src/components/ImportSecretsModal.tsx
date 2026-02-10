import { open } from "@tauri-apps/plugin-dialog";
import { readTextFile } from "@tauri-apps/plugin-fs";
import {
  AlertTriangleIcon,
  CheckIcon,
  FileUpIcon,
  FolderIcon,
  RefreshCwIcon,
  SkipForwardIcon,
  XIcon,
} from "lucide-react";
import { useCallback, useState } from "react";
import { useToast } from "../contexts/ToastContext";
import { createSecret, parseImportFile, updateSecret } from "../services/azureService";
import type { Secret } from "../types/secrets";
import { ActionButton, Alert, Button, IconButton, Modal, ModalFooter } from "./common";

type ImportFormat = "auto" | "full" | "simple" | "keyValue" | "dotenv";
type ConflictResolution = "skip" | "override" | "ask";
type SingleConflictAction = "skip" | "override";

interface ImportedSecret {
  name: string;
  value: string;
}

interface ConflictInfo {
  secret: ImportedSecret;
  existingSecret: Secret;
  action: SingleConflictAction | null;
}

interface ImportSecretsModalProps {
  isOpen: boolean;
  onClose: () => void;
  vaultName: string;
  vaultUri: string;
  existingSecrets: Secret[];
  onImportComplete: () => void;
}

type ImportStep = "select" | "conflicts" | "importing" | "complete";

export function ImportSecretsModal({
  isOpen,
  onClose,
  vaultName,
  vaultUri,
  existingSecrets,
  onImportComplete,
}: ImportSecretsModalProps) {
  const [format, setFormat] = useState<ImportFormat>("auto");
  const [conflictResolution, setConflictResolution] = useState<ConflictResolution>("ask");
  const [filePath, setFilePath] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [conflicts, setConflicts] = useState<ConflictInfo[]>([]);
  const [newSecrets, setNewSecrets] = useState<ImportedSecret[]>([]);
  const [step, setStep] = useState<ImportStep>("select");
  const [isLoading, setIsLoading] = useState(false);
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0 });
  const [importResults, setImportResults] = useState({ success: 0, failed: 0, skipped: 0 });
  const { showError } = useToast();

  const resetState = useCallback(() => {
    setFormat("auto");
    setConflictResolution("ask");
    setFilePath(null);
    setFileContent(null);
    setConflicts([]);
    setNewSecrets([]);
    setStep("select");
    setIsLoading(false);
    setImportProgress({ current: 0, total: 0 });
    setImportResults({ success: 0, failed: 0, skipped: 0 });
  }, []);

  const handleClose = useCallback(() => {
    resetState();
    onClose();
  }, [resetState, onClose]);

  const handleSelectFile = async () => {
    try {
      const selected = await open({
        multiple: false,
        filters: [
          { name: "JSON Files", extensions: ["json"] },
          { name: "Environment Files", extensions: ["env"] },
          { name: "Text Files", extensions: ["txt"] },
          { name: "All Files", extensions: ["*"] },
        ],
      });
      if (selected) {
        setFilePath(selected);
        const content = await readTextFile(selected);
        setFileContent(content);
      }
    } catch (error) {
      console.error("Failed to select file:", error);
      showError("Failed to select file", error instanceof Error ? error.message : String(error));
    }
  };

  const handleParseFile = async () => {
    if (!fileContent) {
      showError("No file selected", "Please select a file to import");
      return;
    }

    setIsLoading(true);
    try {
      const parsed = await parseImportFile(fileContent, format === "auto" ? undefined : format);

      // Check for conflicts
      const existingNames = new Set(
        existingSecrets.map((s) => {
          // Extract name from ID (last segment)
          const parts = s.id.split("/");
          return parts[parts.length - 1];
        }),
      );

      const conflicting: ConflictInfo[] = [];
      const nonConflicting: ImportedSecret[] = [];

      for (const secret of parsed) {
        if (
          existingNames.has(secret.name) &&
          existingSecrets.find((s) => s.id.split("/").pop() === secret.name) != null
        ) {
          // biome-ignore lint/style/noNonNullAssertion: checked in if statement above
          const existing = existingSecrets.find((s) => s.id.split("/").pop() === secret.name)!;
          conflicting.push({
            secret,
            existingSecret: existing,
            action:
              conflictResolution === "skip"
                ? "skip"
                : conflictResolution === "override"
                  ? "override"
                  : null,
          });
        } else {
          nonConflicting.push(secret);
        }
      }

      setConflicts(conflicting);
      setNewSecrets(nonConflicting);

      // Decide next step
      if (conflicting.length > 0 && conflictResolution === "ask") {
        setStep("conflicts");
      } else {
        // Proceed directly to import
        await performImport(nonConflicting, conflicting);
      }
    } catch (error) {
      showError("Failed to parse file", error instanceof Error ? error.message : String(error));
    } finally {
      setIsLoading(false);
    }
  };

  const handleConflictAction = (index: number, action: SingleConflictAction) => {
    setConflicts((prev) => prev.map((c, i) => (i === index ? { ...c, action } : c)));
  };

  const handleSetAllConflicts = (action: SingleConflictAction) => {
    setConflicts((prev) => prev.map((c) => ({ ...c, action })));
  };

  const performImport = async (
    secretsToCreate: ImportedSecret[],
    conflictsToResolve: ConflictInfo[],
  ) => {
    setStep("importing");
    const toOverride = conflictsToResolve.filter((c) => c.action === "override");
    const total = secretsToCreate.length + toOverride.length;
    setImportProgress({ current: 0, total });

    let success = 0;
    let failed = 0;
    const skipped = conflictsToResolve.filter((c) => c.action === "skip").length;

    // Create new secrets
    for (const secret of secretsToCreate) {
      try {
        await createSecret(vaultUri, secret.name, secret.value);
        success++;
      } catch (error) {
        console.error(`Failed to create secret ${secret.name}:`, error);
        failed++;
      }
      setImportProgress((prev) => ({ ...prev, current: prev.current + 1 }));
    }

    // Override existing secrets
    for (const conflict of toOverride) {
      try {
        await updateSecret(vaultUri, conflict.secret.name, conflict.secret.value);
        success++;
      } catch (error) {
        console.error(`Failed to update secret ${conflict.secret.name}:`, error);
        failed++;
      }
      setImportProgress((prev) => ({ ...prev, current: prev.current + 1 }));
    }

    setImportResults({ success, failed, skipped });
    setStep("complete");
  };

  const handleProceedWithImport = async () => {
    // Check if all conflicts have actions
    const unresolvedConflicts = conflicts.filter((c) => c.action === null);
    if (unresolvedConflicts.length > 0) {
      showError(
        "Unresolved conflicts",
        `Please resolve all ${unresolvedConflicts.length} conflicts before importing`,
      );
      return;
    }
    await performImport(newSecrets, conflicts);
  };

  const handleComplete = () => {
    onImportComplete();
    handleClose();
  };

  const formatDescriptions: Record<ImportFormat, string> = {
    auto: "Automatically detect the format from file content",
    full: "Complete export format with vault metadata",
    simple: "Array of secrets with name and value",
    keyValue: 'Simple key-value object { "secret-name": "value" }',
    dotenv: '.env file format (SECRET_NAME="value")',
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} maxWidth="2xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
            <FileUpIcon className="w-5 h-5 text-green-600 dark:text-green-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Import Secrets</h3>
        </div>
        <IconButton
          icon={<XIcon className="w-5 h-5" />}
          label="Close"
          variant="ghost"
          onClick={handleClose}
        />
      </div>

      {/* Step: Select File */}
      {step === "select" && (
        <>
          {/* File Selection */}
          <div className="mb-6">
            <label
              htmlFor="importFileInput"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Select File
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={filePath || ""}
                readOnly
                placeholder="Select a file to import..."
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 text-sm"
              />
              <Button
                id="importFileInput"
                variant="secondary"
                onClick={handleSelectFile}
                leftIcon={<FolderIcon className="w-4 h-4" />}
              >
                Browse
              </Button>
            </div>
          </div>

          {/* Format Selection */}
          <div className="mb-6">
            <label
              htmlFor="importFormat"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3"
            >
              Import Format
            </label>
            <div id="importFormat" className="grid grid-cols-2 gap-3">
              {(["auto", "full", "simple", "keyValue", "dotenv"] as ImportFormat[]).map((fmt) => (
                <button
                  key={fmt}
                  type="button"
                  onClick={() => setFormat(fmt)}
                  className={`p-3 text-left rounded-lg border-2 transition-colors ${
                    format === fmt
                      ? "border-green-500 bg-green-50 dark:bg-green-900/20"
                      : "border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500"
                  }`}
                >
                  <div className="font-medium text-sm text-gray-900 dark:text-gray-100 capitalize">
                    {fmt === "keyValue"
                      ? "Key-Value"
                      : fmt === "dotenv"
                        ? ".env"
                        : fmt === "auto"
                          ? "Auto-detect"
                          : fmt}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {formatDescriptions[fmt]}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Conflict Resolution */}
          <div className="mb-6">
            <label
              htmlFor="conflict-resolution"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3"
            >
              Default Conflict Resolution
            </label>
            <div id="conflict-resolution" className="space-y-2">
              {(
                [
                  {
                    value: "ask",
                    label: "Ask for each conflict",
                    description: "Review and decide action for each conflicting secret",
                  },
                  {
                    value: "skip",
                    label: "Skip all conflicts",
                    description: "Keep existing values, only import new secrets",
                  },
                  {
                    value: "override",
                    label: "Override all conflicts",
                    description: "Replace existing secrets with imported values",
                  },
                ] as const
              ).map((option) => (
                <label
                  key={option.value}
                  className={`flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                    conflictResolution === option.value
                      ? "border-green-500 bg-green-50 dark:bg-green-900/20"
                      : "border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500"
                  }`}
                >
                  <input
                    type="radio"
                    name="conflictResolution"
                    value={option.value}
                    checked={conflictResolution === option.value}
                    onChange={() => setConflictResolution(option.value)}
                    className="mt-0.5"
                  />
                  <div>
                    <div className="font-medium text-sm text-gray-900 dark:text-gray-100">
                      {option.label}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      {option.description}
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Info */}
          <div className="mb-6 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Import secrets into <span className="font-medium">{vaultName}</span>. Currently has{" "}
              <span className="font-medium">{existingSecrets.length}</span> secret
              {existingSecrets.length !== 1 ? "s" : ""}.
            </p>
          </div>

          {/* Actions */}
          <ModalFooter>
            <Button variant="secondary" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              variant="success"
              onClick={handleParseFile}
              disabled={isLoading || !filePath}
              isLoading={isLoading}
              loadingText="Parsing..."
              leftIcon={<FileUpIcon className="w-4 h-4" />}
            >
              Parse & Import
            </Button>
          </ModalFooter>
        </>
      )}

      {/* Step: Resolve Conflicts */}
      {step === "conflicts" && (
        <>
          <Alert variant="warning" className="mb-4">
            <div className="flex items-center gap-2">
              <AlertTriangleIcon className="w-5 h-5" />
              <span className="font-medium">
                {conflicts.length} conflict{conflicts.length !== 1 ? "s" : ""} found
              </span>
            </div>
            <p className="text-sm mt-1">
              The following secrets already exist in the vault. Choose what to do with each one.
            </p>
          </Alert>

          {/* Bulk Actions */}
          <div className="mb-4 flex gap-2">
            <ActionButton
              variant="secondary"
              onClick={() => handleSetAllConflicts("skip")}
              leftIcon={<SkipForwardIcon className="w-3 h-3" />}
            >
              Skip All
            </ActionButton>
            <ActionButton
              variant="secondary"
              onClick={() => handleSetAllConflicts("override")}
              leftIcon={<RefreshCwIcon className="w-3 h-3" />}
            >
              Override All
            </ActionButton>
          </div>

          {/* Conflicts List */}
          <div className="mb-6 max-h-64 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg">
            {conflicts.map((conflict, index) => (
              <div
                key={conflict.secret.name}
                className={`p-3 flex items-center justify-between gap-4 ${
                  index !== conflicts.length - 1
                    ? "border-b border-gray-200 dark:border-gray-700"
                    : ""
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="font-mono text-sm text-gray-900 dark:text-gray-100 truncate">
                    {conflict.secret.name}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    Import value: {conflict.secret.value.substring(0, 20)}
                    {conflict.secret.value.length > 20 ? "..." : ""}
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleConflictAction(index, "skip")}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                      conflict.action === "skip"
                        ? "bg-gray-600 text-white"
                        : "text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600"
                    }`}
                  >
                    Skip
                  </button>
                  <button
                    type="button"
                    onClick={() => handleConflictAction(index, "override")}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                      conflict.action === "override"
                        ? "bg-orange-600 text-white"
                        : "text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600"
                    }`}
                  >
                    Override
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Summary */}
          <div className="mb-6 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              <span className="font-medium">{newSecrets.length}</span> new secret
              {newSecrets.length !== 1 ? "s" : ""} will be created.{" "}
              <span className="font-medium">
                {conflicts.filter((c) => c.action === "override").length}
              </span>{" "}
              will be overridden.{" "}
              <span className="font-medium">
                {conflicts.filter((c) => c.action === "skip").length}
              </span>{" "}
              will be skipped.{" "}
              <span className="font-medium text-yellow-600 dark:text-yellow-400">
                {conflicts.filter((c) => c.action === null).length}
              </span>{" "}
              unresolved.
            </p>
          </div>

          {/* Actions */}
          <ModalFooter>
            <Button variant="secondary" onClick={() => setStep("select")}>
              Back
            </Button>
            <Button
              variant="success"
              onClick={handleProceedWithImport}
              disabled={conflicts.some((c) => c.action === null)}
              leftIcon={<FileUpIcon className="w-4 h-4" />}
            >
              Import Secrets
            </Button>
          </ModalFooter>
        </>
      )}

      {/* Step: Importing */}
      {step === "importing" && (
        <div className="py-8 text-center">
          <div className="mb-4">
            <div className="animate-spin inline-block w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full" />
          </div>
          <p className="text-lg font-medium text-gray-900 dark:text-gray-100">
            Importing secrets...
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
            {importProgress.current} of {importProgress.total} completed
          </p>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-4 max-w-xs mx-auto">
            <div
              className="bg-green-500 h-2 rounded-full transition-all duration-300"
              style={{
                width:
                  importProgress.total > 0
                    ? `${(importProgress.current / importProgress.total) * 100}%`
                    : "0%",
              }}
            />
          </div>
        </div>
      )}

      {/* Step: Complete */}
      {step === "complete" && (
        <>
          <div className="py-6 text-center">
            <div className="mb-4 inline-flex items-center justify-center w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-full">
              <CheckIcon className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <p className="text-lg font-medium text-gray-900 dark:text-gray-100">Import Complete</p>
          </div>

          <div className="mb-6 grid grid-cols-3 gap-4">
            <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg text-center">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                {importResults.success}
              </div>
              <div className="text-xs text-green-700 dark:text-green-300">Imported</div>
            </div>
            <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg text-center">
              <div className="text-2xl font-bold text-gray-600 dark:text-gray-400">
                {importResults.skipped}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Skipped</div>
            </div>
            <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg text-center">
              <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                {importResults.failed}
              </div>
              <div className="text-xs text-red-700 dark:text-red-300">Failed</div>
            </div>
          </div>

          <ModalFooter>
            <Button
              variant="success"
              onClick={handleComplete}
              leftIcon={<CheckIcon className="w-4 h-4" />}
            >
              Done
            </Button>
          </ModalFooter>
        </>
      )}
    </Modal>
  );
}
