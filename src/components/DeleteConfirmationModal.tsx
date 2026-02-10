import { Button, Modal, ModalDescription, ModalFooter, ModalTitle } from "./common";

interface DeleteConfirmationModalProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  itemName: string;
  itemType?: string;
  isDeleting?: boolean;
  recoveryMessage?: string;
}

export function DeleteConfirmationModal({
  isOpen,
  onConfirm,
  onCancel,
  itemName,
  itemType = "item",
  isDeleting = false,
  recoveryMessage,
}: DeleteConfirmationModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onCancel}>
      <ModalTitle>Delete {itemType}</ModalTitle>
      <ModalDescription>
        Are you sure you want to delete the {itemType}{" "}
        <span className="font-mono font-semibold text-gray-900 dark:text-gray-100">
          "{itemName}"
        </span>
        ?{recoveryMessage && ` ${recoveryMessage}`}
      </ModalDescription>
      <ModalFooter>
        <Button variant="secondary" onClick={onCancel} disabled={isDeleting}>
          Cancel
        </Button>
        <Button
          variant="danger"
          onClick={onConfirm}
          disabled={isDeleting}
          isLoading={isDeleting}
          loadingText="Deleting..."
        >
          Delete
        </Button>
      </ModalFooter>
    </Modal>
  );
}
