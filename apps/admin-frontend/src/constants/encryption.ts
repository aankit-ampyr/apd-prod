import {type ENV} from '@/interface';
interface EncryptionConfig {
  currentEnv: string | undefined;
  keys: Record<ENV, string>;
  encryptionFlag: boolean;
}
const {
  VITE_APP_ENV,
  VITE_APP_ENCRYPTION_KEY_LOC,
  VITE_APP_ENCRYPTION_KEY_DEV,
  VITE_APP_ENCRYPTION_KEY_QA,
  VITE_APP_ENCRYPTION_KEY_UAT,
  VITE_APP_ENCRYPTION_KEY_PROD,
  VITE_APP_ENCRYPT
} = import.meta.env;

export const ENCRYPTION: EncryptionConfig = {
  currentEnv: VITE_APP_ENV,
  keys: {
    loc: VITE_APP_ENCRYPTION_KEY_LOC as string,
    dev: VITE_APP_ENCRYPTION_KEY_DEV as string,
    prod: VITE_APP_ENCRYPTION_KEY_PROD as string,
    qa: VITE_APP_ENCRYPTION_KEY_QA as string,
    uat: VITE_APP_ENCRYPTION_KEY_UAT as string,
  },

  encryptionFlag: VITE_APP_ENCRYPT === 'TRUE',
};