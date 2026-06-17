import {AssetType, Country, CountryLabel} from '@/constants';
import {useRole} from '@/hooks';
import {OnboardAssetRequest} from '@/interface';
import {
  allOrganizationsList,
  assetError,
  assetErrorMessageVars,
  assetSuccess,
  currentSelectedAsset,
} from '@/services/redux/selectors';
import {editAssetRequest, onboardAssetRequest} from '@/services/redux/slice';
import {Button, SearchableSelectInput, SelectInput, Text, TextInput} from '@/ui-kits';
import {
  AssetOnboardingSchema,
  cn,
  createCapitalizeFormattedBlurHandler,
  enumToSelectOptions,
  ErrorCodes,
  getErrorMessage,
  SuccessCodes,
} from '@/utils';
import {useFormik} from 'formik';
import {useEffect, useState} from 'react';
import {useDispatch, useSelector} from 'react-redux';
type FormInitalValues = {
  name: string;
  type: AssetType | null;
  capacity: string;
  location: string;
  country_id: number | null;
  organization_id: number | null;
};

const ASSET_TYPE_OPTION = enumToSelectOptions(AssetType);
const COUNTRIES_OPTIONS = enumToSelectOptions(Country, CountryLabel);
const NAME_VALIDATION_ERROR_CODES: ErrorCodes[] = ['E-10060', 'E-10125'];

const initialValues: FormInitalValues = {
  capacity: '',
  country_id: null,
  location: '',
  name: '',
  organization_id: null,
  type: null,
};

interface BasicInfoProps {
  onBack: () => void;
  hideHeaderFunc: (val: boolean) => void;
  continueOnboarding: () => void;
  mode: 'add' | 'edit';
}
export function AssetBasicInformation(props: BasicInfoProps) {
  const {onBack, hideHeaderFunc, continueOnboarding, mode} = props;
  const [formValues, setFormValues] = useState<FormInitalValues | null>(null);


  // ===============
  // hooks
  // ===============
  const dispatch = useDispatch();
  const {
    dirty,
    isValid,
    values,
    errors,
    touched,
    handleSubmit,
    handleBlur,
    handleChange,
    setFieldError,
    setFieldValue,
    resetForm,
  } = useFormik({
    initialValues: formValues || initialValues,
    onSubmit: handleSubmitForm,
    validationSchema: AssetOnboardingSchema,
    enableReinitialize: true,
  });

  // ===============
  // selectors
  // ===============
  const allOrgs = useSelector(allOrganizationsList);
  const failure = useSelector(assetError) as ErrorCodes;
  const failureMessageVars = useSelector(assetErrorMessageVars);
  const success = useSelector(assetSuccess) as SuccessCodes;
  const currentAsset = useSelector(currentSelectedAsset);
  const {isAnalyst} = useRole();

  // ===============
  // state
  // ===============
  const [canEdit, setCanEdit] = useState<boolean>(true);
  const isNonEditableRole = isAnalyst;

  // ===============
  // functions
  // ===============
  function handleSubmitForm(values: FormInitalValues) {
    if (mode === 'add') {
      handleOnboardAsset(values);
    } else {
      handleEditAsset(values);
    }
  }

  function handleEditAsset(values: FormInitalValues) {
    if (!currentAsset?.id) return;
    if (!values.country_id) return;
    if (!values.organization_id) return;
    if (!values.type) return;

    dispatch(
      editAssetRequest({
        id: currentAsset.id,
        capacity: Number(values.capacity),
        country_id: values.country_id,
        location: values.location,
        name: values.name,
        organization_id: values.organization_id,
        type: values.type,
      }),
    );
  }

  function handleOnboardAsset(values: FormInitalValues) {
    if (!values.country_id) return;
    if (!values.organization_id) return;
    if (!values.type) return;

    const payload: OnboardAssetRequest['payload'] = {
      capacity: Number(values.capacity),
      country_id: values.country_id,
      location: values.location,
      name: values.name,
      organization_id: values.organization_id,
      type: values.type,
    };
    dispatch(onboardAssetRequest(payload));
  }

  function handleCancel() {
    if (mode === 'add' || isAnalyst) {
      onBack();
      return;
    }
    if (canEdit) {
      setCanEdit(false);
      resetForm();
    }
  }

  // ======================
  // side effects
  // ======================
  useEffect(() => {
    if (failure && NAME_VALIDATION_ERROR_CODES.includes(failure)) {
      let message = getErrorMessage(failure);
      // for E-10125 we need to pass the asset name in the error message
      if (failure === 'E-10125') {
        message = getErrorMessage(failure, failureMessageVars);
      }
      setFieldError('name', message);
    }
    if (success && success === 'S-10028') {
      setCanEdit(false);
    }
  }, [failure, success]);

  useEffect(() => {
    if (values.type) {
      hideHeaderFunc(values.type === AssetType.Solar);
    }
  }, [values.type]);

  /**
   * set the values for form values if current asset is present
   */
  useEffect(() => {
    if (currentAsset && mode === 'edit') {
      setFormValues({
        capacity: String(currentAsset.capacity),
        country_id: currentAsset.country.id,
        location: currentAsset.location,
        name: currentAsset.name,
        organization_id: currentAsset.organization.id,
        type: currentAsset.type,
      });
    }
  }, [currentAsset, mode]);

  useEffect(() => {
    if (mode === 'edit') {
      setCanEdit(false);
    }
  }, [mode]);

  return (
    <div className="grow items-center flex flex-col justify-evenly gap-8 px-20">
      <div className="flex flex-col items-center gap-2">
        <Text variant="h3" className="text-center">
          Asset Basic Information
        </Text>
        <Text variant="caption" className="text-center text-text-secondary!">
          Enter the operational identity of the asset.
        </Text>
      </div>

      <div className="grid grid-cols-2 w-full max-w-230 gap-4 mx-8 gap-x-20 gap-y-4">
        <TextInput
          value={values.name}
          readonly={isNonEditableRole}
          disabled={!canEdit}
          error={errors.name}
          wrapperClassName={cn('pl-3.5', isNonEditableRole ? 'bg-bg-card/50 border-0!' : 'bg-white!')}
          maxLength={150}
          touched={touched.name}
          onChange={handleChange('name')}
          onBlur={createCapitalizeFormattedBlurHandler(handleBlur('name'), setFieldValue, 'name')}
          preventLeadingSpace
          preventTrailingSpace
          placeholder="e.g., solar farm alpha"
          label="Asset Name"
          required
        />
        <SelectInput
          value={values.type}
          readonly={isNonEditableRole}
          iconClassName="text-text-secondary!"
          disabled={!canEdit}
          error={errors.type}
          hideDropdown={!canEdit}
          wrapperClassName={cn(isNonEditableRole ? 'bg-bg-card/50 border-0!' : 'bg-white!')}
          touched={touched.type}
          options={ASSET_TYPE_OPTION}
          onChange={item => setFieldValue('type', item.id)}
          onBlur={handleBlur('type')}
          placeholder="Select asset type"
          label="Asset Type"
          required
        />
        <TextInput
          value={values.capacity}
          readonly={isNonEditableRole}
          disabled={!canEdit}
          allowFloat
          wrapperClassName={cn('pl-3.5', isNonEditableRole ? 'bg-bg-card/50 border-0!' : 'bg-white!')}
          error={errors.capacity}
          touched={touched.capacity || Boolean(values.capacity)}
          preventLeadingSpace
          preventTrailingSpace
          onChange={handleChange('capacity')}
          onBlur={handleBlur('capacity')}
          placeholder="e.g., 150.55"
          label="Capacity MW"
          required
        />
        <TextInput
          value={values.location}
          readonly={isNonEditableRole}
          disabled={!canEdit}
          error={errors.location}
          touched={touched.location}
          wrapperClassName={cn('pl-3.5', isNonEditableRole ? 'bg-bg-card/50 border-0!' : 'bg-white!')}
          maxLength={150}
          preventLeadingSpace
          preventTrailingSpace
          onChange={handleChange('location')}
          onBlur={createCapitalizeFormattedBlurHandler(handleBlur('location'), setFieldValue, 'location')}
          placeholder="e.g., Chennai, TN"
          label="Location"
          required
        />
        <SearchableSelectInput
          value={values.country_id}
          disabled={!canEdit}
          wrapperClassName={cn(isNonEditableRole ? 'bg-bg-card/50 border-0!' : 'bg-white!')}
          error={errors.country_id}
          touched={touched.country_id}
          options={COUNTRIES_OPTIONS}
          hideDropdown={!canEdit}
          onChange={item => setFieldValue('country_id', item.id)}
          onBlur={handleBlur('country_id')}
          placeholder="Select Country"
          label="Country"
          required
          invalidSearchError={getErrorMessage('E-10108')}
        />

        <SearchableSelectInput
          value={values.organization_id}
          wrapperClassName={cn(isNonEditableRole ? 'bg-bg-card/50 border-0!' : 'bg-white!')}
          error={errors.organization_id}
          disabled={!canEdit}
          hideDropdown={!canEdit}
          touched={touched.organization_id}
          options={
            isAnalyst
            ? [{id: currentAsset?.organization.id || 0, label: currentAsset?.organization.name || ''}]
            : allOrgs
          }
          onChange={item => setFieldValue('organization_id', item.id)}
          onBlur={handleBlur('organization_id')}
          placeholder="Select Owner Organization"
          label="Owner Organization"
          required
          invalidSearchError={getErrorMessage('E-10109')}
        />
      </div>

      {(isAnalyst || canEdit) && (
        <div className="gap-3 self-center flex items-center">
          <Button variant="secondary" className="w-full px-8" onClick={handleCancel}>
            Cancel
          </Button>
          <Button className="w-full px-8" disabled={!isAnalyst && (!dirty || !isValid)} onClick={() => isAnalyst ? continueOnboarding() : handleSubmit()}>
            {isAnalyst ? "Continue Onboarding" : (values.type !== AssetType.Solar ? 'Save & Continue' : 'Save')}
          </Button>
        </div>
      )}

      {!isAnalyst && !canEdit && (
        <Button onClick={() => setCanEdit(true)} variant="secondary" className="self-center px-10">
          Edit
        </Button>
      )}
    </div>
  );
}
