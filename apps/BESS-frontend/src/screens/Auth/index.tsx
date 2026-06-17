import { LoginScreen as CommonLoginScreen } from "@lazarus/react-common/screen";
import { ErrorCodes, getSuccessMessage, LoginSchema, SuccessCodes, getErrorMessage } from "@/utils";
import { useDispatch, useSelector } from "react-redux";
import { loginOtpRequest, resetAuthMessage, resetAuthSession } from "@/services/redux/slice";
import { authFailureStatus, authSessionEndReasonSelector, authSessionOtpLimitExceeded, authSuccessStatus, isAuthLoading } from "@/services/redux/selectors";
import { useEffect, useState } from "react";
import { useToast } from "@/hooks";

export { OTPVerificationScreen } from "./OTPVerificationScreen";

export const LoginScreen = () => {
  // =============
  // Hooks
  // =============
  const dispatch = useDispatch();
  const {showToast} = useToast();
  
  // =============
  // Selectors
  // =============
  const isLoading = useSelector(isAuthLoading);
  const authFailure = useSelector(authFailureStatus) as ErrorCodes;
  const authSuccess = useSelector(authSuccessStatus) as SuccessCodes;
  const limitExceeded = useSelector(authSessionOtpLimitExceeded);
  const sessionEndReason = useSelector(authSessionEndReasonSelector);

  // =============
  // Variables
  // =============
  const [errorMessage, setErrorMessage] = useState<string>('');

  // =============
  // Handlers
  // =============
  const handleOnSubmit = (email: string) => {
    setErrorMessage('');
    dispatch(loginOtpRequest({ email }));
  }
  // =============
  // side effects
  // =============
  useEffect(() => {
    if (authFailure) {
      if (authFailure === 'E-10038') {
        setErrorMessage(getErrorMessage('E-10038'));
      }else{
        showToast(getErrorMessage(authFailure), 'error');
      }
    }
    if (authSuccess) {
      setErrorMessage('');
      showToast(getSuccessMessage(authSuccess), 'success');
    }
    return () => {dispatch(resetAuthMessage())}
  }, [authSuccess, authFailure])

  useEffect(() => {
    if (limitExceeded){
      dispatch(resetAuthSession())
    }
  }, [limitExceeded])

  return (
    <CommonLoginScreen
      validationSchema={LoginSchema}
      handleOnSubmit={handleOnSubmit}
      isLoading={isLoading}
      errorMessage={errorMessage}
      sessionEndReason={sessionEndReason}
    />
  );
};
