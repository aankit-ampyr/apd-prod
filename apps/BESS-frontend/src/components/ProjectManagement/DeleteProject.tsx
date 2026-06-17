import React, {useState} from 'react';
import {Modal, Button, Text, TextInput, Alert} from '@/ui-kits';

interface DeleteProjectProps {
  open: boolean;
  projectName: string;
  onCancel: () => void;
  onDelete: () => void;
}

const DeleteProject: React.FC<DeleteProjectProps> = ({open, projectName, onCancel, onDelete}) => {
  const [step, setStep] = useState(1);
  const [confirmName, setConfirmName] = useState('');
  const [inputTouched, setInputTouched] = useState(false);

  const handleContinue = () => setStep(2);
  const handleCancel = () => {
    setStep(1);
    setConfirmName('');
    setInputTouched(false);
    onCancel();
  };
  const handleDelete = () => {
    if (confirmName === projectName) {
      onDelete();
      setStep(1);
      setConfirmName('');
      setInputTouched(false);
    } else {
      setInputTouched(true);
    }
  };

  return (
    <Modal open={open} maxWidth={step === 1 ? 550 : 400} className="flex! flex-col gap-6!">
      {step === 1 ? (
        <>
          <Text variant="h3" className="text-error-text! font-SpaceGroteskBold!">
            Delete Project Permanently?
          </Text>
          <Text variant="body2" className="text-text-secondary!">
            This will permanently delete the project and all associated configurations and access mappings
          </Text>

          <Alert textClassName="text-error-text! text-[14px]!" iconClassName='mt-0!' message="This action cannot be undone. " variant="error" className="w-full! items-center! p-3! border-0.5 border-error/20" />

          <div className="flex justify-end gap-2 mt-4">
            <Button variant="secondary" className="" onClick={handleCancel}>
              Cancel
            </Button>
            <Button variant="primary" className="" onClick={handleContinue}>
              Continue
            </Button>
          </div>
        </>
      ) : (
        <>
          <Text variant="h3" className="text-error-text! font-SpaceGroteskBold!">
            Confirm Permanent Deletion
          </Text>
          <Text variant="body2" className="text-text-secondary!">
            Type the project name to confirm deletion.
          </Text>

          <TextInput
            placeholder="Enter project name"
            required
            value={confirmName}
            onChange={e => setConfirmName(e)}
            onBlur={() => setInputTouched(true)}
            touched={inputTouched}
            error={inputTouched && confirmName !== projectName ? 'Project name does not match' : ''}
          />
          <Text variant="small" className="text-text-secondary! -mt-5">
            {' '}
            Enter the exact project name to enable Delete. 
          </Text>
          <div className="flex justify-center gap-2 mt-4">
            <Button variant="secondary" className="" onClick={handleCancel}>
              Cancel
            </Button>
            <Button variant="primary" className="" onClick={handleDelete} disabled={confirmName !== projectName}>
              Delete Permanently
            </Button>
          </div>
        </>
      )}
    </Modal>
  );
};

export default DeleteProject;
