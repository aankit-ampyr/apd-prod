import CryptoJS from 'crypto-js';
import {ENCRYPTION} from '@/constants/encryption';

export const decryptPayload = (payload: string, iv: string) => {
  const encryptionKey = ENCRYPTION.keys[ENCRYPTION.currentEnv as keyof typeof ENCRYPTION.keys];
  const key = CryptoJS.enc.Base64.parse(encryptionKey);
  const ivBytes = CryptoJS.enc.Base64.parse(iv);

  const decrypted = CryptoJS.AES.decrypt(payload, key, {
    iv: ivBytes,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  });

  return JSON.parse(decrypted.toString(CryptoJS.enc.Utf8));
};

export const encryptPayload = (data: any) => {
  const encryptionKey = ENCRYPTION.keys[ENCRYPTION.currentEnv as keyof typeof ENCRYPTION.keys];

  const key = CryptoJS.enc.Base64.parse(encryptionKey);
  const iv = CryptoJS.lib.WordArray.random(16); // 128-bit IV

  const encrypted = CryptoJS.AES.encrypt(JSON.stringify(data), key, {
    iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  });

  return {
    iv: CryptoJS.enc.Base64.stringify(iv),
    payload: encrypted.toString(),
  };
};

// Helper function to encrypt FormData
export const encryptFormData = (formData: FormData): FormData => {
  const newFormData = new FormData();

  const encryptionKey = ENCRYPTION.keys[ENCRYPTION.currentEnv as keyof typeof ENCRYPTION.keys];
  const parsedEncryptionKey = CryptoJS.enc.Base64.parse(encryptionKey);
  const iv = CryptoJS.lib.WordArray.random(16);

  // create a common iv, encrypt all values with that common iv and encryption key, and append the common iv at last.
  for (const [key, value] of formData.entries()){
    if (value instanceof File || (value as any) instanceof Blob){
      newFormData.append(key, value);
    }

    // encrypt the values 
    else{
      const encryptedValue = CryptoJS.AES.encrypt(String(value), parsedEncryptionKey, {
        iv,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7,
      });
      newFormData.append(key, encryptedValue.toString());
    }
  }

  // append common iv at last
  newFormData.append('iv', CryptoJS.enc.Base64.stringify(iv));

  return newFormData;
};

export const decryptInline = (inlineEncrypted: string): any => {
  if (!inlineEncrypted.startsWith('encrypted_')) {
    throw new Error('Invalid encrypted format');
  }

  // Remove the "encrypted_" prefix
  const payloadStr = inlineEncrypted.slice('encrypted_'.length);

  // Split IV and payload
  const [ivB64, encryptedB64] = payloadStr.split(':');
  if (!ivB64 || !encryptedB64) {
    throw new Error('Invalid encrypted format');
  }

  // Call the existing decrypt function
  return decryptPayload(encryptedB64, ivB64);
};