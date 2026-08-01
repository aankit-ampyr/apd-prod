import React from 'react';
import {Modal, Button, Text, Icon} from '@/ui-kits';

interface ConfigurationOutOfSyncProps {
  open: boolean;
  onClose: () => void;
  onAction: () => void;
  actionText?: string;
  recommendationText?: string;
}

export const ConfigurationOutOfSync: React.FC<ConfigurationOutOfSyncProps> = ({
  open,
  onClose,
  onAction,
  actionText = 'Green Energy Analysis',
  recommendationText = 'Rerun the simulation, then open Green Energy Analysis to view the updated results.',
}) => {
  return (
    <Modal
      open={open}
      onClose={onClose}
      closeOnBackdropClick={false}
      maxWidth={620}
      className="relative flex! flex-col items-center rounded-3xl! px-6! py-6! sm:px-10!">
      <button type="button" aria-label="Close" onClick={onClose} className="absolute right-5 top-5 cursor-pointer text-text-primary">
        <Icon name="cross" size={18} />
      </button>

      <div className="mb-3 flex h-22 w-22 items-center justify-center rounded-full bg-[#FDEDED]">
        <Icon name="warning-2" size={54} className="text-[#D64545]!" />
      </div>

      <Text variant="h3" className="mb-2 text-center text-[#CD2020]! font-InterSemiBold!">
        Configuration out of Sync
      </Text>

      <Text variant="14R" className="mb-6 max-w-130 text-center leading-5! text-text-secondary!">
        Another user has modified the project configuration. The current simulation results are based on an outdated configuration and cannot be used for
        further analysis.
      </Text>

      <div className="w-full rounded-xl border border-[#70C9C2] border-l-4! border-l-[#2CA39A]! bg-[#F1FBFA] px-5 py-3.5 sm:px-10">
        <Text variant="16M" className="mb-2 text-center text-text-primary! font-InterSemiBold!">
          Recommended Action
        </Text>

        <Text variant="12R" className="mb-4 text-center leading-5! text-text-primary!">
          {recommendationText}
        </Text>

        <div className="flex justify-center gap-3">
          {/* <Button variant="secondary" size="sm" onClick={() => window.location.reload()} text="Refresh" className="rounded-sm! px-5!" /> */}
          <Button variant="primary" size="sm" onClick={onAction} text={actionText} rightIcon="arrow-right" className="rounded-sm! px-5!" />
        </div>
      </div>
    </Modal>
  );
};
