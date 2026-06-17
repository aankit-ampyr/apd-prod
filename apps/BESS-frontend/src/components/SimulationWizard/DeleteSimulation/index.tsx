import React from 'react';
import {Modal, Button, Text, Alert} from '@/ui-kits';

interface DiscardSimulationProps {
  open: boolean;
  onCancel: () => void;
  onDiscard: () => void;
}

export const DiscardSimulation: React.FC<DiscardSimulationProps> = ({open, onCancel, onDiscard}) => {
  return (
    <Modal open={open} maxWidth={600} className="flex! flex-col gap-6!">
      <Text variant="h3" className="text-error-text! font-SpaceGroteskBold!">
        Discard Setup
      </Text>
      <Text variant="18M" className="text-text-primary!">
        Are you sure you want to discard this setup?
      </Text>
      <Alert
        textClassName="text-text-secondary! text-[14px]!"
        iconClassName="mt-0!"
        message="All saved changes will be lost. "
        variant="warning"
        className="w-full! items-center! p-3! border-0.6 border-warning!"
      />
      <div className="flex justify-end gap-2 mt-4">
        <Button variant="secondary" className="" onClick={onCancel}>
          Cancel
        </Button>
        <Button variant="primary" className="" onClick={onDiscard}>
          Confirm
        </Button>
      </div>
    </Modal>
  );
};

interface DeleteSimulationProps {
  open: boolean;
  onCancel: () => void;
  onDelete: () => void;
}

export const DeleteSimulation: React.FC<DeleteSimulationProps> = ({open, onCancel, onDelete}) => {
  return (
    <Modal open={open} maxWidth={600} className="flex! flex-col gap-6!">
      <Text variant="h3" className="text-error-text! font-SpaceGroteskBold!">
        Delete Simulation
      </Text>
      <Text variant="18M" className="text-text-primary!">
        Are you sure you want to delete this simulation?
      </Text>
      <Alert
        textClassName="text-text-secondary! text-[14px]!"
        iconClassName="mt-0!"
        message="This action cannot be undone. "
        variant="warning"
        className="w-full! items-center! p-3! border-0.6 border-warning!"
      />
      <div className="flex justify-end gap-2 mt-4">
        <Button variant="secondary" className="" onClick={onCancel}>
          Cancel
        </Button>
        <Button variant="primary" className="" onClick={onDelete}>
          Confirm
        </Button>
      </div>
    </Modal>
  );
};
