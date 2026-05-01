import { NativeBiometric } from '@capgo/capacitor-native-biometric';
import { Capacitor } from '@capacitor/core';

export const biometrics = {
  async isAvailable(): Promise<boolean> {
    if (!Capacitor.isNativePlatform()) return false;
    try {
      const result = await NativeBiometric.isAvailable();
      return result.isAvailable;
    } catch {
      return false;
    }
  },

  async authenticate(): Promise<boolean> {
    if (!Capacitor.isNativePlatform()) return true;
    try {
      await NativeBiometric.verifyIdentity({
        reason: 'Unlock Pixel Reimburse',
        title: 'Biometric Lock',
        subtitle: 'Authenticate to access your financial data',
        description: 'Verify your identity using FaceID or TouchID',
      });
      return true;
    } catch (e: any) {
      console.error('Biometric auth failed', e);
      return false;
    }
  }
};
