import { Modal, Text, Button } from "@/ui-kits";
interface UnsavedChangesModalProps {
  open: boolean;
  onClose: () => void;
  onDiscard: () => void;
}
export function UnsavedChangesModal(props: UnsavedChangesModalProps) {
  const {open, onClose, onDiscard} = props;
  return (
    <Modal maxWidth={625} open={open} className="flex flex-col gap-3">
      <Text variant="h3">Unsaved Changes</Text>
      <Text variant="18M">You have unsaved changes. Do you want to discard them and continue?</Text>

      <div className="flex gap-4 mt-4 justify-end">
        <Button variant="secondary" className="px-8" onClick={onClose} text="Stay" />
        <Button variant="primary" className="px-8" onClick={onDiscard} text="Discard & Continue" />
      </div>
    </Modal>
  );
}

