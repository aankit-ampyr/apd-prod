import React, {useEffect, useState} from 'react';
import {Modal, Text, Icon, TextInput, Toggle, Button} from '@/ui-kits';
import type {EditOrganizationRequest, Organization} from '@/interface';
import {useFormik} from 'formik';
import {AddOrganizationSchema, EditOrganizationSchema, createCapitalizeFormattedBlurHandler, getErrorMessage, type ErrorCodes} from '@/utils';
import {useDispatch, useSelector} from 'react-redux';
import {addOrganizationRequest, editOrganizationRequest} from '@/services/redux/slice';
import { organizationError } from '@/services/redux/selectors';

interface OrganizationEntryModal {
  variant: 'edit' | 'add';
  currentSelectOrganization: Organization | null;
  onClose: () => void;
  open: boolean;
}

type FormValues = {
  name: string;
  status: boolean;
};

const formInitialValues: FormValues = {
  name: '',
  status: false,
};

export const OrganizationEntry: React.FC<OrganizationEntryModal> = props => {
  const {variant, currentSelectOrganization, onClose, open} = props;
  const dispatch = useDispatch();

  // =====================
  // selector
  // =====================
  const failure = useSelector(organizationError) as ErrorCodes;

  // =====================
  // states
  // =====================

  const [initialValues, setInitialValues] = useState<FormValues>(formInitialValues);
  const {
    dirty,
    isValid,
    setFieldError,
    errors,
    setFieldTouched,
    values,
    handleBlur,
    handleChange,
    setFieldValue,
    handleSubmit,
    touched,
    initialValues: initialState,
  } = useFormik({
    initialValues,
    validationSchema: variant === 'add' ? AddOrganizationSchema : EditOrganizationSchema,
    onSubmit: handleOnSubmit,
    enableReinitialize: true,
    validateOnMount: true,
  });

  // =====================
  // functions
  // =====================
  function handleOnSubmit(values: FormValues) {
    if (variant === 'add') {
      // call add user api
      handleAddOrganization(values);
    }
    if (variant === 'edit') {
      handleEditOrganization(values);
    }
  }

  function handleAddOrganization(values: FormValues) {
    dispatch(addOrganizationRequest({name: values.name}));
  }
  function handleEditOrganization(values: FormValues) {
    if (!currentSelectOrganization) return;
    const payload: EditOrganizationRequest['payload'] = {
      id: currentSelectOrganization.id,
    };
    
    // added logic to only send affect payload
    if (values.name && initialState.name !== values.name) {
      payload['name'] = values.name;
    }
    if (values.status !== null && initialState.status !== values.status) {
      payload['status'] = values.status;
    }
    dispatch(editOrganizationRequest(payload));
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  function handleClose() {
    // do not close if form is dirty
    if (variant === 'add' && dirty) {
      return;
    }

    if (variant === 'edit' && isValid) {
      return;
    }
    onClose();
  }

  // effects
  useEffect(() => {
    if (variant === 'edit' && currentSelectOrganization) {
      setInitialValues({
        name: currentSelectOrganization.name,
        status: currentSelectOrganization.status,
      });
    }
  }, [variant, currentSelectOrganization]);

  // display inline message for email already exists error
  useEffect(() => {
    if (failure) {
      if (failure === 'E-10019') {
        setFieldError('name', getErrorMessage(failure));
      }
    }
  }, [failure]);

  return (
    <Modal open={open} maxWidth={400} className="">
      <div className="flex justify-between items-center">
        <Text variant="h3">{variant == 'add' ? 'Add Organization' : 'Edit Organization'}</Text>
        <Icon name="cross" className="cursor-pointer" onClick={onClose} />
      </div>

      <div className="flex flex-col gap-4 mt-4">
        <TextInput
          label="Name"
          placeholder="Enter full name"
          required
          value={values.name}
          onChange={handleChange('name')}
          onBlur={createCapitalizeFormattedBlurHandler(handleBlur('name'), setFieldValue, 'name')}
          touched={touched.name}
          preventLeadingSpace
          minLength={2}
          maxLength={150}
          preventTrailingSpace
          error={errors.name}
        />

        {variant === 'edit' && (
          <div className="flex items-center justify-between">
            <Text variant="caption">Status</Text>
            <Toggle
              size="sm"
              value={values.status}
              onBlur={handleBlur('status')}
              onToggle={val => {
                setFieldTouched('status', true, false);
                setFieldValue('status', val);
              }}
              labelClassName="min-w-14 text-center"
              label={values.status ? 'Active' : 'Inactive'}
            />
          </div>
        )}

        {variant === 'edit' && values.status === false && touched.status && initialState.status !== values.status && (
          <div className="flex gap-2 bg-warning/5 border border-warning rounded-sm px-3 py-2">
            <Icon name="warning-triangle" className="text-warning size-4 mt-0.5" />
            <Text variant="small" className="text-text-secondary!">
              This will prevent new users from being assigned to this organization. This organization currently has some
              active users. Existing users will retain their access.
            </Text>
          </div>
        )}

        {variant === 'edit' && values.status === true && touched.status && initialState.status !== values.status && (
          <div className="flex gap-2 bg-success/5 border border-success rounded-sm px-3 py-2">
            <Icon name="circle-info" className="text-success size-4 mt-0.5" />
            <Text variant="small" className="text-text-secondary!">
              This will allow users and assets to be assigned to this organization again.
            </Text>
          </div>
        )}

        <Button
          onClick={() => handleSubmit()}
          className="w-full justify-center"
          disabled={variant === 'add' ? !isValid || !dirty : !isValid}
          size="lg">
          {variant === 'add' ? 'Save' : 'Save Changes'}
        </Button>
      </div>
    </Modal>
  );
};
