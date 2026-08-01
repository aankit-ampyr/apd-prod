import type {Asset} from '@/interface';
import {Modal, Button, Text, SearchableSelectInput} from '@/ui-kits';
import React, {useEffect} from 'react';
import {useDispatch, useSelector} from 'react-redux';
import {useDropdownValues} from '@/hooks';
import {ErrorCodes, getErrorMessage} from '@/utils';
import {reassignAssetOwnershipRequest, getAllOrganizationsListRequest} from '@/services/redux/slice';
import {allOrganizationsList, assetError, assetErrorMessageVars} from '@/services/redux/selectors';
import {useFormik} from 'formik';
import * as Yup from 'yup';

interface ReassignAssetOwnershipProps {
  asset: Asset;
  onClose: () => void;
  open: boolean;
}

type FormType = {
  organization: number | null;
};

const initialValues: FormType = {
  organization: null,
};

const ReassignSchema = Yup.object().shape({
  organization: Yup.number().required(getErrorMessage('E-10005')).nullable(),
});

export const ReassignAssetOwnership: React.FC<ReassignAssetOwnershipProps> = props => {
  const {onClose, open, asset} = props;

  /**
   * =====================
   * Hooks
   * =====================
   */
  const dispatch = useDispatch();
  const allOrgs = useDropdownValues({
    fetchAction: getAllOrganizationsListRequest,
    selector: allOrganizationsList,
  });

  const {dirty, isValid, errors, values, handleBlur, setFieldValue, handleSubmit, touched, setFieldError} = useFormik({
    initialValues,
    validationSchema: ReassignSchema,
    onSubmit: handleReassign,
    enableReinitialize: true,
    validateOnMount: true,
  });

  /**
   * =====================
   * Selectors
   * =====================
   */
  const failureMessageVars = useSelector(assetErrorMessageVars);
  const failure = useSelector(assetError) as ErrorCodes;

  /**
   * =====================
   * Derived State
   * =====================
   */
  const filteredOrgs = allOrgs.filter(item => item.id !== asset?.organization?.id);

  /**
   * =====================
   * Functions
   * =====================
   */
  function handleReassign(values: FormType) {
    if (!values.organization) return;
    dispatch(
      reassignAssetOwnershipRequest({
        asset_id: asset.id,
        organization_id: values.organization,
      }),
    );
  }

  /**
   * =====================
   * Side Effects
   * =====================
   */
  useEffect(() => {
    if (failure) {
      if (failure === 'E-10239') {
        setFieldError('organization', getErrorMessage(failure, failureMessageVars));
      }
    }
  }, [failure]);

  return (
    <Modal open={open} maxWidth={500} className="flex! flex-col gap-6!">
      <Text variant="h3">Reassign Asset Ownership?</Text>

      <div className="bg-primary-tint-2 flex flex-col gap-2 p-4  border-primary rounded-sm">
        <span className="flex gap-2 items-center">
          <Text variant="body2" className="text-primary!">
            {asset.name}
          </Text>
        </span>

        <span className="flex gap-2 items-center">
          <Text variant="body2" className="text-text-secondary!">
            Current Organization:
          </Text>
          <Text variant="body2" className="">
            {asset.organization?.name || 'Not Assigned'}
          </Text>
        </span>
      </div>

      <SearchableSelectInput
        invalidSearchError={getErrorMessage('E-10109')}
        label="New Organization"
        required
        placeholder="Select Organization"
        options={filteredOrgs}
        onChange={item => setFieldValue('organization', Number(item.id))}
        onBlur={handleBlur('organization')}
        value={values.organization}
        touched={touched.organization}
        error={errors.organization}
      />

      <div className="flex gap-3">
        <Button variant="secondary" className="flex-1 justify-center" onClick={onClose}>
          Cancel
        </Button>
        <Button
          disabled={!dirty || !isValid}
          className="flex-1 justify-center"
          onClick={() => handleSubmit()}
          variant="primary">
          Reassign
        </Button>
      </div>
    </Modal>
  );
};
