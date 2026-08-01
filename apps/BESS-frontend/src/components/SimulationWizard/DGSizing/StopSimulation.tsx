import React from 'react';
import {Modal, Button, Text, Alert, Icon} from '@/ui-kits';
import {Images} from '@lazarus/react-common';
interface StopSimulationProps {
  open: boolean;
  onCancel: () => void;
  onStop: () => void;
  title?: string;
  subTitle?: string;
  warningMessage?: string;
  infoMessage?: string;
  status?: 'confirm' | 'stopping' | 'stopped';
  onCloseSuccess?: () => void;
}

export const StopSimulation: React.FC<StopSimulationProps> = ({
  open,
  onCancel,
  onStop,
  title = 'Stop Simulation',
  subTitle = 'Are you sure you want to stop the simulation?',
  warningMessage = 'Stopping the simulation will halt further processing.',
  infoMessage = 'Existing configuration remain available, and you can run simulation again anytime.',
  status = 'confirm',
  onCloseSuccess,
}) => {
  if (status === 'stopping') {
    return (
      <Modal open={open} maxWidth={700}>
        <div className="flex flex-col items-center justify-center py-1 px-8">
          <img src={Images.loading2} alt="Loading" style={{width: 58, height: 58}} />

          <Text variant="14SB" className="mt-6 text-[22px]! text-secondary!">
            Stopping Simulation...
          </Text>

          <Text variant="18R" className="mt-4 text-center text-text-primary! leading-8">
            Please wait while the simulation halts safely. You'll be able to start a new simulation once the process is complete.
          </Text>
        </div>
      </Modal>
    );
  }

  if (status === 'stopped') {
    return (
      <Modal open={open} maxWidth={700}>
        <div className="flex flex-col items-center justify-center px-8 relative">
          <img src={Images.verified} alt="Verified" style={{width: 58, height: 58}} />

          <Text variant="14SB" className="mt-6 text-[22px]! font-InterSemiBold! text-success!">
            Simulation Stopped
          </Text>

          <Text variant="18R" className="mt-4 text-center text-text-primary! leading-8">
            The simulation has been stopped successfully.
            <br />
            You can now start a new simulation.
          </Text>

          <div className="flex justify-center gap-2 mt-4">
            <Button variant="primary" className="px-12" onClick={onCloseSuccess}>
              Ok
            </Button>
          </div>
        </div>
      </Modal>
    );
  }

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
