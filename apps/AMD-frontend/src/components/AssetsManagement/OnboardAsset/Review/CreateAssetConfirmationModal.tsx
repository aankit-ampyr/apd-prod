import { AssetStatus } from "@/constants";
import { useRole } from "@/hooks";
import { Button, Modal, Text } from "@/ui-kits";

interface CreateAssetConfirmationModalProps {
  open: boolean;
  loading?: boolean;
  onClose: () => void;
  onConfirm: () => void;
  assetStatus?: AssetStatus;
}

export function CreateAssetConfirmationModal(props: CreateAssetConfirmationModalProps) {
  const {open, loading = false, onClose, onConfirm, assetStatus} = props;
  const {isAMDAdmin} = useRole();

  if (!isAMDAdmin) {
    return (
      <Modal open={open} onClose={onClose} maxWidth={625} className="flex flex-col gap-3">
        <Text variant="free" className="font-InterSemiBold text-2xl text-text-primary">
          Submit Asset for Approval
        </Text>
        <Text variant="free" className="font-InterRegular text-body-1 text-text-secondary! leading-7">
          Once submitted, this asset <span className="text-text-primary font-InterMedium!">cannot be changed</span>{' '}
          until the admin completes their review. Please make sure everything is correct before continuing.
        </Text>
        <div className="flex gap-4 mt-4 justify-end">
          <Button
            variant="secondary"
            className="px-8"
            onClick={onClose}
            text="Cancel"
            disabled={loading}
            textClassName="text-[#1B988B]!"
          />
          <Button variant="primary" className="px-8" onClick={onConfirm} text="Confirm & Submit" loading={loading} />
        </div>
      </Modal>
    );
  }
  // for AMD admin, if asset is pending approval, show different message and button text
  if (isAMDAdmin && assetStatus === AssetStatus.PendingApproval) {
    return (
      <Modal open={open} onClose={onClose} maxWidth={625} className="flex flex-col gap-3">
        <Text variant="free" className="font-InterSemiBold text-2xl text-text-primary">
          Approve & create asset?
        </Text>
        <Text variant="free" className="font-InterRegular text-body-1 text-text-secondary! leading-7">
          Once approved, this asset will become Active and will be available for monthly uploads and analysis.
        </Text>
        <div className="flex gap-4 mt-4 justify-end">
          <Button
            variant="secondary"
            className="px-8"
            onClick={onClose}
            text="Cancel"
            disabled={loading}
            textClassName="text-[#1B988B]!"
          />
          <Button
            variant="primary"
            className="px-8"
            onClick={onConfirm}
            text="Approve & Create Asset"
            loading={loading}
          />
        </div>
      </Modal>
    );
  }

  return (
    <Modal open={open} onClose={onClose} maxWidth={625} className="flex flex-col gap-3">
      <Text variant="h3">Confirm Asset Creation</Text>
      <Text variant="18M">Are you sure you want to create this asset?</Text>
      <Text variant="14R" className="text-text-secondary!">
        Please ensure all details are correct.
      </Text>

      <div className="flex gap-4 mt-4 justify-end">
        <Button
          variant="secondary"
          className="px-8"
          onClick={onClose}
          text="Cancel"
          disabled={loading}
          textClassName="text-[#1B988B]!"
        />
        <Button variant="primary" className="px-8" onClick={onConfirm} text="Confirm" loading={loading} />
      </div>
    </Modal>
  );
}

