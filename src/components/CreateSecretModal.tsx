import { useState } from "react";
import { Button, Modal, ModalFooter, ModalTitle } from "./common";

interface CreateSecretModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (name: string, value: string) => void;
  isCreating: boolean;
}

export function CreateSecretModal({
  isOpen,
  onClose,
  onConfirm,
  isCreating,
}: CreateSecretModalProps) {
  const [secretName, setSecretName] = useState("");
  const [secretValue, setSecretValue] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!secretName.trim() || !secretValue.trim()) {
      alert("Secret name and value are required");
      return;
    }
    onConfirm(secretName, secretValue);
  };

  const handleClose = () => {
    setSecretName("");
    setSecretValue("");
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose}>
      <ModalTitle>Create New Secret</ModalTitle>
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label
            htmlFor="secretName"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            Secret Name
          </label>
          <input
            type="text"
            id="secretName"
            value={secretName}
            onChange={(e) => setSecretName(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-green-500 dark:focus:ring-green-400 focus:border-transparent"
            placeholder="my-secret-name"
            disabled={isCreating}
            required
          />
        </div>
        <div className="mb-6">
          <label
            htmlFor="secretValue"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            Secret Value
          </label>
          <textarea
            id="secretValue"
            value={secretValue}
            onChange={(e) => setSecretValue(e.target.value)}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-green-500 dark:focus:ring-green-400 focus:border-transparent resize-none"
            placeholder="Enter secret value..."
            disabled={isCreating}
            required
          />
        </div>
        <ModalFooter>
          <Button variant="secondary" onClick={handleClose} disabled={isCreating}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="success"
            disabled={isCreating}
            isLoading={isCreating}
            loadingText="Creating..."
          >
            Create Secret
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
