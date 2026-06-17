import errors from '@/constants/errorMessages.json';
import successMessages from '@/constants/successMessages.json';

export type ErrorCodes = keyof typeof errors;
export type SuccessCodes = keyof typeof successMessages;

type messageObjects = {
  message: string;
  key: string;
  type: string;
};

type ErrorMessageData = Record<ErrorCodes, messageObjects>;
type SuccessMessageData = Record<SuccessCodes, messageObjects>;

const errorData: ErrorMessageData = errors;
const successData: SuccessMessageData = successMessages;

export function getErrorMessage(
  code: ErrorCodes,
  args?: Record<string, string>,
): string {
  const errorMsg = errorData[code]?.message || '';
  if (errorMsg?.includes('<')) {
    let updatedMsg = errorMsg;

   if (args) {
      for (const [key, value] of Object.entries(args)) {
        updatedMsg = updatedMsg.replaceAll(`<${key}>`, value);
      }
    }
    return updatedMsg;
  } else {
    return errorMsg;
  }
}

export function getSuccessMessage(
  code: SuccessCodes,
  varNameArr?: string[],
): string {
  const successMsg = successData[code]?.message || '';

  if (successMsg?.includes('<')) {
    let updatedSuccessMsg = successMsg;

    if (varNameArr) {
      varNameArr.forEach((val, index) => {
        updatedSuccessMsg = updatedSuccessMsg.replace(`<${index + 1}>`, val);
      });
    }

    return updatedSuccessMsg;
  } else {
    return successMsg;
  }
}