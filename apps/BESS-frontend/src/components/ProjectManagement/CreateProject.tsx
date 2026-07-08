import {useFormik} from 'formik';

import {CustomModal, Text, Icon, TextInput, SelectInput, MultiSelectInput, Toggle, Button, TextArea, Alert} from '@/ui-kits';
import {useDropdownValues} from '@/hooks';
import {createProjectRequest, getAllUsersListRequest, updateProjectRequest} from '@/services/redux/slice';
import {
  authDataSelector,
  getAnalystUsers,
  getManagementUsers,
  getResponsibleUsers,
  getViewerUsers,
} from '@/services/redux/selectors';
import {createCapitalizeFormattedBlurHandler, createProjectValidationSchema} from '@/utils';
import {Platform, UserRole} from '@/constants/enums';
import {useDispatch, useSelector} from 'react-redux';
import {useEffect, useState} from 'react';
import { RootState } from '@/services/redux/rootReducer';

// ----------------------
// Types
// ----------------------
type FormValues = {
  name: string;
  description: string;
  adminUsers: number[];
  analystUsers: number[];
  viewerUsers: number[];
  managementUsers: number[];
  responsibleUser: number | null;
  status: boolean;
};

type CreateProjectVariant = 'add' | 'edit';

interface CreateProjectProps {
  open: boolean;
  onClose: () => void;
  editData?: any;
  variant?: CreateProjectVariant;
}

const formInitialValues: FormValues = {
  name: '',
  description: '',
  adminUsers: [],
  analystUsers: [],
  viewerUsers: [],
  managementUsers: [],
  responsibleUser: null,
  status: true,
};

function CreateProject({open, onClose, editData, variant: propVariant}: Readonly<CreateProjectProps>) {
  const dispatch = useDispatch();
  const variant: CreateProjectVariant = propVariant || (editData ? 'edit' : 'add');
  const authData = useSelector(authDataSelector);
  // Analyst is responsible but not creator
  const isResponsibleAnalystNotCreator =
    variant === 'edit' && authData?.role === UserRole.Analyst && editData?.owned_by?.id === authData?.id && editData?.created_by?.id !== authData?.id;

  const [initialValues, setInitialValues] = useState<FormValues>(formInitialValues);
  const [hasPendingResponsibleUserChange, setHasPendingResponsibleUserChange] = useState(false);

  const authUser = useSelector(authDataSelector);

  const {
    values,
    errors,
    touched,
    setFieldTouched,
    handleBlur,
    setFieldValue,
    submitForm,
    isValid,
    dirty,
    // initialValues: initialState,
  } = useFormik<FormValues>({
    initialValues,
    validationSchema: createProjectValidationSchema,
    enableReinitialize: true,
    onSubmit: handleOnSubmit,
  });

  useEffect(() => {
    if (editData) {
      const nextInitialValues = {
        name: editData.name || '',
        description: editData.description || '',
        responsibleUser: editData?.owned_by?.id || null,
        adminUsers: editData?.assigned_users ? editData.assigned_users.filter((u: any) => u.role === UserRole.Admin).map((u: any) => u.id) : [],
        analystUsers: editData?.assigned_users ? editData.assigned_users.filter((u: any) => u.role === UserRole.Analyst).map((u: any) => u.id) : [],
        viewerUsers: editData?.assigned_users ? editData.assigned_users.filter((u: any) => u.role === UserRole.Viewer).map((u: any) => u.id) : [],
        managementUsers: editData?.assigned_users ? editData.assigned_users.filter((u: any) => u.role === UserRole.Management).map((u: any) => u.id) : [],
        status: editData.status === 1,
      };
      setHasPendingResponsibleUserChange(false);
      setInitialValues(nextInitialValues);
    } else {
      // CREATE MODE DEFAULT
      const nextResponsibleUser = authUser?.id || null;
      setHasPendingResponsibleUserChange(false);
      setInitialValues(prev => ({
        ...prev,
        responsibleUser: nextResponsibleUser,
      }));
    }
  }, [editData, authUser]);

  function handleResponsibleUserChange(item: {id: number | string}) {
    const nextResponsibleUser = Number(item.id);
    setHasPendingResponsibleUserChange(true);
    setFieldTouched('responsibleUser', true, false);
    void setFieldValue('responsibleUser', nextResponsibleUser, true);
  }

  function handleOnSubmit(values: FormValues) {
    const assignedUsers = [...values.adminUsers, ...values.analystUsers, ...values.viewerUsers, ...values.managementUsers];
    const uniqueUsers = Array.from(new Set(assignedUsers));
    const responsibleUserId = values.responsibleUser;
    const originalAssignedUsers = editData
      ? [
          ...(editData?.assigned_users ? editData.assigned_users.filter((u: any) => u.role === UserRole.Admin).map((u: any) => u.id) : []),
          ...(editData?.assigned_users ? editData.assigned_users.filter((u: any) => u.role === UserRole.Analyst).map((u: any) => u.id) : []),
          ...(editData?.assigned_users ? editData.assigned_users.filter((u: any) => u.role === UserRole.Viewer).map((u: any) => u.id) : []),
          ...(editData?.assigned_users ? editData.assigned_users.filter((u: any) => u.role === UserRole.Management).map((u: any) => u.id) : []),
        ]
      : [];

    const payload = editData
      ? {
          name: editData.name || '',
          description: editData.description || '',
          responsible_user_id: responsibleUserId,
          status: editData.status === 1,
          assigned_users: Array.from(new Set(originalAssignedUsers)),
        }
      : {
          name: values.name,
          description: values.description,
          responsible_user_id: responsibleUserId,
          status: values.status,
          assigned_users: uniqueUsers,
        };

    if (editData) {
      const normalizedOriginalAssignedUsers = Array.from(new Set(originalAssignedUsers)).sort((a, b) => a - b);
      const normalizedAssignedUsers = [...uniqueUsers].sort((a, b) => a - b);
      const assignedUsersChanged =
        normalizedAssignedUsers.length !== normalizedOriginalAssignedUsers.length ||
        normalizedAssignedUsers.some((userId, index) => userId !== normalizedOriginalAssignedUsers[index]);

      if (values.name !== (editData.name || '')) payload.name = values.name;
      if (values.description !== (editData.description || '')) payload.description = values.description;
      if (values.status !== (editData.status === 1)) payload.status = values.status;
      if (responsibleUserId !== (editData?.owned_by?.id || null)) payload.responsible_user_id = responsibleUserId;
      if (assignedUsersChanged) payload.assigned_users = uniqueUsers;
    }

    setHasPendingResponsibleUserChange(false);

    if (editData) {
      dispatch(
        updateProjectRequest({
          projectId: editData.id,
          payload,
        }),
      );
    } else {
      dispatch(createProjectRequest(payload));
    }
  }
  const originalStatus = editData?.status === 1;

  function handleClose() {
    // prevent closing if the user has started editing
    if (dirty) return;
    onClose();
  }

  const analystUsersOptions = useSelector(getAnalystUsers);
  const viewerUsersOptions = useSelector(getViewerUsers);
  const managementUsersOptions = useSelector(getManagementUsers);
  const allUsers = useSelector((state: RootState) => state.user.allUsers);

  const responsibleUserRole = allUsers.find(user => user.id === values.responsibleUser)?.role;
  const filteredAnalystUsersOptions = analystUsersOptions.filter(user => !(responsibleUserRole === UserRole.Analyst && user.id === values.responsibleUser));
  const originalResponsibleUser = editData?.owned_by?.id;

  // only keep this one as as useDropdownValues hook sice this is will trigger
  // the data fetching, and rest above 4 will just filter the fetched data
  const responsibleUserOptions = useDropdownValues({
    selector: getResponsibleUsers,
    fetchAction: getAllUsersListRequest,
  });

  const hideAdminResponsibleUsers = variant === 'edit';
  const creatorResponsibleUserOption =
    variant === 'edit' &&
    editData?.created_by &&
    [UserRole.Admin, UserRole.SuperAdmin].includes(editData.created_by.role)
      ? {
          id: editData.created_by.id,
          label: editData.created_by.name,
          subLabel: editData.created_by.email,
        }
      : null;
  const filteredResponsibleUserOptions = hideAdminResponsibleUsers
    ? responsibleUserOptions.filter(option => {
        const user = allUsers.find(item => item.id === option.id);
        return user?.role !== UserRole.Admin && user?.role !== UserRole.SuperAdmin;
      })
    : responsibleUserOptions;
  const visibleResponsibleUserOptions = creatorResponsibleUserOption
    ? [creatorResponsibleUserOption, ...filteredResponsibleUserOptions.filter(option => option.id !== creatorResponsibleUserOption.id)]
    : filteredResponsibleUserOptions;
  const selectedResponsibleUserLabel =
    values.responsibleUser === originalResponsibleUser ? editData?.owned_by?.name : undefined;

  useEffect(() => {
    if (!values.responsibleUser || !responsibleUserRole) return;

    if (responsibleUserRole === UserRole.Admin && values.adminUsers.includes(values.responsibleUser)) {
      setFieldValue(
        'adminUsers',
        values.adminUsers.filter(id => id !== values.responsibleUser),
      );
    }

    if (responsibleUserRole === UserRole.Analyst && values.analystUsers.includes(values.responsibleUser)) {
      setFieldValue(
        'analystUsers',
        values.analystUsers.filter(id => id !== values.responsibleUser),
      );
    }
  }, [values.responsibleUser, responsibleUserRole, values.adminUsers, values.analystUsers, setFieldValue]);

  return (
    <CustomModal open={open} maxWidth={isResponsibleAnalystNotCreator ? 450 : 700} onClose={handleClose} className="overflow-y-auto">
      <div className="flex justify-between items-center mb-4">
        <Text variant="h3">{variant === 'edit' ? 'Edit Project' : 'Create Project'}</Text>
        <Icon name="cross" className="cursor-pointer" onClick={onClose} />
      </div>
      <div className={`flex ${isResponsibleAnalystNotCreator ? 'flex-row' : 'flex justify-center'} gap-4`}>
        <div className={`flex flex-col gap-4 ${isResponsibleAnalystNotCreator ? 'w-full' : 'w-[50%]'} `}>
          <TextInput
            label="Project Name"
            allowedRegex={/^[a-zA-Z0-9 _-]$/}
            placeholder="Enter project name"
            required
            value={values.name}
            onChange={val => setFieldValue('name', val)}
            onBlur={createCapitalizeFormattedBlurHandler(handleBlur('name'), setFieldValue, 'name', false)}
            touched={touched.name}
            maxLength={200}
            error={errors.name}
          />

          <TextArea
            label="Description"
            placeholder="Write Project Overview"
            required
            value={values.description}
            onChange={val => setFieldValue('description', val)}
            onBlur={handleBlur('description')}
            touched={touched.description}
            error={errors.description}
            preventLeadingSpace
            preventTrailingSpace
            allowedRegex={/^(?!.*\.\.).*$/}
          />

          <SelectInput
            label="Responsible User"
            placeholder="Select user"
            required
            options={
              hideAdminResponsibleUsers
                ? visibleResponsibleUserOptions
                : [...(authData ? [{id: authData?.id, label: authData?.name}] : []), ...responsibleUserOptions]
            }
            value={values.responsibleUser}
            selectedDisplayLabel={selectedResponsibleUserLabel}
            onChange={handleResponsibleUserChange}
            onBlur={handleBlur('responsibleUser')}
            touched={touched.responsibleUser}
            error={errors.responsibleUser}
            hideDropdown={(authData?.role === UserRole.Analyst && authData?.platform?.includes(Platform.PSP)) || isResponsibleAnalystNotCreator}
            disabled={(authData?.role === UserRole.Analyst && authData?.platform?.includes(Platform.PSP)) || isResponsibleAnalystNotCreator}
          />

          {/* Only show transfer message/alert if in edit mode and responsible user changed */}
          {variant === 'edit' &&
            originalResponsibleUser !== undefined &&
            values.responsibleUser !== undefined &&
            values.responsibleUser !== originalResponsibleUser && (
              <>
                <Text variant="small" className="text-text-secondary! -mt-3">
                  Transfer responsibility for this project to another user. 
                </Text>
                <Alert
                  message="You are about to transfer responsibility for this project to another user. "
                  variant="warning"
                  textClassName="text-text-secondary!"
                />
              </>
            )}
          <div className="flex items-center justify-between">
            <Text>Status</Text>
            <Toggle
              size="sm"
              value={values.status}
              onToggle={val => {
                setFieldTouched('status', true, false);
                setFieldValue('status', val);
              }}
              label={values.status ? 'Active' : 'Inactive'}
            />
          </div>
          {variant === 'edit' &&
            touched.status &&
            originalStatus !== values.status &&
            (values.status ? (
              <Alert
                message="Enabling will make this project active again. Users will be able to create and run new simulations."
                variant="success"
                textClassName="text-text-secondary!"
                className="bg-[#F5FFFB]!"
              />
            ) : (
              <Alert
                message="Disabling will make this project read-only. Users can view the project, but cannot create or run new simulations until it is enabled again."
                variant="warning"
                textClassName="text-text-secondary!"
              />
            ))}
        </div>
        {/* Hide Assign Users by Role section for responsible analyst who is not creator */}
        {!isResponsibleAnalystNotCreator && (
          <div className="flex flex-col gap-3 w-[50%]">
            <MultiSelectInput
              isIcon
              iconName="users"
              label="Assign Users by Role"
              wrapperClassName={values.analystUsers.length > 0 ? 'rounded-t-sm! rounded-b-none!' : 'rounded-b-sm!'}
              iconClassName="text-primary!"
              countChipClassName={variant === 'edit' ? 'bg-[#F5F5F5] text-[#151735] font-InterMedium!' : 'bg-[#F1FFFF] text-primary'}
              showSelectAll
              required
              showChipsAfterSelect
              countChipLabel={items => `${items?.length} Users`}
              showCountChip
              showPlaceholder
              placeholder="Analyst"
              placeholderClassName="text-text-primary!"
              options={filteredAnalystUsersOptions}
              values={values.analystUsers}
              onChange={items =>
                setFieldValue(
                  'analystUsers',
                  items.map(i => i.id),
                )
              }
              disabled={isResponsibleAnalystNotCreator}
            />

            <MultiSelectInput
              isIcon
              iconName="users"
              iconClassName="text-primary!"
              wrapperClassName={values.viewerUsers.length > 0 ? 'rounded-t-sm! rounded-b-none!' : 'rounded-b-sm!'}
              countChipClassName={variant === 'edit' ? 'bg-[#F5F5F5] text-[#151735] font-InterMedium!' : 'bg-[#F1FFFF] text-primary'}
              countChipLabel={items => `${items?.length} Users`}
              showChipsAfterSelect
              showCountChip
              showPlaceholder
              showSelectAll
              placeholder="Viewer"
              placeholderClassName="text-text-primary!"
              options={viewerUsersOptions}
              values={values.viewerUsers}
              onChange={items =>
                setFieldValue(
                  'viewerUsers',
                  items.map(i => i.id),
                )
              }
              disabled={isResponsibleAnalystNotCreator}
            />

            <MultiSelectInput
              isIcon
              iconName="users"
              wrapperClassName={values.managementUsers.length > 0 ? 'rounded-t-sm! rounded-b-none!' : 'rounded-b-sm!'}
              iconClassName="text-primary!"
              countChipClassName={variant === 'edit' ? 'bg-[#F5F5F5] text-[#151735] font-InterMedium!' : 'bg-[#F1FFFF] text-primary'}
              showChipsAfterSelect
              countChipLabel={items => `${items?.length} Users`}
              showCountChip
              showPlaceholder
              showSelectAll
              placeholderClassName="text-text-primary!"
              placeholder="Management"
              options={managementUsersOptions}
              values={values.managementUsers}
              onChange={items =>
                setFieldValue(
                  'managementUsers',
                  items.map(i => i.id),
                )
              }
              disabled={isResponsibleAnalystNotCreator}
            />
          </div>
        )}
      </div>
      <Button
        size="md"
        className="w-64 my-6 mx-auto flex justify-center"
        disabled={!isValid || (!dirty && !hasPendingResponsibleUserChange)}
        onClick={submitForm}>
        Save Project
      </Button>
    </CustomModal>
  );
}

export default CreateProject;
