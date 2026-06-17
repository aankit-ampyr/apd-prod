import * as Yup from 'yup';
import {getErrorMessage} from './getMessages';
import { emailRegex, nameRegex } from '@/constants';

export const AddUserSchema = Yup.object().shape({
  email: Yup.string().matches(emailRegex, getErrorMessage('E-10008')).required(getErrorMessage('E-10003')),
  name: Yup.string().min(2, getErrorMessage('E-10028')).max(100, getErrorMessage('E-10028')).matches(nameRegex, getErrorMessage('E-10006')).required(getErrorMessage('E-10002')),
  role: Yup.number().required(getErrorMessage('E-10004')),
  platform: Yup.array()
  .of(Yup.number()).min(1, getErrorMessage('E-10023')).required(getErrorMessage('E-10023')),
  status: Yup.boolean()
});

export const EditUserSchema = Yup.object().shape({
  email: Yup.string().matches(emailRegex, getErrorMessage('E-10008')).required(getErrorMessage('E-10003')),
  name: Yup.string().min(2, getErrorMessage('E-10028')).max(100, getErrorMessage('E-10028')).matches(nameRegex, getErrorMessage('E-10006')).required(getErrorMessage('E-10002')),
  role: Yup.number().required(getErrorMessage('E-10004')),
  platform: Yup.array()
  .of(Yup.number()).min(1, getErrorMessage('E-10023')).required(getErrorMessage('E-10023')),
  status: Yup.boolean()
});


export const EditOrganizationSchema = Yup.object().shape({
  name: Yup.string().min(2, getErrorMessage('E-10029')).max(100, getErrorMessage('E-10029')).matches(nameRegex, getErrorMessage('E-10020')).required(getErrorMessage('E-10018')),
  status: Yup.boolean()
});

export const AddOrganizationSchema = Yup.object().shape({
  name: Yup.string().min(2, getErrorMessage('E-10029')).max(100, getErrorMessage('E-10029')).matches(nameRegex, getErrorMessage('E-10020')).required(getErrorMessage('E-10018')),
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