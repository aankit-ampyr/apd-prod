import {PLATFORM_LABELS, UserRole} from '@/constants';
import type {User} from '@/interface';
import {CustomModal as Modal, Button, Text, Icon} from '@/ui-kits';
import React from 'react';
import {useDispatch} from 'react-redux';
import {deleteUserRequest} from '@/services/redux/slice';

interface DeleteUserModalProps {
  onClose: () => void;
  open: boolean;
  currentSelectUser: User;
}
export const DeleteUserModal: React.FC<DeleteUserModalProps> = props => {
  const {onClose, open, currentSelectUser} = props;

  const dispatch = useDispatch();

  const handleDelete = () => {
    dispatch(deleteUserRequest({id: currentSelectUser.id}));
  }

  return (
    <Modal open={open} onClose={onClose} maxWidth={600} className="flex flex-col gap-4">
      <Text variant="h3" className="text-error-text!">
        Delete User?
      </Text>

      <div className="bg-primary-tint-2 flex flex-col gap-6 p-4 border border-l-4 border-primary rounded-sm">
        <div className="grid grid-cols-2">
          {currentSelectUser.platform && (
            <span className="flex gap-2 items-center">
              <Text variant='body2' className="text-text-secondary!">Platform:</Text>
              <Text variant='body2' className="">{currentSelectUser.platform.map(item => PLATFORM_LABELS[item]).join(' & ')}</Text>
            </span>
          )}
          <span className="flex gap-2 items-center">
            <Text variant='body2' className="text-text-secondary!">User Role:</Text>
            <Text variant='body2' className="">{UserRole[currentSelectUser.role]}</Text>
          </span>

        </div>

        <div className="flex gap-1 border border-error/20 px-3 py-2 bg-[#FFF6F3] rounded-sm">
          <Icon name="warning-triangle" className="text-error-text" />
          <Text variant="caption" className="text-error-text!">
            This will remove the user’s access to the platform and mark the account as Deleted.
          </Text>
        </div>
      </div>

      <Text className="text-text-secondary!">
        All permissions associated with this role will be revoked. The user will no longer be able to log in.
      </Text>

      <Text variant="body2" className="text-secondary!">
        Are you sure you want to proceed?
      </Text>

      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={handleDelete} variant="primary">Confirm</Button>
      </div>
    </Modal>
  );
};