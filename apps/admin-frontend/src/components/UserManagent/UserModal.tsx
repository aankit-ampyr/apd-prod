import React, {useEffect, useState} from 'react';
import {Button, Icon, CustomModal as Modal, SelectInput, MultiSelectInput, Text, TextInput, Toggle} from '@/ui-kits';
import type {EditUserRequest, User} from '@/interface';
import {useFormik} from 'formik';
import {AMD_USER_ROLES, BESS_USER_ROLES, Platform, UserRole} from '@/constants';
import {useDispatch, useSelector} from 'react-redux';
import {addUserRequest, editUserRequest} from '@/services/redux/slice';
import {
  enumToSelectOptions,
  createCapitalizeFormattedBlurHandler,
  getErrorMessage,
  type ErrorCodes,
  AddUserSchema,
  EditUserSchema,
} from '@/utils';
import {userFailure} from '@/services/redux/selectors';

interface UserEntryModal {
  variant: 'edit' | 'add';
  currentSelectUser: User | null;
  onClose: () => void;
  open: boolean;
}

const PLATFORM_OPTIONS = enumToSelectOptions(Platform);

type FormValues = {
  email: string;
  name: string;
  role: UserRole | null;
  platform: number[];
  status: boolean;
};

const formInitialValues: FormValues = {
  email: '',
  name: '',
  role: null,
  platform: [],
  status: true,
};
export const UserEntryModal: React.FC<UserEntryModal> = props => {
  const {variant, currentSelectUser, onClose, open} = props;
  const dispatch = useDispatch();

  // =====================
  // selector
  // =====================
  const failure = useSelector(userFailure) as ErrorCodes;

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
  } = useFormik({
    initialValues,
    validationSchema: variant === 'add' ? AddUserSchema : EditUserSchema,
    onSubmit: handleOnSubmit,
    enableReinitialize: true,
    validateOnMount: true,
  });

  const RoleToShow = () => {
    if (values.platform.length === 1) {
      const [platform] = values.platform;
      return platform === Platform.APD ? AMD_USER_ROLES : BESS_USER_ROLES;
    }

    // when both platform are selected show common roles for both platform.
    return AMD_USER_ROLES;
  };

  // =====================
  // functions
  // =====================
  function handleOnSubmit(values: FormValues) {
    if (variant === 'add') {
      // call add user api
      handleAddUser(values);
    }
    if (variant === 'edit') {
      handleEditUser(values);
    }
  }

  function handleEditUser(values: FormValues) {
    if (!currentSelectUser) {
      return;
    }
    const payload: EditUserRequest['payload'] = {
      id: currentSelectUser?.id as number,
      email: values.email,
      name: values.name,
      status: values.status,
    };
    if (values.platform) {
      payload['platform'] = values.platform;
    }
    if (values.role) {
      payload['role'] = values.role;
    }
    dispatch(editUserRequest(payload));
  }

  function handleAddUser(values: FormValues) {
    if (!values.platform) {
      return;
    }
    if (!values.role) {
      return;
    }

    dispatch(
      addUserRequest({
        email: values.email,
        name: values.name,
        platform: values.platform,
        role: values.role,
        status: values.status,
      }),
    );
  }

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
    if (variant === 'edit' && currentSelectUser) {
      setInitialValues({
        email: currentSelectUser.email,
        name: currentSelectUser.name,
        role: currentSelectUser.role,
        platform: currentSelectUser.platform ?? [],
        status: currentSelectUser.status,
      });
    }
  }, [variant, currentSelectUser]);

  // display inline message for email already exists error
  useEffect(() => {
    if (failure) {
      if (failure === 'E-10009') {
        setFieldError('email', getErrorMessage(failure));
      }
    }
  }, [failure]);

  useEffect(() => {
    if (values.role === UserRole.Viewer && values.platform.includes(Platform.APD)){
      setFieldValue('role', null)
    }
  }, [setFieldValue, values])
  return (
    <Modal open={open} maxWidth={400} className="" onClose={handleClose}>
      <div className="flex justify-between items-center">
        <Text variant="h3">{variant == 'add' ? 'Add User' : 'Edit User'}</Text>
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
          maxLength={100}
          preventTrailingSpace
          error={errors.name}
        />
        <TextInput
          label="Email"
          placeholder="Enter email address"
          required
          value={values.email}
          onChange={handleChange('email')}
          onBlur={handleBlur('email')}
          preventLeadingSpace
          preventTrailingSpace
          maxLength={100}
          touched={touched.email}
          error={errors.email}
        />
        <MultiSelectInput
          label="Platform"
          placeholder="Select platform"
          required
          values={values.platform}
          onChange={item =>
            setFieldValue(
              'platform',
              item.map(item => item.id),
            )
          }
          onBlur={handleBlur('platform')}
          touched={touched.platform}
          error={errors.platform as string}
          options={PLATFORM_OPTIONS}
          selectedValueDisplay={items => items.map(item => item.label).join(' & ')}
        />
        <SelectInput
          label="Role"
          placeholder="Select role"
          required
          disabled={!values.platform?.length}
          value={values.role}
          onChange={item => setFieldValue('role', item.id)}
          onBlur={handleBlur('role')}
          touched={touched.role}
          error={errors.role}
          options={RoleToShow()}
        />

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

        {variant === 'edit' && values.status === false && touched.status && (
          <div className="flex gap-2 bg-warning/5 border border-warning rounded-sm px-3 py-2">
            <Icon name="warning-triangle" className="text-warning size-4 mt-0.5" />
            <Text variant="small" className="text-text-secondary!">
              Disabling user will immediately block the user from logging in.
            </Text>
          </div>
        )}

        <Button
          onClick={() => handleSubmit()}
          className="w-full justify-center"
          disabled={variant === 'add' ? !isValid || !dirty : !isValid}
          size="lg">
          {variant === 'add' ? 'Save & Send Invite' : 'Save Changes'}
        </Button>
      </div>
    </Modal>
  );
};
