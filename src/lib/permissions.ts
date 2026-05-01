import { Capacitor } from '@capacitor/core';
import { Camera } from '@capacitor/camera';
import { LocalNotifications } from '@capacitor/local-notifications';

export const permissions = {
  /**
   * Request all critical permissions for the app
   */
  async requestAll(): Promise<boolean> {
    if (!Capacitor.isNativePlatform()) return true;

    try {
      // Camera for receipts
      await Camera.requestPermissions({ permissions: ['camera', 'photos'] });
      
      // Notifications for reminders
      await LocalNotifications.requestPermissions();
      
      // SMS Permissions (Note: Requires a community plugin for runtime requests on Android)
      // If using capacitor-sms-receive, you would call:
      // await SMSReceive.requestPermission();

      // System Overlay Permission (Android only)
      // Note: This requires the user to manually toggle "Draw over other apps" 
      // in the Android System Settings. You can trigger the intent via a custom plugin.
      
      return true;
    } catch (error) {
      console.error('Permission request failed', error);
      return false;
    }
  },

  async checkCamera(): Promise<boolean> {
    if (!Capacitor.isNativePlatform()) return true;
    const status = await Camera.checkPermissions();
    return status.camera === 'granted';
  }
};
