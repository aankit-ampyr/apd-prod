import * as Yup from 'yup';
import {getErrorMessage} from './getMessages';
import {DigestFrequency, DigestScope, emailRegex, nameRegex} from '@/constants';
import {assetNameRegex, assetLocationRegex} from '@lazarus/react-common/constants/regex';

export const AddUserSchema = Yup.object().shape({
  email: Yup.string().matches(emailRegex, getErrorMessage('E-10008')).required(getErrorMessage('E-10003')),
  name: Yup.string()
    .min(2, getErrorMessage('E-10028'))
    .max(100, getErrorMessage('E-10028'))
    .matches(nameRegex, getErrorMessage('E-10006'))
    .required(getErrorMessage('E-10002')),
  role: Yup.number().required(getErrorMessage('E-10004')),
  platform: Yup.array().of(Yup.number()).min(1, getErrorMessage('E-10023')).required(getErrorMessage('E-10023')),
  status: Yup.boolean(),
});

export const EditUserSchema = Yup.object().shape({
  email: Yup.string().matches(emailRegex, getErrorMessage('E-10008')).required(getErrorMessage('E-10003')),
  name: Yup.string()
    .min(2, getErrorMessage('E-10028'))
    .max(100, getErrorMessage('E-10028'))
    .matches(nameRegex, getErrorMessage('E-10006'))
    .required(getErrorMessage('E-10002')),
  role: Yup.number().required(getErrorMessage('E-10004')),
  platform: Yup.array().of(Yup.number()).min(1, getErrorMessage('E-10023')).required(getErrorMessage('E-10023')),
  status: Yup.boolean(),
});

export const EditOrganizationSchema = Yup.object().shape({
  name: Yup.string()
    .min(2, getErrorMessage('E-10029'))
    .max(100, getErrorMessage('E-10029'))
    .matches(nameRegex, getErrorMessage('E-10020'))
    .required(getErrorMessage('E-10018')),
  status: Yup.boolean(),
});

export const AddOrganizationSchema = Yup.object().shape({
  name: Yup.string()
    .min(2, getErrorMessage('E-10029'))
    .max(100, getErrorMessage('E-10029'))
    .matches(nameRegex, getErrorMessage('E-10020'))
    .required(getErrorMessage('E-10018')),
});

export const AssignOrganizationSchema = Yup.object().shape({
  organization: Yup.number().required(getErrorMessage('E-10005')),
});

export const LoginSchema = Yup.object().shape({
  email: Yup.string().matches(emailRegex, getErrorMessage('E-10008')).required(getErrorMessage('E-10003')),
});

// OTP validation: 6-digit numeric code
export const OTPSchema = Yup.object().shape({
  otp: Yup.string()
    .matches(/^\d{6}$/, getErrorMessage('E-10041'))
    .required(getErrorMessage('E-10040')),
});

export const digestValidationSchema = Yup.object().shape({
  name: Yup.string()
    .required(getErrorMessage('E-10046'))
    .min(2, getErrorMessage('E-10047'))
    .max(100, getErrorMessage('E-10047')),

  scope: Yup.number().required(getErrorMessage('E-10049')),

  frequency: Yup.number().required(getErrorMessage('E-10050')),

  // schedule: E-10051 / E-10053 / E-10054
  schedule: Yup.object()
    .shape({
      time: Yup.string().required(getErrorMessage('E-10051')),
      weekday: Yup.number().nullable(),
      day_of_month: Yup.number().nullable(),
    })
    .test('schedule-weekday-required', getErrorMessage('E-10053'), function (schedule) {
      const frequency = this.parent?.frequency;
      if (frequency !== DigestFrequency.Weekly) return true;
      return typeof schedule?.weekday === 'number';
    })
    .test('schedule-day-of-month-required', getErrorMessage('E-10054'), function (schedule) {
      const frequency = this.parent?.frequency;
      if (frequency !== DigestFrequency.Monthly) return true;
      return typeof schedule?.day_of_month === 'number';
    }),

  recipients: Yup.array()
    .of(Yup.number())
    .when('scope', {
      is: DigestScope['Portfolio-wide'],
      then: schema => schema,
      otherwise: schema => schema.min(1, getErrorMessage('E-10052')).required(getErrorMessage('E-10052')),
    }),

  resource_id: Yup.array()
    .of(Yup.number())
    .nullable()
    .when('scope', {
      is: DigestScope['Portfolio-wide'],
      then: schema => schema.nullable(),
      otherwise: schema => schema.min(1, getErrorMessage('E-10055')).required(getErrorMessage('E-10055')),
    }),
});

// =============================== Asset Onboarding ===============================
export const AssetOnboardingSchema = Yup.object().shape({
  name: Yup.string()
    .required(getErrorMessage('E-10059'))
    .min(2, getErrorMessage('E-10057'))
    .max(150, getErrorMessage('E-10057'))
    .matches(assetNameRegex, getErrorMessage('E-10058')),
  type: Yup.number().required(getErrorMessage('E-10061')),
  capacity: Yup.string()
    .required(getErrorMessage('E-10062'))
    .test('greater-than-zero', getErrorMessage('E-10064'), value => {
      if (!value) return true;
      return parseFloat(value) > 0;
    })
    .test('max-two-decimals', getErrorMessage('E-10065'), value => {
      if (!value) return true;
      const parts = value.split('.');
      return parts.length === 1 || parts[1]?.length <= 2;
    })
    .test('valid-capacity-range', getErrorMessage('E-10056'), value => {
      const num = parseFloat(value || '0');
      return num > 0 && num < 10000;
    }),
  location: Yup.string()
    .required(getErrorMessage('E-10066'))
    .min(2, getErrorMessage('E-10068'))
    .max(150, getErrorMessage('E-10068'))
    .matches(assetLocationRegex, getErrorMessage('E-10067')),
  country_id: Yup.number().required(getErrorMessage('E-10069')),
  organization_id: Yup.number().required(getErrorMessage('E-10005')),
});

const hasTrailingDot = (value: string) => {
  if (!value) return true;
  return !/\.$/.test(value); // fails if ends with dot
};

const maxTwoDecimals = (value: string) => {
  if (!value) return true;
  // If value ends with a dot or is not a valid number format, return false
  if (/\.$/.test(value) || !/^\d+(\.\d*)?$/.test(value)) {
    return false;
  }
  // If value has more than 2 decimals, return false
  if (/^\d+\.\d{3,}$/.test(value)) {
    return false;
  }
  return true;
};

export const AssetOptmizationParamsSchema = Yup.object().shape({
  max_charge_rate: Yup.string()
    .required(getErrorMessage('E-10084'))
    .test('is-number', getErrorMessage('E-10070'), value => !value || !isNaN(Number(value)))
    .test('no-trailing-dot', getErrorMessage('E-10105'), hasTrailingDot)
    .test('max-decimals', getErrorMessage('E-10104'), maxTwoDecimals)
    .test('greater-than-zero', getErrorMessage('E-10072'), value => !value || parseFloat(value) > 0)
    .test(
      'in-range',
      getErrorMessage('E-10080'),
      value => !value || (parseFloat(value) >= 0.01 && parseFloat(value) <= 1000),
    ),

  max_discharge_rate: Yup.string()
    .required(getErrorMessage('E-10103'))
    .test('is-number', getErrorMessage('E-10071'), value => !value || !isNaN(Number(value)))
    .test('no-trailing-dot', getErrorMessage('E-10105'), hasTrailingDot)
    .test('max-decimals', getErrorMessage('E-10104'), maxTwoDecimals)
    .test('greater-than-zero', getErrorMessage('E-10072'), value => !value || parseFloat(value) > 0)
    .test(
      'in-range',
      getErrorMessage('E-10081'),
      value => !value || (parseFloat(value) >= 0.01 && parseFloat(value) <= 1000),
    ),

  usable_capacity: Yup.string()
    .required(getErrorMessage('E-10103'))
    .test('is-number', getErrorMessage('E-10073'), value => !value || !isNaN(Number(value)))
    .test('no-trailing-dot', getErrorMessage('E-10105'), hasTrailingDot)
    .test('max-decimals', getErrorMessage('E-10104'), maxTwoDecimals)
    .test('greater-than-zero', getErrorMessage('E-10072'), value => !value || parseFloat(value) > 0)
    .test(
      'in-range',
      getErrorMessage('E-10082'),
      value => !value || (parseFloat(value) >= 0.01 && parseFloat(value) <= 10000),
    ),

  min_soc: Yup.string()
    .required(getErrorMessage('E-10103'))
    .test('is-number', getErrorMessage('E-10074'), value => !value || !isNaN(Number(value)))
    .test('no-trailing-dot', getErrorMessage('E-10105'), hasTrailingDot)
    .test('max-decimals', getErrorMessage('E-10104'), maxTwoDecimals)
    .test(
      'in-range',
      getErrorMessage('E-10074'),
      value => !value || (parseFloat(value) >= 0 && parseFloat(value) <= 100),
    ),

  max_soc: Yup.string()
    .required(getErrorMessage('E-10103'))
    .test('is-number', getErrorMessage('E-10083'), value => !value || !isNaN(Number(value)))
    .test('no-trailing-dot', getErrorMessage('E-10105'), hasTrailingDot)
    .test('max-decimals', getErrorMessage('E-10104'), maxTwoDecimals)
    .test(
      'in-range',
      getErrorMessage('E-10083'),
      value => !value || (parseFloat(value) >= 0 && parseFloat(value) <= 100),
    )
    .test('greater-than-min-soc', getErrorMessage('E-10075'), function (value) {
      const {min_soc} = this.parent;
      if (!value || !min_soc || isNaN(Number(value)) || isNaN(Number(min_soc))) return true;
      return parseFloat(value) > parseFloat(min_soc);
    }),

  round_trip_efficiency: Yup.string()
    .required(getErrorMessage('E-10103'))
    .test('is-number', getErrorMessage('E-10076'), value => !value || !isNaN(Number(value)))
    .test('no-trailing-dot', getErrorMessage('E-10105'), hasTrailingDot)
    .test('max-decimals', getErrorMessage('E-10104'), maxTwoDecimals)
    .test(
      'in-range',
      getErrorMessage('E-10076'),
      value => !value || (parseFloat(value) >= 0 && parseFloat(value) <= 100),
    ),

  max_daily_cycles: Yup.string()
    .required(getErrorMessage('E-10103'))
    .test('is-number', getErrorMessage('E-10077'), value => !value || !isNaN(Number(value)))
    .test('no-trailing-dot', getErrorMessage('E-10105'), hasTrailingDot)
    .test('max-decimals', getErrorMessage('E-10104'), maxTwoDecimals)
    .test('greater-than-zero', getErrorMessage('E-10072'), value => !value || parseFloat(value) > 0)
    .test(
      'in-range',
      getErrorMessage('E-10078'),
      value => !value || (parseFloat(value) > 0 && parseFloat(value) <= 20),
    ),
});
