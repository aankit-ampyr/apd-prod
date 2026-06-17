import {Button, Modal, Text} from "@/ui-kits";

interface FileRemovalConfirmModalProps {
  open: boolean;
  fileName?: string;
  title?: string;
  confirmText?: string;
  cancelText?: string;
  onClose: () => void;
  onConfirm: () => void;
}

export function FileRemovalConfirmModal(props: FileRemovalConfirmModalProps) {
  const {
    open,
    fileName,
    title = "Confirm File Removal",
    confirmText = "Confirm",
    cancelText = "Cancel",
    onClose,
    onConfirm,
  } = props;

  return (
    <Modal open={open} onClose={onClose} maxWidth={640} className="w-auto min-w-100">
      <div className="relative mb-4">
        <Text variant="h3" className="text-error-text! font-SpaceGroteskBold!">
          {title}
        </Text>
      </div>
      <div className="flex flex-col gap-6">
        <Text variant="largeBody" className="leading-[30px]">
          Are you sure you want to remove <span className="break-all text-primary">{fileName}</span> file?
        </Text>
        <div className="flex justify-end gap-3 mt-1">
          <Button
            variant="secondary"
            onClick={onClose}
            text={cancelText}
            className="min-w-28 justify-center"
            textClassName="text-[#1B988B]!"
          />
          <Button
            onClick={onConfirm}
            text={confirmText}
            className="min-w-28 justify-center"
          />
        </div>
      </div>
    </Modal>
  );
}
