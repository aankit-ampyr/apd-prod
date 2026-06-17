import {UserRole} from '@/constants';
import type {User} from '@/interface';
import {Modal, Button, Text, Icon, SelectInput} from '@/ui-kits';
import React from 'react';
import {useDispatch} from 'react-redux';
import {useDropdownValues} from '@/hooks';
import {capitalize, AssignOrganizationSchema} from '@/utils';
import {assignOrganizationRequest, getAllOrganizationsListRequest} from '@/services/redux/slice';
import { allOrganizationsList } from '@/services/redux/selectors';
import {useFormik} from 'formik';

interface AssignOrganizationModalProps {
  currentSelectUser: User;
  onClose: () => void;
  open: boolean;
}
type FormType = {
  organization: number | null;
};
const initialValues: FormType = {
  organization: null,
};

export const AssignOrgaznizationModal: React.FC<AssignOrganizationModalProps> = props => {
  const {onClose, open, currentSelectUser} = props;

  // hooks
  const dispatch = useDispatch();
  const allOrgs = useDropdownValues({
    fetchAction: getAllOrganizationsListRequest,
    selector: allOrganizationsList,
  });

  // states
  const {dirty, isValid, errors, values, handleBlur, setFieldValue, handleSubmit, touched} = useFormik({
    initialValues,
    validationSchema: AssignOrganizationSchema,
    onSubmit: handleAssign,
    enableReinitialize: true,
    validateOnMount: true,
  });

  const filteredOrgs = allOrgs.filter(item => item.id !== currentSelectUser?.organization?.id);

  const isReassign = Boolean(currentSelectUser?.organization);

  function handleAssign(values: FormType) {
    if (!values.organization) return;
    dispatch(assignOrganizationRequest({id: currentSelectUser.id, organization_id: values.organization}));
  }

  return (
    <Modal open={open} maxWidth={400} className="flex! flex-col gap-6!">
      <div className="flex justify-between items-center">
        <Text variant="h3">{isReassign ? 'Reassign Organization' : 'Assign Organization'}</Text>
        <Icon name="cross" className="cursor-pointer" onClick={onClose} />
      </div>

      <div className="bg-primary-tint-2 flex flex-col gap-2 p-4 border border-l-4 border-primary rounded-sm">
        <span className="flex gap-2 items-center">
          <Text variant="body2" className="text-text-secondary!">
            User Name:
          </Text>
          <Text variant="body2" className="">
            {capitalize(currentSelectUser.name)}
          </Text>
        </span>

        <span className="flex gap-2 items-center">
          <Text variant="body2" className="text-text-secondary!">
            Role:
          </Text>
          <Text variant="body2" className="">
            {capitalize(UserRole[currentSelectUser.role])}
          </Text>
        </span>

        {currentSelectUser.organization && (
          <span className="flex gap-2 items-center">
            <Text variant="body2" className="text-text-secondary!">
              From Organization:
            </Text>
            <Text variant="body2" className="">
              {capitalize(currentSelectUser.organization.name)}
            </Text>
          </span>
        )}
      </div>

      <SelectInput
        label="Organization"
        required
        placeholder="Select Organization"
        options={filteredOrgs}
        onChange={item => setFieldValue('organization', Number(item.id))}
        onBlur={handleBlur('organization')}
        value={values.organization}
        touched={touched.organization}
        error={errors.organization}
      />

      <Button
        disabled={!dirty || !isValid}
        className="w-full justify-center"
        onClick={() => handleSubmit()}
        variant="primary">
        {isReassign ? 'Save' : 'Save Changes'}
      </Button>
    </Modal>
  );
};
