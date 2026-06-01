import { Capacitor } from '@capacitor/core';
import { Camera } from '@capacitor/camera';
import { LocalNotifications } from '@capacitor/local-notifications';
import FinancialNotification from './financial-notifications';

export interface PermissionStatus {
  camera: boolean;
  microphone: boolean;
  notifications: boolean;
  financialNotifications: boolean;
  overlay: boolean;
  isMiui?: boolean;
  allGranted: boolean;
}

export const permissions = {
  /**
   * Checks the status of all required permissions
   */
  async checkStatus(): Promise<PermissionStatus> {
    if (!Capacitor.isNativePlatform()) {
      return { 
        camera: true, 
        microphone: true, 
        notifications: true, 
        financialNotifications: true,
        overlay: true,
        isMiui: false,
        allGranted: true 
      };
    }

    try {
      const cameraStatus = await Camera.checkPermissions();
      const notificationStatus = await LocalNotifications.checkPermissions();
      
      let financialStatus: { notifications: boolean; overlay: boolean; isMiui?: boolean } = { notifications: false, overlay: false, isMiui: false };
      try {
        financialStatus = await FinancialNotification.checkFinancialPermissions();
      } catch (e) {
        console.warn('Plugin check failed, trying NativeBridge...', e);
        if ((window as any).NativeBridge) {
          financialStatus = {
            notifications: (window as any).NativeBridge.checkNotificationPermission(),
            overlay: (window as any).NativeBridge.checkOverlayPermission(),
            isMiui: false
          };
        }
      }
      
      const hasMic = await this.checkMicrophonePermission();

      const status = {
        camera: cameraStatus.camera === 'granted',
        microphone: hasMic,
        notifications: notificationStatus.display === 'granted',
        financialNotifications: financialStatus.notifications,
        overlay: financialStatus.overlay,
        isMiui: financialStatus.isMiui || false,
        allGranted: false
      };

      status.allGranted = status.camera && status.microphone && status.notifications && status.financialNotifications && status.overlay;
      return status;
    } catch {
      return { 
        camera: false, 
        microphone: false, 
        notifications: false, 
        financialNotifications: false,
        overlay: false,
        allGranted: false 
      };
    }
  },

  /**
   * Requests all necessary permissions
   */
  async requestAll(): Promise<PermissionStatus> {
    if (!Capacitor.isNativePlatform()) {
      return await this.checkStatus();
    }

    try {
      await Camera.requestPermissions({ permissions: ['camera', 'photos'] });
      await LocalNotifications.requestPermissions();
      await this.requestMicrophonePermission();

      return await this.checkStatus();
    } catch (error) {
      console.error('Permission request failed', error);
      return await this.checkStatus();
    }
  },

  async checkMicrophonePermission(): Promise<boolean> {
    // Standard Capacitor doesn't have a checkMicrophonePermission yet in Core
    // We'll fallback to a simple true if we can't check
    return true;
  },

  /**
   * Opens Android settings for Notification Listener access
   */
  async requestNotificationListener(): Promise<void> {
    console.log('Requesting notification listener...');
    if (Capacitor.isNativePlatform()) {
      if ((window as any).NativeBridge?.openNotificationSettings) {
        (window as any).NativeBridge.openNotificationSettings();
      } else {
        try {
          await FinancialNotification.openNotificationSettings();
        } catch (e) {
          console.error('Failed to open notification settings', e);
        }
      }
    }
  },

  /**
   * Opens Android settings for "Display over other apps" permission
   */
  async requestOverlayPermission(): Promise<void> {
    console.log('Requesting overlay permission...');
    if (Capacitor.isNativePlatform()) {
      if ((window as any).NativeBridge?.openOverlaySettings) {
        (window as any).NativeBridge.openOverlaySettings();
      } else {
        try {
          await FinancialNotification.openOverlaySettings();
        } catch (e) {
          console.error('Failed to open overlay settings', e);
        }
      }
    }
  },

  /**
   * Requests SMS permissions (legacy)
   */
  async requestSMSPermission(): Promise<void> {
    if (Capacitor.isNativePlatform() && (window as any).NativeBridge) {
      (window as any).NativeBridge.requestSMSPermission();
    }
  },

  /**
   * Requests Microphone permission
   */
  async requestMicrophonePermission(): Promise<void> {
    if (Capacitor.isNativePlatform() && (window as any).NativeBridge) {
      (window as any).NativeBridge.requestMicrophonePermission();
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach(track => track.stop());
      } catch (e) {
        console.error('Web microphone request failed', e);
      }
    }
  },

  async checkSMSStatus(): Promise<boolean> {
    if (Capacitor.isNativePlatform() && (window as any).NativeBridge) {
      return (window as any).NativeBridge.checkSMSPermission();
    }
    return false;
  },

  async checkNotificationStatus(): Promise<boolean> {
    if (Capacitor.isNativePlatform()) {
      const status = await FinancialNotification.checkFinancialPermissions();
      return status.notifications;
    }
    return false;
  },

  async checkOverlayStatus(): Promise<boolean> {
    if (Capacitor.isNativePlatform()) {
      const status = await FinancialNotification.checkFinancialPermissions();
      return status.overlay;
    }
    return false;
  }
};
