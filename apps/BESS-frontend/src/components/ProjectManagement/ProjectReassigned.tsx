import React, {useState} from 'react';
import {Modal, Text, Icon, SelectInput, Button} from '@/ui-kits';

interface Props {
  open: boolean;
  onClose: () => void;
  projectName: string;
  currentOwner: string;
  users: {id: number; name: string}[];
  onReassign: (userId: number) => void;
}

export const ProjectReassignedModal: React.FC<Props> = ({open, onClose, projectName, currentOwner, users, onReassign}) => {
  const [selectedUser, setSelectedUser] = useState<number | null>(null);

  return (
    <Modal open={open} maxWidth={500} onClose={onClose}>
      <div className="flex justify-between items-start">
        <div>
          <Text variant="h3">Reassign Project</Text>
          <Text variant="caption" className="text-text-secondary mt-1">
            You are about to transfer responsibility for this project to another user.
          </Text>
        </div>
      </div>

      <div className="flex flex-col gap-5 mt-5">
        <div
          className="rounded-lg p-4 bg-primary-tint-2"
          style={{
            borderWidth: '0.6px 0.6px 0.6px 4px',
            borderStyle: 'solid',
            borderColor: '#2F9C8F',
          }}
          >
          <Text className="text-primary! font-bold">{projectName}</Text>

          <Text variant="caption" className="text-text-secondary! mt-1">
            Current Responsible User : <span className="font-medium text-text-primary!">{currentOwner}</span>
          </Text>
        </div>

        <SelectInput
          label="New Responsible User"
          placeholder="Select a user"
          value={selectedUser}
          onChange={item => setSelectedUser(Number(item.id))}
          options={users.map(user => ({
            id: user.id,
            label: user.name,
          }))}
          className='text-text-primary!'
        />

        {/* Actions */}
        <div className="flex justify-end gap-3 mt-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>

          <Button onClick={() => selectedUser && onReassign(selectedUser)} disabled={!selectedUser}>
            Reassign
          </Button>
        </div>
      </div>
    </Modal>
  );
};
