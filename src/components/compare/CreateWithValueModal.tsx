import { useEffect, useState } from "react";
import { Button, Modal, ModalFooter, ModalTitle } from "../common";

interface CreateWithValueModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (value: string) => void;
  secretName: string;
  suggestedValue?: string;
  isCreating: boolean;
}

export function CreateWithValueModal({
  isOpen,
  onClose,
  onConfirm,
  secretName,
  suggestedValue,
  isCreating,
}: CreateWithValueModalProps) {
  const [value, setValue] = useState(suggestedValue || "");

  useEffect(() => {
    setValue(suggestedValue || "");
  }, [suggestedValue]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="lg">
      <ModalTitle>Create Secret: {secretName}</ModalTitle>
      <div className="space-y-4">
        <div>
          <label
            htmlFor="secret-value-input"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            Secret Value
          </label>
          <textarea
            id="secret-value-input"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 font-mono text-sm"
            rows={4}
            placeholder="Enter secret value..."
          />
        </div>
        {suggestedValue && (
          <button
            type="button"
            onClick={() => setValue(suggestedValue)}
            className="text-sm text-primary-600 dark:text-primary-400 hover:underline"
          >
            Use source value
          </button>
        )}
      </div>
      <ModalFooter>
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button
          variant="primary"
          onClick={() => onConfirm(value)}
          disabled={!value.trim() || isCreating}
          isLoading={isCreating}
          loadingText="Creating..."
        >
          Create Secret
        </Button>
      </ModalFooter>
    </Modal>
  );
}
