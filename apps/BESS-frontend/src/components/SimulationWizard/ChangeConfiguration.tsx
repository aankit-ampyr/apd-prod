import React from 'react';
import {Modal, Button, Text} from '@/ui-kits';

interface ChangeConfigurationProps {
  open: boolean;
  onStay: () => void;
  onContinue: () => void;
}

export const ChangeConfiguration: React.FC<ChangeConfigurationProps> = ({open, onStay, onContinue}) => {
  return (
    <Modal open={open} maxWidth={600} className="flex! flex-col gap-6!">
      <Text variant="h3" className="text-secondary! font-SpaceGroteskBold!">
        Change Configuration
      </Text>

      <Text variant="caption" className="text-text-primary! font-InterRegular!">
        Changing this configuration will clear the current simulation results. You will need to run the simulation again to view updated results.
      </Text>

      <div className="flex justify-end gap-2 mt-4">
        <Button variant="secondary" className="" onClick={onStay}>
          Stay
        </Button>
        <Button variant="primary" className="" onClick={onContinue}>
          Continue
        </Button>
      </div>
    </Modal>
  );
};
