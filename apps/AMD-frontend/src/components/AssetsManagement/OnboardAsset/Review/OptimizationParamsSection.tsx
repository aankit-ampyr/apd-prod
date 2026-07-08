import { useDispatch, useSelector } from "react-redux";
import { EditableSectionChildrenProps, KeyValueDisplay } from "./common";
import { assetSuccess, currentSelectedAsset } from "@/services/redux/selectors";
import { AssetOptmizationParamsSchema, formatMegaWatt, handleFloatBlurWithTrailingDotFormat, SuccessCodes } from "@/utils";
import { useFormik } from "formik";
import { assetOptimizationParamRequest } from "@/services/redux/slice";
import { useEffect } from "react";
import { Button, TextInput } from "@/ui-kits";

/**
 * ===============================================================
 * Optimization Parameters Section
 * ===============================================================
 * Displays and edits optimization parameters inside SectionFrame
 *
 * @param isEditing - Indicates whether the section is currently in edit mode
 * @param onCancelEdit - Callback to exit edit mode and revert to view state
 */
interface OptimizationParamsProps extends EditableSectionChildrenProps {
  registerReset?: (fn: () => void) => void;
  setHasUnsavedChanges?: (hasChanges: boolean) => void;
}
export const OptimizationParamsSection = (props: OptimizationParamsProps) => {
  const {isEditing, onCancelEdit, registerReset, setHasUnsavedChanges} = props;
  // ===============
  // constants
  // ===============
  type OptimizationParamsFormValues = {
    max_charge_rate: string;
    max_discharge_rate: string;
    usable_capacity: string;
    min_soc: string;
    max_soc: string;
    round_trip_efficiency: string;
    max_daily_cycles: string;
  };

  // ===============
  // hooks
  // ===============
  const dispatch = useDispatch();

  // ===============
  // selector
  // ===============
  const currentAsset = useSelector(currentSelectedAsset);
  const success = useSelector(assetSuccess) as SuccessCodes;
  const formValues: OptimizationParamsFormValues = {
    max_charge_rate: currentAsset?.max_charging_rate ? String(currentAsset.max_charging_rate) : '',
    max_discharge_rate: currentAsset?.max_discharging_rate ? String(currentAsset.max_discharging_rate) : '',
    usable_capacity: currentAsset?.usable_capacity ? String(currentAsset.usable_capacity) : '',
    min_soc: currentAsset?.soc_min ? String(currentAsset.soc_min) : '',
    max_soc: currentAsset?.soc_max ? String(currentAsset.soc_max) : '',
    round_trip_efficiency: currentAsset?.round_trip_efficiency ? String(currentAsset.round_trip_efficiency) : '',
    max_daily_cycles: currentAsset?.max_daily_cycles ? String(currentAsset.max_daily_cycles) : '',
  };

  const {isValid, values, errors, resetForm, touched, handleSubmit, handleBlur, handleChange, dirty, setFieldValue} =
    useFormik({
      initialValues: formValues,
      onSubmit: handleOnboardAsset,
      validationSchema: AssetOptmizationParamsSchema,
      enableReinitialize: true,
    });

  // ===============
  // function
  // ===============
  const powerAsymmetryRatio = (() => {
    if (!values.max_charge_rate || !values.max_discharge_rate) {
      return null;
    }

    const ratio = Number.parseFloat(values.max_discharge_rate) / Number.parseFloat(values.max_charge_rate);
    if (!isFinite(ratio)) return null;
    return ratio.toPrecision(2);
  })();

  function handleOnboardAsset(values: OptimizationParamsFormValues) {
    if (!currentAsset) return;
    dispatch(
      assetOptimizationParamRequest({
        id: currentAsset?.id,
        max_charging_rate: Number(values.max_charge_rate),
        max_daily_cycles: Number(values.max_daily_cycles),
        max_discharging_rate: Number(values.max_discharge_rate),
        round_trip_efficiency: Number(values.round_trip_efficiency),
        soc_max: Number(values.max_soc),
        soc_min: Number(values.min_soc),
        usable_capacity: Number(values.usable_capacity),
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
    if (success && success === 'S-10027') {
      onCancelEdit?.();
    }
  }, [success]);

  useEffect(() => {
    registerReset?.(() => {
      resetForm();
      onCancelEdit?.(); // exit edit mode
    });
  }, [resetForm, onCancelEdit]);

  useEffect(() => {
    setHasUnsavedChanges?.(dirty);
  }, [dirty]);

  if (!isEditing) {
    return (
      <div className="grid grid-cols-3 gap-4">
        {[
          ['Maximum Charging Rate', formatMegaWatt(currentAsset?.max_charging_rate || 0)],
          ['Power Asymmetry Ratio', powerAsymmetryRatio ? `${Number(powerAsymmetryRatio)}` : ''],
          ['Minimum SOC', `${currentAsset?.soc_min || 0}%`],
          ['Maximum Discharging Rate', formatMegaWatt(currentAsset?.max_discharging_rate || 0)],
          ['Usable Capacity', formatMegaWatt(currentAsset?.usable_capacity || 0) + 'h'],
          ['Maximum SOC', `${currentAsset?.soc_max || 0}%`],
          ['Round-Trip Efficiency', `${currentAsset?.round_trip_efficiency || 0}%`],
          ['Maximum Daily Cycles', `${currentAsset?.max_daily_cycles || 0}`],
        ].map(([label, value], index) => (
          <KeyValueDisplay label={label} value={value} key={index} />
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col p-4 gap-4">
      <div className="grid grid-cols-2 w-full gap-4 gap-x-20 gap-y-4">
        <TextInput
          value={values.max_charge_rate}
          error={errors.max_charge_rate}
          allowFloat
          touched={touched.max_charge_rate}
          onChange={handleChange('max_charge_rate')}
          onBlur={handleFloatBlurWithTrailingDotFormat('max_charge_rate', handleBlur, setFieldValue)}
          onFocus={handleBlur('max_charge_rate')}
          preventLeadingSpace
          preventTrailingSpace
          placeholder="e.g., 4.2"
          wrapperClassName="bg-white!"
          label="Maximum Charging Rate (MW)"
          required
        />
        <TextInput
          value={values.max_discharge_rate}
          error={errors.max_discharge_rate}
          allowFloat
          touched={touched.max_discharge_rate}
          onChange={handleChange('max_discharge_rate')}
          onBlur={handleFloatBlurWithTrailingDotFormat('max_discharge_rate', handleBlur, setFieldValue)}
          onFocus={handleBlur('max_discharge_rate')}
          preventLeadingSpace
          preventTrailingSpace
          placeholder="e.g., 7.5"
          wrapperClassName="bg-white!"
          label="Maximum Discharging Rate (MW)"
          required
        />
        <TextInput
          value={powerAsymmetryRatio ?? ''}
          allowFloat
          placeholder="Auto calculated"
          label="Power Asymmetry Ratio"
          wrapperClassName="min-h-10"
          info
          infoMessage={
            'Power asymmetry ratio cannot \nbe edited manually. It is\nautomatically calculated from\nMaximum Discharging Rate (MW)\nand Maximum Charging Rate (MW)'
          }
          readonly
        />
        <TextInput
          value={values.usable_capacity}
          error={errors.usable_capacity}
          allowFloat
          touched={touched.usable_capacity}
          onChange={handleChange('usable_capacity')}
          onBlur={handleFloatBlurWithTrailingDotFormat('usable_capacity', handleBlur, setFieldValue)}
          onFocus={handleBlur('usable_capacity')}
          preventLeadingSpace
          preventTrailingSpace
          placeholder="e.g., 8.4"
          label="Usable Capacity (MWh)"
          wrapperClassName="bg-white!"
          required
        />
        <TextInput
          value={values.min_soc}
          error={errors.min_soc}
          integer
          touched={touched.min_soc}
          onChange={handleChange('min_soc')}
          onBlur={handleFloatBlurWithTrailingDotFormat('min_soc', handleBlur, setFieldValue)}
          onFocus={handleBlur('min_soc')}
          preventLeadingSpace
          preventTrailingSpace
          placeholder="e.g., 5"
          label="Minimum SOC (%)"
          wrapperClassName="bg-white!"
          required
        />
        <TextInput
          value={values.max_soc}
          error={errors.max_soc}
          integer
          touched={touched.max_soc}
          onChange={handleChange('max_soc')}
          onBlur={handleFloatBlurWithTrailingDotFormat('max_soc', handleBlur, setFieldValue)}
          onFocus={handleBlur('max_soc')}
          preventLeadingSpace
          preventTrailingSpace
          placeholder="e.g., 95"
          label="Maximum SOC (%)"
          wrapperClassName="bg-white!"
          required
        />
        <TextInput
          value={values.round_trip_efficiency}
          error={errors.round_trip_efficiency}
          allowFloat
          touched={touched.round_trip_efficiency}
          onChange={handleChange('round_trip_efficiency')}
          onBlur={handleFloatBlurWithTrailingDotFormat('round_trip_efficiency', handleBlur, setFieldValue)}
          onFocus={handleBlur('round_trip_efficiency')}
          preventLeadingSpace
          preventTrailingSpace
          placeholder="e.g., 88"
          wrapperClassName="bg-white!"
          label="Round-Trip Efficiency (%)"
          required
        />
        <TextInput
          value={values.max_daily_cycles}
          error={errors.max_daily_cycles}
          allowFloat
          touched={touched.max_daily_cycles}
          onChange={handleChange('max_daily_cycles')}
          onBlur={handleFloatBlurWithTrailingDotFormat('max_daily_cycles', handleBlur, setFieldValue)}
          onFocus={handleBlur('max_daily_cycles')}
          preventLeadingSpace
          preventTrailingSpace
          wrapperClassName="bg-white!"
          placeholder="e.g., 1.5"
          label="Maximum Daily Cycles"
          required
        />
      </div>
      <div className="flex gap-3 self-center">
        <Button variant="secondary" className="px-8" onClick={handleCancelEdit}>
          Cancel
        </Button>
        <Button disabled={!isValid || !dirty} className="px-8" onClick={() => handleSubmit()}>
          Save & Continue
        </Button>
      </div>
    </div>
  );
};

