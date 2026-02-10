import { Button, Modal, ModalDescription, ModalFooter, ModalTitle } from "./common";

interface BulkDeleteModalProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  secretNames: string[];
  isDeleting?: boolean;
}

export function BulkDeleteModal({
  isOpen,
  onConfirm,
  onCancel,
  secretNames,
  isDeleting = false,
}: BulkDeleteModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onCancel} maxWidth="lg">
      <ModalTitle>
        Delete {secretNames.length} Secret{secretNames.length !== 1 ? "s" : ""}
      </ModalTitle>
      <ModalDescription>
        Are you sure you want to delete the following secrets? This action may not be reversible
        depending on vault settings.
      </ModalDescription>

      <div className="flex-1 overflow-auto mb-4 border border-gray-200 dark:border-gray-700 rounded-lg max-h-60">
        <ul className="divide-y divide-gray-200 dark:divide-gray-700">
          {secretNames.map((name) => (
            <li
              key={name}
              className="px-4 py-2 text-sm font-mono text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700/50"
            >
              {name}
            </li>
          ))}
        </ul>
      </div>

      <ModalFooter>
        <Button variant="secondary" onClick={onCancel} disabled={isDeleting}>
          Cancel
        </Button>
        <Button
          variant="danger"
          onClick={onConfirm}
          disabled={isDeleting}
          isLoading={isDeleting}
          loadingText={`Deleting ${secretNames.length}...`}
        >
          Delete {secretNames.length} Secret{secretNames.length !== 1 ? "s" : ""}
        </Button>
      </ModalFooter>
    </Modal>
  );
}
