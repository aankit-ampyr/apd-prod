import React from 'react';
import {Modal, Button, Text, Alert} from '@/ui-kits';

interface ArchiveProjectProps {
  open: boolean;
  onCancel: () => void;
  onArchive: () => void;
}

const ArchiveProject: React.FC<ArchiveProjectProps> = ({open, onCancel, onArchive}) => {
  return (
    <Modal open={open} maxWidth={600} className="flex! flex-col gap-6!">
      <Text variant="h3" className="text-warning-text! font-SpaceGroteskBold!">
        Archive Project?
      </Text>
      <Text variant="body2" className="text-text-secondary!">
        Archiving will remove this project from the default project list and make it read-only.
      </Text>
      {/* <Alert
        textClassName="text-text-secondary! text-[14px]!"
        iconClassName="mt-0!"
        message="This action cannot be undone. "
        variant="warning"
        className="w-full! items-center! p-3! border-0.6 border-warning!"
      /> */}
      <div className="flex justify-end gap-2 mt-4">
        <Button variant="secondary" className="" onClick={onCancel}>
          Cancel
        </Button>
        <Button variant="primary" className="" onClick={onArchive}>
          Archive Project
        </Button>
      </div>
    </Modal>
  );
};

export default ArchiveProject;
