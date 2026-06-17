import {OTPScreen as CommonOTPScreen} from '@lazarus/react-common/screen';
import {ErrorCodes, getSuccessMessage, OTPSchema, SuccessCodes} from '@/utils';
import {useDispatch, useSelector} from 'react-redux';
import {verifyOtpRequest, resetAuthMessage, loginOtpRequest} from '@/services/redux/slice';
import {
  authFailureStatus,
  isAuthLoading,
  authSessionEmailSelector,
  authSessionOtpAttemptsSelector,
  authSuccessStatus,
  authSessionOtpRecievedAtSelector,
  authSessionOtpLimitExceeded,
} from '@/services/redux/selectors';
import {getErrorMessage} from '@/utils';
import {useEffect, useRef, useState} from 'react';
import {useNavigate} from 'react-router-dom';
import {Routes} from '@/navigation/Routes';
import {useToast} from '@/hooks';

export const OTPVerificationScreen = () => {
  // =============
  // Hooks
  // =============
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const {showToast} = useToast();

  // =============
  // Selectors
  // =============
  const isLoading = useSelector(isAuthLoading);
  const authFailure = useSelector(authFailureStatus) as ErrorCodes;
  const authSuccess = useSelector(authSuccessStatus) as SuccessCodes;
  const email = useSelector(authSessionEmailSelector);
  const otpAttempts = useSelector(authSessionOtpAttemptsSelector);
  const recievedAt = useSelector(authSessionOtpRecievedAtSelector);
  const limitExceeded = useSelector(authSessionOtpLimitExceeded);

  // =============
  // state
  // =============
  const otpSetterRef = useRef<((v: String) => void) | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');

  // =============
  // function
  // =============
  // Get error message from status code
  const handleOnSubmit = (otp: string) => {
    if (email) {
      dispatch(verifyOtpRequest({email, otp}));
    }
  };

  const handleResend = () => {
    if (email) {
      dispatch(loginOtpRequest({email}));
    }
  };

  const handleBack = () => {
    navigate(Routes.LOGIN);
  };

  // =============
  // side effects
  // =============
  // Redirect to login if no email in session
  useEffect(() => {
    if (!email) {
      navigate(Routes.LOGIN);
    }
  }, [email, navigate]);

  useEffect(() => {
    if (authFailure) {
      if (['E-10042', 'E-10043'].includes(authFailure)) {
        // Show incorrect/expired OTP error inline below the OTP field
        setErrorMessage(getErrorMessage(authFailure));
        if (otpSetterRef.current) {
          otpSetterRef.current('');
        }
      } else {
        // Show other errors as toast
        showToast(getErrorMessage(authFailure), 'error');
      }
    }
    if (authSuccess) {
      setErrorMessage(''); // Clear inline error on success
      showToast(getSuccessMessage(authSuccess), 'success');
    }
    return () => {
      dispatch(resetAuthMessage());
    };
  }, [authSuccess, authFailure]);

  return (
    <CommonOTPScreen
      validationSchema={OTPSchema}
      handleOnSubmit={handleOnSubmit}
      email={email || ''}
      attempts={Number(otpAttempts)}
      isLoading={isLoading}
      errorMessage={errorMessage}
      recievedAt={recievedAt}
      handleBack={handleBack}
      limitReached={limitExceeded}
      onResend={handleResend}
      onOtpChange={() => setErrorMessage('')}
    />
  );
};
