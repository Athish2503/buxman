import { Capacitor } from '@capacitor/core';
import { Camera } from '@capacitor/camera';
import { LocalNotifications } from '@capacitor/local-notifications';

export interface PermissionStatus {
  camera: boolean;
  microphone: boolean;
  notifications: boolean;
  allGranted: boolean;
}

export const permissions = {
  /**
   * Checks the status of all required permissions
   */
  async checkStatus(): Promise<PermissionStatus> {
    if (!Capacitor.isNativePlatform()) {
      return { camera: true, microphone: true, notifications: true, allGranted: true };
    }

    try {
      const cameraStatus = await Camera.checkPermissions();
      const notificationStatus = await LocalNotifications.checkPermissions();
      
      // Microphone is handled slightly differently in standard Capacitor
      const hasMic = await this.checkMicrophonePermission();

      const status = {
        camera: cameraStatus.camera === 'granted',
        microphone: hasMic,
        notifications: notificationStatus.display === 'granted',
        allGranted: false
      };

      status.allGranted = status.camera && status.microphone && status.notifications;
      return status;
    } catch {
      return { camera: false, microphone: false, notifications: false, allGranted: false };
    }
  },

  /**
   * Requests all necessary permissions
   */
  async requestAll(): Promise<PermissionStatus> {
    if (!Capacitor.isNativePlatform()) {
      return { camera: true, microphone: true, notifications: true, allGranted: true };
    }

    try {
      await Camera.requestPermissions({ permissions: ['camera', 'photos'] });
      await LocalNotifications.requestPermissions();
      
      // Request Record Audio (Microphone)
      await this.requestMicrophonePermission();

      return await this.checkStatus();
    } catch (error) {
      console.error('Permission request failed', error);
      return await this.checkStatus();
    }
  },

  async checkMicrophonePermission(): Promise<boolean> {
    if (Capacitor.isNativePlatform() && (window as any).NativeBridge) {
      return (window as any).NativeBridge.checkMicrophonePermission();
    }

    try {
      // On web, use the Permissions API which doesn't open the microphone
      if (navigator.permissions && navigator.permissions.query) {
        const status = await navigator.permissions.query({ name: 'microphone' as PermissionName });
        return status.state === 'granted';
      }
      
      // Fallback for older browsers (not ideal as it opens the mic, but better than nothing)
      // Actually, if we don't want to "mess with audio", we should just return false if we can't query
      return false;
    } catch {
      return false;
    }
  },

  /**
   * Opens Android settings for Notification Listener access
   */
  async requestNotificationListener(): Promise<void> {
    if (Capacitor.isNativePlatform() && (window as any).NativeBridge) {
      (window as any).NativeBridge.openNotificationSettings();
    } else {
      console.warn('NativeBridge not available or not on native platform');
    }
  },

  /**
   * Opens Android settings for "Display over other apps" permission
   */
  async requestOverlayPermission(): Promise<void> {
    if (Capacitor.isNativePlatform() && (window as any).NativeBridge) {
      (window as any).NativeBridge.openOverlaySettings();
    } else {
      console.warn('NativeBridge not available or not on native platform');
    }
  },

  /**
   * Requests SMS permissions via native bridge
   */
  async requestSMSPermission(): Promise<void> {
    if (Capacitor.isNativePlatform() && (window as any).NativeBridge) {
      (window as any).NativeBridge.requestSMSPermission();
    } else {
      console.warn('NativeBridge not available or not on native platform');
    }
  },

  /**
   * Requests Microphone permission via native bridge
   */
  async requestMicrophonePermission(): Promise<void> {
    if (Capacitor.isNativePlatform() && (window as any).NativeBridge) {
      (window as any).NativeBridge.requestMicrophonePermission();
    } else {
      // On web, we have to use getUserMedia to trigger the prompt
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
    if (Capacitor.isNativePlatform() && (window as any).NativeBridge) {
      return (window as any).NativeBridge.checkNotificationPermission();
    }
    return false;
  },

  async checkOverlayStatus(): Promise<boolean> {
    if (Capacitor.isNativePlatform() && (window as any).NativeBridge) {
      return (window as any).NativeBridge.checkOverlayPermission();
    }
    return false;
  }
};
