import { Capacitor } from '@capacitor/core';
import { Camera } from '@capacitor/camera';
import { LocalNotifications } from '@capacitor/local-notifications';

export interface PermissionStatus {
  camera: boolean;
  notifications: boolean;
  allGranted: boolean;
}

export const permissions = {
  /**
   * Checks the status of all required permissions
   */
  async checkStatus(): Promise<PermissionStatus> {
    if (!Capacitor.isNativePlatform()) {
      return { camera: true, notifications: true, allGranted: true };
    }

    try {
      const cameraStatus = await Camera.checkPermissions();
      const notificationStatus = await LocalNotifications.checkPermissions();

      const status = {
        camera: cameraStatus.camera === 'granted',
        notifications: notificationStatus.display === 'granted',
        allGranted: false
      };

      status.allGranted = status.camera && status.notifications;
      return status;
    } catch {
      return { camera: false, notifications: false, allGranted: false };
    }
  },

  /**
   * Requests all necessary permissions
   */
  async requestAll(): Promise<PermissionStatus> {
    if (!Capacitor.isNativePlatform()) {
      return { camera: true, notifications: true, allGranted: true };
    }

    try {
      await Camera.requestPermissions({ permissions: ['camera', 'photos'] });
      await LocalNotifications.requestPermissions();
      
      return await this.checkStatus();
    } catch (error) {
      console.error('Permission request failed', error);
      return await this.checkStatus();
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
  }
};
