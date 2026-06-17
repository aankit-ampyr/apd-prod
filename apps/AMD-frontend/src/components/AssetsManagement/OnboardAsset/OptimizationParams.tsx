import {AssetSteps, NA} from '@/constants';
import {assetError, assetSuccess, currentSelectedAsset} from '@/services/redux/selectors';
import {assetOptimizationParamRequest} from '@/services/redux/slice';
import {Button, Text, TextInput} from '@/ui-kits';
import {
  AssetOptmizationParamsSchema,
  ErrorCodes,
  handleFloatBlurWithTrailingDotFormat,
  SuccessCodes,
} from '@/utils';
import {useFormik} from 'formik';
import React, {useEffect, useState} from 'react';
import {useDispatch, useSelector} from 'react-redux';

type FormInitalValues = {
  max_charge_rate: string;
  max_discharge_rate: string;
  usable_capacity: string;
  min_soc: string;
  max_soc: string;
  round_trip_efficiency: string;
  max_daily_cycles: string;
};

const initialValues: FormInitalValues = {
  max_charge_rate: '4.2',
  max_discharge_rate: '7.5',
  usable_capacity: '8.4',
  max_daily_cycles: '1.5',
  max_soc: '95',
  min_soc: '5',
  round_trip_efficiency: '87',
};

interface BasicInfoProps {
  onBack: () => void;
  mode: 'add' | 'edit';
}
export function OptimizationParams(props: BasicInfoProps) {
  const {onBack, mode} = props;
  const [formValues, setFormValues] = useState<FormInitalValues | null>(null);

  // ===============
  // hooks
  // ===============
  const dispatch = useDispatch();
  const {isValid, values, errors, touched, handleSubmit, handleBlur, handleChange, resetForm, setFieldValue} = useFormik({
    initialValues: formValues || initialValues,
    onSubmit: handleOnboardAsset,
    validationSchema: AssetOptmizationParamsSchema,
    enableReinitialize: true,
  });

  // ===============
  // selectors
  // ===============
  const failure = useSelector(assetError) as ErrorCodes;
  const success = useSelector(assetSuccess) as SuccessCodes;
  const currentAsset = useSelector(currentSelectedAsset);

  // ===============
  // state
  // ===============
  const [canEdit, setCanEdit] = useState<boolean>(true);
  const currentStep = currentAsset?.current_step ?? 0;

  const isStepLocked = currentStep < AssetSteps.BasicInformation;

  // ===============
  // function
  // ===============
  function handleOnboardAsset(values: FormInitalValues) {
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

  const powerAsymmetryRatio = () => {
    if (values.max_discharge_rate && values.max_discharge_rate) {
      const computed_ratio = Number.parseFloat(values.max_discharge_rate) / Number.parseFloat(values.max_charge_rate);
      if (isNaN(computed_ratio)) {
        return NA;
      }
      return computed_ratio.toPrecision(2).toString();
    }
    return '';
  };

  function handleCancel(){
    if ((currentAsset?.current_step ?? 0) < AssetSteps.OptimizationConfiguration){
      onBack();
    }
    else{
      resetForm();
      setCanEdit(false);
    }
  }

  // ===================
  // side effects
  // ===================
  useEffect(() => {
    if (success && success === 'S-10027') {
      setCanEdit(false);
    }
  }, [failure, success]);

  useEffect(() => {
    if (currentAsset && mode === 'edit') {
      setFormValues({
        max_charge_rate: String(currentAsset.max_charging_rate ?? '4.2'),
        min_soc: String(currentAsset.soc_min ?? '5'),
        max_soc: String(currentAsset.soc_max ?? '95'),
        max_daily_cycles: String(currentAsset.max_daily_cycles ?? '1.5'),
        max_discharge_rate: String(currentAsset.max_discharging_rate ?? '7.5'),
        round_trip_efficiency: String(currentAsset.round_trip_efficiency ?? '87'),
        usable_capacity: String(currentAsset.usable_capacity ?? '8.4'),
      });
    }
  }, [currentAsset, mode]);

  useEffect(() => {
    if ((currentAsset?.current_step ?? 0) >= AssetSteps.OptimizationConfiguration) {
      setCanEdit(false);
    }
  }, [currentAsset]);

  return (
    <div className="grow items-center flex flex-col justify-evenly gap-8 px-20 py-4">
      <div className="flex flex-col items-center gap-2">
        <Text variant="h3" className="text-center">
          Optimization Parameters
        </Text>
        <Text variant="caption" className="text-center text-text-secondary!">
          Configure optimization settings for this asset.
        </Text>
      </div>

      <div className="grid grid-cols-2 w-full max-w-230 gap-4 mx-8 gap-x-20 gap-y-4">
        <TextInput
          value={values.max_charge_rate}
          error={errors.max_charge_rate}
          allowFloat
          disabled={!canEdit || isStepLocked}
          touched={touched.max_charge_rate}
          onChange={handleChange('max_charge_rate')}
          onBlur={handleFloatBlurWithTrailingDotFormat('max_charge_rate', handleBlur, setFieldValue)}
          onFocus={handleBlur('max_charge_rate')}
          preventLeadingSpace
          preventTrailingSpace
          placeholder="e.g., 4.2"
          wrapperClassName='bg-white!'
          label="Maximum Charging Rate (MW)"
          required
        />
        <TextInput
          value={values.max_discharge_rate}
          error={errors.max_discharge_rate}
          allowFloat
          disabled={!canEdit || isStepLocked}
          touched={touched.max_discharge_rate}
          onChange={handleChange('max_discharge_rate')}
          onBlur={handleFloatBlurWithTrailingDotFormat('max_discharge_rate', handleBlur, setFieldValue)}
          onFocus={handleBlur('max_discharge_rate')}
          preventLeadingSpace
          preventTrailingSpace
          placeholder="e.g., 7.5"
          wrapperClassName='bg-white!'
          label="Maximum Discharging Rate (MW)"
          required
        />
        <TextInput
          value={powerAsymmetryRatio()}
          allowFloat
          disabled={!canEdit || isStepLocked}
          placeholder="Auto calculated"
          label="Power Asymmetry Ratio"
          wrapperClassName="min-h-10 bg-white! border!"
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
          disabled={!canEdit || isStepLocked}
          touched={touched.usable_capacity}
          onChange={handleChange('usable_capacity')}
          onBlur={handleFloatBlurWithTrailingDotFormat('usable_capacity', handleBlur, setFieldValue)}
          onFocus={handleBlur('usable_capacity')}
          preventLeadingSpace
          preventTrailingSpace
          placeholder="e.g., 8.4"
          label="Usable Capacity (MWh)"
          wrapperClassName='bg-white!'
          required
        />
        <TextInput
          value={values.min_soc}
          error={errors.min_soc}
          integer
          disabled={!canEdit || isStepLocked}
          touched={touched.min_soc}
          onChange={handleChange('min_soc')}
          onBlur={handleFloatBlurWithTrailingDotFormat('min_soc', handleBlur, setFieldValue)}
          onFocus={handleBlur('min_soc')}
          preventLeadingSpace
          preventTrailingSpace
          placeholder="e.g., 5"
          label="Minimum SOC (%)"
          wrapperClassName='bg-white!'
          required
        />
        <TextInput
          value={values.max_soc}
          error={errors.max_soc}
          integer
          disabled={!canEdit || isStepLocked}
          touched={touched.max_soc}
          onChange={handleChange('max_soc')}
          onBlur={handleFloatBlurWithTrailingDotFormat('max_soc', handleBlur, setFieldValue)}
          onFocus={handleBlur('max_soc')}
          preventLeadingSpace
          preventTrailingSpace
          placeholder="e.g., 95"
          label="Maximum SOC (%)"
          wrapperClassName='bg-white!'
          required
        />
        <TextInput
          value={values.round_trip_efficiency}
          error={errors.round_trip_efficiency}
          allowFloat
          disabled={!canEdit || isStepLocked}
          touched={touched.round_trip_efficiency}
          onChange={handleChange('round_trip_efficiency')}
          onBlur={handleFloatBlurWithTrailingDotFormat('round_trip_efficiency', handleBlur, setFieldValue)}
          onFocus={handleBlur('round_trip_efficiency')}
          preventLeadingSpace
          preventTrailingSpace
          placeholder="e.g., 88"
          wrapperClassName='bg-white!'
          label="Round-Trip Efficiency (%)"
          required
        />
        <TextInput
          value={values.max_daily_cycles}
          error={errors.max_daily_cycles}
          allowFloat
          disabled={!canEdit || isStepLocked}
          touched={touched.max_daily_cycles}
          onChange={handleChange('max_daily_cycles')}
          onBlur={handleFloatBlurWithTrailingDotFormat('max_daily_cycles', handleBlur, setFieldValue)}
          onFocus={handleBlur('max_daily_cycles')}
          preventLeadingSpace
          preventTrailingSpace
          wrapperClassName='bg-white!'
          placeholder="e.g., 1.5"
          label="Maximum Daily Cycles"
          required
        />
      </div>

      {canEdit && (
        <div className="flex gap-3 self-center">
          <Button variant="secondary" className='px-8' onClick={handleCancel} disabled={isStepLocked}>
            Cancel
          </Button>
          <Button disabled={!isValid || isStepLocked} className='px-8' onClick={() => handleSubmit()}>
            Save & Continue
          </Button>
        </div>
      )}

      {!canEdit && (
        <Button onClick={() => setCanEdit(true)} variant="secondary" className="self-center px-10">
          Edit
        </Button>
      )}
    </div>
  );
}
