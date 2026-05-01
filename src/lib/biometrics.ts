import { NativeBiometric } from '@capgo/capacitor-native-biometric';
import { Capacitor } from '@capacitor/core';

export const biometrics = {
  async isAvailable(): Promise<boolean> {
    // If on web, we return true to allow the toggle in settings for simulation/UI testing
    if (!Capacitor.isNativePlatform()) return true; 
    
    try {
      const result = await NativeBiometric.isAvailable();
      return result.isAvailable;
    } catch {
      return false;
    }
  },

  async authenticate(): Promise<boolean> {
    if (!Capacitor.isNativePlatform()) {
      console.log('[Biometrics] Simulating successful authentication on web');
      return true;
    }
    
    try {
      await NativeBiometric.verifyIdentity({
        reason: 'Unlock Pixel Reimburse',
        title: 'Biometric Lock',
        subtitle: 'Authenticate to access your financial data',
        description: 'Verify your identity using FaceID or TouchID',
      });
      return true;
    } catch (e: any) {
      console.error('[Biometrics] Native auth failed', e);
      return false;
    }
  }
};
