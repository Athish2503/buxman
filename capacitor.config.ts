import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.pixel.reimburse',
  appName: 'Buxman',
  webDir: 'dist',
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: "#09090b",
      showSpinner: true,
      androidSpinnerStyle: "large",
      iosSpinnerStyle: "small",
      spinnerColor: "#7c3aed",
    },
    CapacitorSQLite: {
      iosIsEncryption: false,
      iosKeychainPrefix: 'pixel-reimburse',
      iosBiometric: {
        biometricAuth: false,
        biometricTitle : "Biometric login for sqlite"
      },
      androidIsEncryption: false,
      androidBiometric: {
        biometricAuth: false,
        biometricTitle : "Biometric login for sqlite"
      }
    }
  },
};

export default config;
