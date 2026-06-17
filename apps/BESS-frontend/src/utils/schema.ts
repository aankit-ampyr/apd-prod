import * as Yup from 'yup';
import { getErrorMessage } from './getMessages';
import { emailRegex, LoadProfilePattern } from '@/constants';


export const LoginSchema = Yup.object().shape({
  email: Yup.string().matches(emailRegex, getErrorMessage('E-10008')).required(getErrorMessage('E-10003')),
});

// OTP validation: 6-digit numeric code
export const OTPSchema = Yup.object().shape({
  otp: Yup.string()
    .matches(/^\d{6}$/, getErrorMessage('E-10041'))
    .required(getErrorMessage('E-10040')),
});

// Load Profile Configuration Schema
export const LoadProfileSchema = Yup.object().shape({
  pattern: Yup.number()
    .nullable()
    .required(getErrorMessage('E-20008')), // Missing required request parameter

  load_mw: Yup.string()
    .nullable()
    .when('pattern', {
      is: (pattern: number) => pattern !== LoadProfilePattern['Custom Window'] && pattern !== null,
      then: schema => schema
        .required(getErrorMessage('E-20008'))
        .test('valid-load', getErrorMessage('E-20034'), (value) => {
          if (value === '' || value === null || value === undefined) return true; // let required() handle empty
          const num = Number(value);
          return !isNaN(num) && num >= 1 && num <= 500;
        }),
      otherwise: schema => schema.nullable(),
    }),

  start_time: Yup.string()
    .nullable()
    .when('pattern', {
      is: (pattern: number) => [
        LoadProfilePattern['Day Only'],
        LoadProfilePattern['Night Only'],
        LoadProfilePattern['Seasonal Pattern'],
      ].includes(pattern),
      then: schema => schema.required(getErrorMessage('E-20008')),
      otherwise: schema => schema.nullable(),
    }),

  end_time: Yup.string()
    .nullable()
    .when('pattern', {
      is: (pattern: number) => [
        LoadProfilePattern['Day Only'],
        LoadProfilePattern['Night Only'],
        LoadProfilePattern['Seasonal Pattern'],
      ].includes(pattern),
      then: schema => schema
        .required(getErrorMessage('E-20008'))
        .test('not-same-as-start', getErrorMessage('E-20036'), function (value) {
          const { start_time } = this.parent;
          if (!value || !start_time) return true;
          return value !== start_time;
        }),
      otherwise: schema => schema.nullable(),
    }),

  start_month: Yup.number()
    .nullable()
    .when('pattern', {
      is: LoadProfilePattern['Seasonal Pattern'],
      then: schema => schema.required(getErrorMessage('E-20008')),
      otherwise: schema => schema.nullable(),
    }),

  end_month: Yup.number()
    .nullable()
    .when('pattern', {
      is: LoadProfilePattern['Seasonal Pattern'],
      then: schema => schema
        .required(getErrorMessage('E-20008'))
        .test('valid-range', getErrorMessage('E-20017'), function (value) {
          const { start_month } = this.parent;
          if (!value || !start_month) return true;
          return value >= start_month;
        }),
      otherwise: schema => schema.nullable(),
    }),

  windows: Yup.array()
    .of(
      Yup.object().shape({
        start_time: Yup.string().nullable(),
        end_time: Yup.string()
          .nullable()
          .test('window-not-same-as-start', getErrorMessage('E-20036'), function (value) {
            const { start_time } = this.parent;
            if (!value || !start_time) return true;
            return value !== start_time;
          }),
        load_mw: Yup.string()
          .nullable()
          .test('valid-window-load', getErrorMessage('E-20034'), (value) => {
            if (!value) return true; // Allow empty for optional windows
            const num = Number(value);
            return !isNaN(num) && num >= 1 && num <= 500;
          }),
      })
    )
    .when('pattern', {
      is: LoadProfilePattern['Custom Window'],
      then: schema => schema.test(
        'at-least-one-valid-window',
        getErrorMessage('E-20008'),
        (windows) => {
          if (!windows) return false;
          return windows.some(
            (w) => w.start_time && w.end_time && w.load_mw
          );
        }
      ),
      otherwise: schema => schema.nullable(),
    }),
});


export const createProjectValidationSchema = Yup.object().shape({
  name: Yup.string()
    .required('Project name is required')
    .min(3, 'Project name must be at least 3 characters')
    .max(100, 'Project name cannot exceed 100 characters'),

  description: Yup.string()
    .required('Description is required')
    .min(1, 'Description cannot be empty')
    .max(1000, 'Description cannot exceed 1000 characters'),

  responsibleUser: Yup.number()
    .nullable()
    .required('Please select a responsible user'),

  adminUsers: Yup.array().of(Yup.number()),
  analystUsers: Yup.array().of(Yup.number()),
  viewerUsers: Yup.array().of(Yup.number()),
  managementUsers: Yup.array().of(Yup.number()),

  status: Yup.boolean(),
}).test(
  'at-least-one-user',
  'Select at least one user',
  function (values) {
    const hasUser =
      values?.adminUsers?.length ||
      values?.analystUsers?.length ||
      values?.viewerUsers?.length ||        
      values?.managementUsers?.length;

    if (hasUser) return true;

    return this.createError({
      path: 'adminUsers',
      message: 'Select at least one user',
    });
  }
);