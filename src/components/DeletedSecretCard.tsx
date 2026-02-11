import { useMutation, useQueryClient } from "@tanstack/react-query";
import { RotateCcw, Trash2 } from "lucide-react";
import { useState } from "react";
import { useToast } from "../contexts/ToastContext";
import {
  fetchDeletedSecretsKey,
  fetchSecretsKey,
  purgeDeletedSecret,
  recoverDeletedSecret,
} from "../services/azureService";
import type { DeletedSecretItem } from "../types/secrets";
import { extractSecretName } from "../utils/stringUtils";
import {
  Button,
  formatDate,
  Modal,
  ModalDescription,
  ModalFooter,
  ModalTitle,
  StatusBadge,
} from "./common";

interface DeletedSecretCardProps {
  secret: DeletedSecretItem;
  vaultUri: string;
  canRecover: boolean;
  canPurge: boolean;
}

export function DeletedSecretCard({
  secret,
  vaultUri,
  canRecover,
  canPurge,
}: DeletedSecretCardProps) {
  const [showRecoverModal, setShowRecoverModal] = useState(false);
  const [showPurgeModal, setShowPurgeModal] = useState(false);
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToast();

  const secretName = extractSecretName(secret.id);

  const formatDateSafe = (timestamp?: number) => {
    if (!timestamp) return "Unknown";
    return formatDate(timestamp);
  };

  const recoverMutation = useMutation({
    mutationFn: () => recoverDeletedSecret(vaultUri, secretName),
    onSuccess: () => {
      showSuccess(`Secret "${secretName}" recovered successfully`);
      setShowRecoverModal(false);
      queryClient.invalidateQueries({ queryKey: [fetchDeletedSecretsKey, vaultUri] });
      queryClient.invalidateQueries({ queryKey: [fetchSecretsKey, vaultUri] });
    },
    onError: (error) => {
      const errorMsg = error instanceof Error ? error.message : String(error);
      showError("Failed to recover secret", errorMsg);
      setShowRecoverModal(false);
    },
  });

  const purgeMutation = useMutation({
    mutationFn: () => purgeDeletedSecret(vaultUri, secretName),
    onSuccess: () => {
      showSuccess(`Secret "${secretName}" purged permanently`);
      setShowPurgeModal(false);
      queryClient.invalidateQueries({ queryKey: [fetchDeletedSecretsKey, vaultUri] });
    },
    onError: (error) => {
      const errorMsg = error instanceof Error ? error.message : String(error);
      showError("Failed to purge secret", errorMsg);
      setShowPurgeModal(false);
    },
  });

  return (
    <div className="flex-col border rounded-lg p-3 transition-colors border-red-200 dark:border-red-800/50 bg-red-50/30 dark:bg-red-900/10 hover:border-red-400 dark:hover:border-red-600">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <span className="font-mono text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
            {secretName}
          </span>
          <StatusBadge variant="deleted">Deleted</StatusBadge>
        </div>
        <div className="flex items-center gap-1 shrink-0 ml-2">
          {canRecover && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowRecoverModal(true)}
              disabled={recoverMutation.isPending}
              isLoading={recoverMutation.isPending}
              loadingText="..."
              leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
              title="Recover this secret"
            >
              Recover
            </Button>
          )}
          {canPurge && (
            <Button
              variant="danger"
              size="sm"
              onClick={() => setShowPurgeModal(true)}
              disabled={purgeMutation.isPending}
              isLoading={purgeMutation.isPending}
              loadingText="..."
              leftIcon={<Trash2 className="w-3.5 h-3.5" />}
              title="Permanently delete this secret"
            >
              Purge
            </Button>
          )}
        </div>
      </div>

      {/* Attributes */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-600 dark:text-gray-400">
        <div className="flex items-center gap-1">
          <span className="text-gray-500 dark:text-gray-500">Deleted:</span>
          <span className="text-gray-900 dark:text-gray-100">
            {formatDateSafe(secret.deletedDate)}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-gray-500 dark:text-gray-500">Scheduled purge:</span>
          <span className="text-gray-900 dark:text-gray-100">
            {formatDateSafe(secret.scheduledPurgeDate)}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-gray-500 dark:text-gray-500">Recovery:</span>
          <span className="text-gray-900 dark:text-gray-100">
            {secret.attributes.recoveryLevel}
          </span>
        </div>
      </div>

      {/* Recover Confirmation Modal */}
      <Modal isOpen={showRecoverModal} onClose={() => setShowRecoverModal(false)}>
        <ModalTitle>Recover Secret</ModalTitle>
        <ModalDescription>
          Are you sure you want to recover the secret{" "}
          <span className="font-mono font-semibold text-gray-900 dark:text-gray-100">
            "{secretName}"
          </span>
          ? It will be restored to the active secrets list.
        </ModalDescription>
        <ModalFooter>
          <Button
            variant="secondary"
            onClick={() => setShowRecoverModal(false)}
            disabled={recoverMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={() => recoverMutation.mutate()}
            disabled={recoverMutation.isPending}
            isLoading={recoverMutation.isPending}
            loadingText="Recovering..."
          >
            Recover
          </Button>
        </ModalFooter>
      </Modal>

      {/* Purge Confirmation Modal */}
      <Modal isOpen={showPurgeModal} onClose={() => setShowPurgeModal(false)}>
        <ModalTitle>Purge Secret</ModalTitle>
        <ModalDescription>
          Are you sure you want to <strong>permanently delete</strong> the secret{" "}
          <span className="font-mono font-semibold text-gray-900 dark:text-gray-100">
            "{secretName}"
          </span>
          ? This action is <strong>irreversible</strong> and the secret cannot be recovered after
          purging.
        </ModalDescription>
        <ModalFooter>
          <Button
            variant="secondary"
            onClick={() => setShowPurgeModal(false)}
            disabled={purgeMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={() => purgeMutation.mutate()}
            disabled={purgeMutation.isPending}
            isLoading={purgeMutation.isPending}
            loadingText="Purging..."
          >
            Purge Permanently
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
