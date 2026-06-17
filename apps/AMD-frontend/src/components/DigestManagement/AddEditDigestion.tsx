import React, {useEffect, useRef, useState} from 'react';
import {useDispatch, useSelector} from 'react-redux';
import {
  Modal,
  Text,
  Icon,
  TextInput,
  Toggle,
  Button,
  SelectInput,
  MultiSelectInput,
  SearchableMultiSelectInput,
  SchedulePicker,
  Alert,
} from '@/ui-kits';
import {useFormik} from 'formik';
import {cn, createCapitalizeFormattedBlurHandler, digestValidationSchema, enumToSelectOptions} from '@/utils';
import {DigestFrequency, digestNameRegex, DigestScope} from '@/constants';
import type {Digest, ScheduleTime, SelectInputItem} from '@/interface';
import {
  addDigestRequest,
  assetMultipleUserRequest,
  editDigestRequest,
  getAllAssetsListRequest,
  getAllOrganizationsListRequest,
  organizationMultipleUserRequest,
} from '@/services/redux/slice';
import {
  allAssetsList,
  allOrganizationsList,
  assetMultipleUsers,
  organizationMultipleUsers,
} from '@/services/redux/selectors';
import {useDropdownValues} from '@/hooks';

interface AddEditDigestionProps {
  variant: 'edit' | 'add';
  onClose: () => void;
  open: boolean;
  currentSelectDigest: Digest | null;
}

type FormValues = {
  name: string;
  scope: number | null;
  frequency: number | null;
  schedule: ScheduleTime;
  recipients: number[] | null;
  resource_id: number[] | null;
  status: boolean;
};
const formInitialValues: FormValues = {
  name: '',
  scope: null,
  frequency: null,
  schedule: {
    time: '',
    weekday: null,
    day_of_month: null,
  },
  recipients: null,
  resource_id: null,
  status: true,
};

const SCOPE_SELECT_OPTIONS = enumToSelectOptions(DigestScope);
const FREQUENCY_SELECT_OPTIONS = enumToSelectOptions(DigestFrequency);

const PORTFOLIO_WIDE_SELECT_OPTION: SelectInputItem = {id: 'ALL', label: 'All'};

export const AddEditDigestion: React.FC<AddEditDigestionProps> = props => {
  const {variant, onClose, open, currentSelectDigest} = props;

  // states
  const [initialValues, setInitialValues] = useState<FormValues>(formInitialValues);
  const [userSearch, setUsersearch] = useState('');
  const isInitializingRef = useRef(false);

  // ===============
  // Hooks
  // ===============
  const dispatch = useDispatch();
  const {
    dirty,
    isValid,
    values,
    errors,
    initialValues: initialState,
    setFieldTouched,
    touched,
    setFieldValue,
    handleSubmit,
    handleBlur,
    handleChange,
  } = useFormik({
    initialValues,
    validationSchema: digestValidationSchema,
    enableReinitialize: true,
    onSubmit: handleOnSubmit,
  });

  const allAssets = useDropdownValues({
    selector: allAssetsList,
    fetchAction: getAllAssetsListRequest,
    allowFetch: values.scope === DigestScope['Per Asset'],
  });

  const allOrgs = useDropdownValues({
    selector: allOrganizationsList,
    fetchAction: getAllOrganizationsListRequest,
    allowFetch: values.scope === DigestScope['Per Organization'],
  });

  // ==================
  // Selectors
  // ==================
  const assetUsers = useSelector(assetMultipleUsers);
  const organizationUsers = useSelector(organizationMultipleUsers);

  // ==================
  // Computed Values
  // ==================
  const AppliesToDropdownValues: SelectInputItem[] = (() => {
    if (values.scope === DigestScope['Per Asset']) return allAssets;
    if (values.scope === DigestScope['Per Organization']) return allOrgs;
    return [PORTFOLIO_WIDE_SELECT_OPTION];
  })();

  const RecipientsDropdownValue: SelectInputItem[] = (() => {
    if (values.scope === DigestScope['Per Asset'])
      return assetUsers.map(item => ({
        id: item.id,
        label: item.name,
        subLabel: item.email,
      }));
    if (values.scope === DigestScope['Per Organization'])
      return organizationUsers.map(item => ({
        id: item.id,
        label: item.name,
        subLabel: item.email,
      }));
    return [PORTFOLIO_WIDE_SELECT_OPTION];
  })();

  // ===================
  // function
  // ===================
  function handleOnSubmit(values: FormValues) {
    if (variant === 'add') {
      return handleAddDigest(values);
    } else if (variant === 'edit') {
      return handleEditDigest(values);
    }
  }

  function handleAddDigest(values: FormValues) {
    if (!values?.frequency) return;
    if (!values?.scope) return;
    if (!values.recipients) return;

    dispatch(
      addDigestRequest({
        day_of_month: values?.schedule?.day_of_month,
        frequency: values.frequency,
        name: values.name,
        recipients: values.recipients,
        resource_id: values.resource_id,
        scope: values.scope,
        status: values.status,
        time: values?.schedule?.time,
        weekday: values?.schedule?.weekday,
      }),
    );
  }

  function handleEditDigest(values: FormValues) {
    if (!values?.frequency) return;
    if (!values?.scope) return;
    if (!currentSelectDigest?.id) return;
    if (!values.recipients) return;

    dispatch(
      editDigestRequest({
        id: currentSelectDigest.id,
        day_of_month: values?.schedule?.day_of_month,
        frequency: values.frequency,
        name: values.name,
        recipients: values.recipients,
        resource_id: values.resource_id,
        scope: values.scope,
        status: values.status,
        time: values?.schedule?.time,
        weekday: values?.schedule?.weekday,
      }),
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  function handleClose() {
    // prevent closing if the user has started editing
    if (dirty) return;
    onClose();
  }

  // ====================
  // side effects
  // ====================

  /*
   * when scope changes, reset the recipients, and applies to
   */
  useEffect(() => {
    if (isInitializingRef.current) {
      isInitializingRef.current = false; // 👈 consume the flag, don't reset
      return;
    }
    if (values.scope) {
      setFieldValue('recipients', []);
      setFieldValue('resource_id', []);
    }
  }, [values.scope]);

  /*
   * when scope changes, reset the recipients, and applies to
   */
  useEffect(() => {
    if (!open) return;
    if (!values.scope || !Array.isArray(values.resource_id)) return;

    if (values.scope === DigestScope['Per Asset']) {
      if (values.resource_id.length > 0) {
        dispatch(assetMultipleUserRequest({asset_ids: values.resource_id, search: userSearch}));
      }
    }

    if (values.scope === DigestScope['Per Organization']) {
      if (values.resource_id.length > 0) {
        dispatch(organizationMultipleUserRequest({org_ids: values.resource_id, search: userSearch}));
      }
    }
  }, [open, values.scope, values.resource_id, userSearch]);

  /**
   * populate form values with current selected digest
   */
  useEffect(() => {
    if (!open) return;
    if (variant === 'add') return;
    if (!currentSelectDigest) return;

    isInitializingRef.current = true; // 👈 flag: we're initializing

    const scopeId = currentSelectDigest.scope?.id ?? null;
    const frequencyId = currentSelectDigest.frequency?.id ?? null;

    const newValues: FormValues = {
      name: currentSelectDigest.name || '',
      scope: scopeId,
      frequency: frequencyId,
      schedule: {
        time: currentSelectDigest.schedule?.time || '',
        weekday: currentSelectDigest.schedule?.weekday ?? null,
        day_of_month: currentSelectDigest.schedule?.day_of_month ?? null,
      },
      recipients: (currentSelectDigest.recipients || []).map(r => r.id),
      resource_id: (currentSelectDigest.resources || []).map(r => r.id),
      status: currentSelectDigest.status,
    };
    setInitialValues(newValues);
  }, [open, variant, currentSelectDigest]);

  /**
   * when frequency is changed to something other than weekly, reset weekday 
   * when frequency is changed to something other than monthly, reset day_of_month
   */
  useEffect(() => {
  if (!values.frequency) return;

  if (values.frequency !== DigestFrequency.Weekly) {
    setFieldValue('schedule.weekday', null);
  }

  if (values.frequency !== DigestFrequency.Monthly) {
    setFieldValue('schedule.day_of_month', null);
  }
}, [values.frequency]);

  return (
    <Modal open={open} maxWidth={700} className="flex flex-col gap-4 overflow-visible">
      <div className="flex justify-between items-center">
        <Text variant="h3">{variant === 'add' ? 'Add Digest' : 'Edit Digest'}</Text>
        <Icon name="cross" className="cursor-pointer" onClick={onClose} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <TextInput
          allowedRegex={digestNameRegex}
          label="Digest Name"
          placeholder="Enter digest name"
          required
          value={values.name}
          onChange={handleChange('name')}
          onBlur={createCapitalizeFormattedBlurHandler(handleBlur('name'), setFieldValue, 'name')}
          touched={touched.name}
          error={errors.name}
          preventLeadingSpace
          preventTrailingSpace
        />
        <SelectInput
          label="Scope"
          placeholder="Select Scope"
          required
          options={SCOPE_SELECT_OPTIONS}
          value={values.scope}
          onChange={item => setFieldValue('scope', item.id)}
          onBlur={handleBlur('scope')}
          touched={touched.scope}
          error={errors.scope}
        />
        <MultiSelectInput
          label="Applies to"
          placeholder="Select"
          required
          showSelectAll
          disabled={!values.scope}
          hideDropdown={values.scope === DigestScope['Portfolio-wide']}
          options={AppliesToDropdownValues}
          values={
            values.scope === DigestScope['Portfolio-wide'] ? [PORTFOLIO_WIDE_SELECT_OPTION.id] : values.resource_id
          }
          onChange={items =>
            setFieldValue(
              'resource_id',
              items.map(item => item.id),
            )
          }
          onBlur={handleBlur('resource_id')}
          touched={touched.resource_id}
          error={errors.resource_id}
        />
        <SelectInput
          label="Frequency"
          placeholder="Select Frequency"
          required
          options={FREQUENCY_SELECT_OPTIONS}
          value={values.frequency}
          onChange={item => setFieldValue('frequency', item.id)}
          onBlur={handleBlur('frequency')}
          touched={touched.frequency}
          error={errors.frequency}
        />
        <SchedulePicker
          disabled={!values.frequency}
          label="Schedule"
          required
          placeholder="Select Schedule"
          showMonthSelector={values.frequency === DigestFrequency.Monthly}
          showWeekSelector={values.frequency === DigestFrequency.Weekly}
          value={values.schedule}
          onChange={item => setFieldValue('schedule', item)}
          touched={touched.schedule?.time || touched.schedule?.day_of_month || touched.schedule?.weekday}
          error={errors.schedule?.time || errors.schedule?.day_of_month || errors.schedule?.weekday}
          onBlur={handleBlur('schedule')}
          pickerClassName={cn(values.frequency === DigestFrequency.Monthly && '-translate-y-50 translate-x-full')}
        />

        <SearchableMultiSelectInput
          label="Recipients"
          placeholder="Select Recipients"
          onSearch={setUsersearch}
          required
          disabled={!values.scope || !values.resource_id?.length}
          hideDropdown={values.scope === DigestScope['Portfolio-wide']}
          options={RecipientsDropdownValue}
          values={
            values.scope === DigestScope['Portfolio-wide'] ? [PORTFOLIO_WIDE_SELECT_OPTION.id] : values.recipients
          }
          onChange={items =>
            setFieldValue(
              'recipients',
              items.map(item => item.id),
            )
          }
          internalSearch
          onBlur={handleBlur('recipients')}
          touched={touched.recipients}
          error={errors.recipients as string}
        />
        <div className="flex items-center justify-between mt-6">
          <Text variant="caption">Status</Text>
          <Toggle
            size="sm"
            value={values.status}
            onBlur={handleBlur('status')}
            onToggle={val => {
              setFieldTouched('status', true, false);
              setFieldValue('status', val);
            }}
            // onToggle={val => setFieldValue('status', val)}
            labelClassName="min-w-14 text-center"
            label={values.status ? 'Active' : 'Inactive'}
          />
        </div>

        {/* warning/info message */}
        {variant === 'edit' && values.status === false && touched.status && initialState.status !== values.status && (
        <Alert message="This will stop automated delivery of this digest." variant='warning'/>
        )}

        {variant === 'edit' && values.status === true && touched.status && initialState.status !== values.status && (
          <Alert message="This will resume automated delivery based on the configured schedule." variant='success'/>
        )}
      </div>

      <Button
        size="lg"
        className="w-64 mt-6 self-center flex justify-center items-center"
        disabled={variant === 'edit' ? !isValid : !isValid || !dirty}
        onClick={() => handleSubmit()}>
        Save Digest
      </Button>
    </Modal>
  );
};
