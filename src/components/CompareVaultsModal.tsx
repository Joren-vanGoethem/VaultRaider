import { useNavigate } from "@tanstack/react-router";
import { GitCompareIcon } from "lucide-react";
import { Button, Modal, ModalFooter, ModalTitle } from "./common";

interface CompareVaultsModalProps {
  isOpen: boolean;
  onClose: () => void;
  sourceVaultUri: string;
  sourceName: string;
  sourceSubscriptionId?: string;
}

export function CompareVaultsModal({
  isOpen,
  onClose,
  sourceVaultUri,
  sourceName,
  sourceSubscriptionId,
}: CompareVaultsModalProps) {
  const navigate = useNavigate();

  const handleCompare = () => {
    onClose();
    navigate({
      to: "/compare",
      search: {
        sourceVaultUri,
        sourceName,
        sourceSubscriptionId,
      },
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="2xl">
      <ModalTitle>Compare with Another Vault</ModalTitle>
      <div className="text-center py-8">
        <GitCompareIcon className="w-12 h-12 mx-auto text-primary-500 dark:text-primary-400 mb-4" />
        <p className="text-gray-900 dark:text-gray-100 font-medium mb-2">
          Compare secrets between vaults
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 max-w-md mx-auto">
          Select a target vault to compare secrets, identify missing keys, and sync configurations
          between <strong>{sourceName}</strong> and another vault.
        </p>
      </div>
      <ModalFooter>
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button variant="primary" onClick={handleCompare}>
          Start Compare
        </Button>
      </ModalFooter>
    </Modal>
  );
}
