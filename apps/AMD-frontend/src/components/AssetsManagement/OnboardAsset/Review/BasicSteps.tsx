import { ASSET_TYPE_LABELS, ASSET_TYPE_OPTIONS, AssetType, Country, CountryLabel } from "@/constants";
import { EditableSectionChildrenProps, KeyValueDisplay } from "./common";
import { AssetOnboardingSchema, createCapitalizeFormattedBlurHandler, enumToSelectOptions, ErrorCodes, formatMegaWatt, getErrorMessage, SuccessCodes } from "@/utils";
import { useDispatch, useSelector } from "react-redux";
import { useRole } from "@/hooks";
import { allOrganizationsList, assetError, assetErrorMessageVars, assetSuccess, currentSelectedAsset } from "@/services/redux/selectors";
import { useFormik } from "formik";
import { editAssetRequest } from "@/services/redux/slice";
import { useEffect } from "react";
import { Button, SearchableSelectInput, SelectInput, TextInput } from "@/ui-kits";

/**
 * ===============================================================
 * Basic Information Section
 * ===============================================================
 * Displays and edits basic asset information inside SectionFrame
 *
 * @param isEditing - Indicates whether the section is currently in edit mode
 * @param onCancelEdit - Callback to exit edit mode and revert to view state
 */
interface BasicInformationProps extends EditableSectionChildrenProps {
  registerReset?: (fn: () => void) => void;
  setHasUnsavedChanges?: (hasChanges: boolean) => void;
}

export const BasicInformationSection = (props: BasicInformationProps) => {
  const {isEditing, onCancelEdit, registerReset, setHasUnsavedChanges} = props;

  // ===============
  // constants
  // ===============
  type BasicInformationFormValues = {
    name: string;
    type: AssetType | null;
    capacity: string;
    location: string;
    country_id: number | null;
    organization_id: number | null;
  };
  const COUNTRIES_OPTIONS = enumToSelectOptions(Country, CountryLabel);
  const NAME_VALIDATION_ERROR_CODES: ErrorCodes[] = ['E-10060', 'E-10125'];

  // ===============
  // hooks
  // ===============
  const dispatch = useDispatch();
  const {isAMDAdmin} = useRole();

  // ===============
  // selector
  // ===============
  const allOrgs = useSelector(allOrganizationsList);
  const currentAsset = useSelector(currentSelectedAsset);
  const failureMessageVars = useSelector(assetErrorMessageVars);
  const success = useSelector(assetSuccess) as SuccessCodes;
  const failure = useSelector(assetError) as ErrorCodes;
  const formValues: BasicInformationFormValues = {
    name: currentAsset?.name || '',
    type: currentAsset?.type || null,
    capacity: currentAsset ? String(currentAsset.capacity) : '',
    location: currentAsset?.location || '',
    country_id: currentAsset?.country?.id || null,
    organization_id: currentAsset?.organization?.id || null,
  };

  const {
    dirty,
    isValid,
    values,
    errors,
    touched,
    handleSubmit,
    handleBlur,
    handleChange,
    setFieldValue,
    resetForm,
    setFieldError,
  } = useFormik({
    initialValues: formValues,
    onSubmit: handleSubmitForm,
    validationSchema: AssetOnboardingSchema,
    enableReinitialize: true,
  });

  // ===============
  // functions
  // ===============
  function handleSubmitForm(values: BasicInformationFormValues) {
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

  function handleCancelEdit() {
    resetForm();
    onCancelEdit?.();
  }

  // ===============
  // side effects
  // ===============
  useEffect(() => {
    if (success && success === 'S-10028') {
      onCancelEdit?.();
    }
    if (failure && NAME_VALIDATION_ERROR_CODES.includes(failure)) {
      let message = getErrorMessage(failure);
      // for E-10125 we need to pass the asset name in the error message
      if (failure === 'E-10125') {
        message = getErrorMessage(failure, failureMessageVars);
      }
      setFieldError('name', message);
    }
  }, [failure, success]);

  useEffect(() => {
    registerReset?.(() => {
      resetForm();
      onCancelEdit?.(); // exit edit mode
    });
  }, [resetForm, onCancelEdit]);

  useEffect(() => {
    setHasUnsavedChanges?.(dirty);
  }, [dirty]);

  if (!isAMDAdmin || !isEditing) {
    return (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {[
          ['Name', currentAsset?.name || ''],
          ['Type', currentAsset && currentAsset?.type ? ASSET_TYPE_LABELS[currentAsset.type] : ''],
          ['Capacity', formatMegaWatt(currentAsset?.capacity || 0)],
          ['Location', currentAsset?.location || ''],
          ['Country', currentAsset?.country?.name || ''],
          ['Org', currentAsset?.organization?.name || ''],
        ].map(([label, value], index) => (
          <KeyValueDisplay label={label} value={value} key={index} className="min-w-0" />
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col p-4 gap-4">
      <div className="grid grid-cols-2 w-full gap-4 gap-x-20 gap-y-4">
        <TextInput
          value={values.name}
          error={errors.name}
          wrapperClassName="bg-white! pl-3.5"
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
          iconClassName="text-text-secondary!"
          error={errors.type}
          wrapperClassName="bg-white!"
          touched={touched.type}
          options={ASSET_TYPE_OPTIONS}
          onChange={item => setFieldValue('type', item.id)}
          onBlur={handleBlur('type')}
          placeholder="Select asset type"
          label="Asset Type"
          required
        />
        <TextInput
          value={values.capacity}
          allowFloat
          wrapperClassName="bg-white! pl-3.5"
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
          error={errors.location}
          touched={touched.location}
          wrapperClassName="bg-white! pl-3.5"
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
          wrapperClassName="bg-white!"
          error={errors.country_id}
          touched={touched.country_id}
          options={COUNTRIES_OPTIONS}
          onChange={item => setFieldValue('country_id', item.id)}
          onBlur={handleBlur('country_id')}
          placeholder="Select Country"
          label="Country"
          required
          invalidSearchError={getErrorMessage('E-10108')}
        />

        <SearchableSelectInput
          value={values.organization_id}
          wrapperClassName="bg-white!"
          error={errors.organization_id}
          touched={touched.organization_id}
          options={allOrgs}
          onChange={item => setFieldValue('organization_id', item.id)}
          onBlur={handleBlur('organization_id')}
          placeholder="Select Owner Organization"
          label="Owner Organization"
          required
          invalidSearchError={getErrorMessage('E-10109')}
        />
      </div>

      <div className="gap-3 self-center flex items-center">
        <Button variant="secondary" className="w-full px-8" onClick={handleCancelEdit}>
          Cancel
        </Button>
        <Button className="w-full px-8" disabled={!dirty || !isValid} onClick={() => handleSubmit()}>
          {values.type !== AssetType.Solar ? 'Save & Continue' : 'Save'}
        </Button>
      </div>
    </div>
  );
};
