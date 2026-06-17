import React from 'react';
import {Modal, Button, Text, Alert} from '@/ui-kits';

interface StopSimulationProps {
  open: boolean;
  onCancel: () => void;
  onStop: () => void;
  title?: string;
  subTitle?: string;
  warningMessage?: string;
  infoMessage?: string;
}

export const StopSimulation: React.FC<StopSimulationProps> = ({
  open,
  onCancel,
  onStop,
  title = 'Stop Simulation',
  subTitle = 'Are you sure you want to stop the simulation?',
  warningMessage = 'Stopping the simulation will halt further processing.',
  infoMessage = 'Existing configuration remain available, and you can run simulation again anytime.',
}) => {
  return (
    <Modal open={open} maxWidth={700} className="flex! flex-col gap-6!">
      <Text variant="h3" className="text-error-text! font-SpaceGroteskBold!">
        {title}
      </Text>
      <Text variant="18M" className="text-text-primary!">
        {subTitle}
      </Text>
      <Alert
        textClassName="text-text-secondary! text-[14px]!"
        iconClassName="mt-0.5!"
        message={
          <div className="flex flex-col gap-1">
            <span>{warningMessage}</span>
            <span>{infoMessage}</span>
          </div>
        }
        variant="warning"
        className="w-full! items-start! p-3! border-0.6 border-warning!"
      />
      <div className="flex justify-end gap-2 mt-4">
        <Button variant="secondary" className="" onClick={onCancel}>
          Cancel
        </Button>
        <Button variant="primary" className="" onClick={onStop}>
          Confirm
        </Button>
      </div>
    </Modal>
  );
};
