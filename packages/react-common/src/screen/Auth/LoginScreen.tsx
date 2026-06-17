import React, { useEffect } from "react";
import { AuthLayout } from "../../components/AuthLayout";
import { Button, Icon, Text, TextInput } from "../../ui-kit";
import { Images } from "../../assets";
import { useFormik } from "formik";
import { UserSessionEndReason } from "../../constants";

interface LoginScreenProps {
  validationSchema: any;
  handleOnSubmit: (email: string) => void;
  isLoading?: boolean;
  errorMessage?: string | null;
  sessionEndReason?: UserSessionEndReason | null;
}

type InitalState = {
  email: string;
};
const initialValues: InitalState = {
  email: "",
};

export const LoginScreen: React.FC<LoginScreenProps> = (props) => {
  const {
    validationSchema,
    handleOnSubmit,
    isLoading = false,
    errorMessage,
    sessionEndReason,
  } = props;

  // ===============
  // hooks
  // ===============
  const {
    values,
    errors,
    touched,
    handleChange,
    handleBlur,
    setFieldError,
    handleSubmit,
    isValid,
    dirty,
  } = useFormik<InitalState>({
    initialValues,
    onSubmit: ({ email }) => handleOnSubmit(email),
    validationSchema,
  });

  // ===============
  // useEffect
  // ===============
  useEffect(() => {
    setFieldError("email", errorMessage || "");
  }, [errorMessage, setFieldError]);

  return (
    <AuthLayout>
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

      {sessionEndReason && <SessionEndReasonBox sessionEndReason={sessionEndReason}/>}

      <div className="flex flex-col gap-4 items-center">
        <Text variant="h3" className="font-bold text-secondary!">
          Sign in to your account
        </Text>
        <Text variant="caption">
          Enter your registered email to receive a verification code.
        </Text>

        <TextInput
          className="w-80"
          value={values.email}
          error={errors.email}
          touched={touched.email}
          onChange={handleChange("email")}
          onBlur={handleBlur("email")}
          label="Email"
          leftIcon="mail"
          placeholder="name@company.com"
          disabled={isLoading}
          labelClassName="font-semibold!"
        />
        <Button
          className="w-80 justify-center"
          disabled={!isValid || !dirty || isLoading}
          onClick={() => handleSubmit()}
        >
          {isLoading ? "Sending..." : "Send OTP"}
        </Button>
      </div>
    </AuthLayout>
  );
};

interface SessionEndReasonBoxProps {
  sessionEndReason: UserSessionEndReason;
}
const SessionEndReasonBox: React.FC<SessionEndReasonBoxProps> = (props) => {
  const { sessionEndReason } = props;

  const contentMap: Record<
    UserSessionEndReason,
    { icon: React.ReactNode; message: string }
  > = {
    [UserSessionEndReason.IdleTimeout]: {
      icon: <Icon name="warning-triangle" className="text-warning! size-6 mt-0.5" />,
      message:
        "Your session has expired due to inactivity. Please log in again.",
    },
    [UserSessionEndReason.ForceLogout]: {
      icon: <Icon name="dismiss" className="text-error-text! size-6 mt-0.5"/>,
      message:
        "Your session is no longer valid. Please log in again.",
    },
    [UserSessionEndReason.AbsoluteTimeout]: {
      icon: <Icon name="warning-triangle" className="text-primary! size-6 mt-0.5"/>,
      message:
        "Your session has expired due to inactivity. Please log in again.",
    },
  };
  const {icon, message} = contentMap[sessionEndReason];
  return <div className="flex mx-4 border-secondary py-3 my-4 px-6 gap-4 border-l-4 rounded-md self-center border">
    {icon}
    <Text>{message}</Text>
  </div>;
};
