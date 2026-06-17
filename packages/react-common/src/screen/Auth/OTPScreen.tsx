import React, { useEffect } from "react";
import { AuthLayout } from "../../components/AuthLayout";
import { Button, Text, OtpInput, Icon } from "../../ui-kit";
import { Images } from "../../assets";
import { useFormik } from "formik";
import { useSecondsTimer } from "../../hooks";
import { otpLifeSpan } from "../../constants";
import { cn, formatTime } from "../../utils";

interface OTPScreenProps {
  validationSchema: any;
  handleOnSubmit: (otp: string) => void;
  email: string;
  attempts: number;
  isLoading?: boolean;
  errorMessage?: string | null;
  recievedAt: string;
  limitReached?: boolean;
  handleBack: () => void;
  onResend?: () => void;
  setValueRef?: any;
  onOtpChange?: () => void;
}

type InitalState = {
  otp: string;
};
const initialValues: InitalState = {
  otp: "",
};

export const OTPScreen: React.FC<OTPScreenProps> = (props) => {
  const {
    validationSchema,
    handleOnSubmit,
    email,
    attempts,
    recievedAt,
    isLoading = false,
    errorMessage,
    limitReached = false,
    handleBack,
    onResend,
    setValueRef,
    onOtpChange,
  } = props;
  const remainingTime = useSecondsTimer({
    refferenceTimeStamp: recievedAt,
    timerLimit: otpLifeSpan,
  });

  const {
    values,
    errors,
    touched,
    handleChange,
    handleBlur,
    handleSubmit,
    isValid,
    setFieldValue,
    dirty,
  } = useFormik<InitalState>({
    initialValues,
    onSubmit: ({ otp }) => handleOnSubmit(otp),
    validationSchema,
  });

  const error = errorMessage || errors.otp;

  const setter = (value: string) => {
    setFieldValue("otp", value);
  };

  useEffect(() => {
    if (setValueRef && setValueRef.current) {
      setValueRef.current = setter;
    }
  }, []);

  return (
    <AuthLayout>
      <button className="cursor-pointer" onClick={handleBack}>
        <Icon name="arrow-left" />
      </button>
      <div className="relative flex flex-col items-center px-6 w-fit mx-auto mb-4">
        <div className="flex items-center gap-2">
          <img src={Images.logo} className="w-12 h-8 object-contain" />
          <Text
            variant="h1"
            className="text-xl font-InterSemiBold! text-secondary!"
          >
            LAZARUS
          </Text>
        </div>

        <Text variant="caption" className="text-primary! self-end">
          by AMPYR
        </Text>
      </div>

      <div className="flex flex-col gap-4 items-center">
        <Text variant="h3">Enter verification code</Text>
        <Text variant="caption" className="text-center">We sent a 6-digit code to {email}.</Text>
        <OtpInput
          className="w-80"
          value={values.otp}
          error={errors.otp}
          touched={touched.otp}
          onChange={(e) => {
            handleChange("otp")(e);
            onOtpChange?.();
          }}
          onBlur={handleBlur("otp")}
        />
        {error && (
          <Text variant="caption" className="text-error-text! max-w-80">
            {error}
          </Text>
        )}
        {limitReached ? null : (
          <Text variant="small">
            Code expires in{" "}
            <span>{formatTime(Math.max(remainingTime, 0))}</span>
          </Text>
        )}
        <Button
          className="w-80 justify-center"
          disabled={!isValid || !dirty || isLoading || limitReached}
          onClick={() => handleSubmit()}
        >
          {isLoading ? "Verifying..." : "Verify OTP"}
        </Button>

        <Text variant="small" className="text-text-secondary!">
          Didn't receive the code?
        </Text>
        <button
          className={cn("cursor-pointer", !attempts && "cursor-not-allowed")}
          onClick={attempts ? onResend : undefined}
          disabled={!attempts}
        >
          <Text
            variant="btnMedium"
            className={cn(
              attempts ? "text-primary! hover:underline" : "text-disabled!",
            )}
          >
            {attempts
              ? `Resend OTP (${attempts} remaining)`
              : "Resend limit reached"}
          </Text>
        </button>
      </div>
    </AuthLayout>
  );
};
