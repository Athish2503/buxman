import { LocalNotifications } from '@capacitor/local-notifications';

export const notificationService = {
  async requestPermissions() {
    const perm = await LocalNotifications.checkPermissions();
    if (perm.display !== 'granted') {
      await LocalNotifications.requestPermissions();
    }
  },

  async scheduleFunnyReminder(title: string, body: string) {
    await this.requestPermissions();
    
    // We send it immediately or slightly delayed for effect
    await LocalNotifications.schedule({
      notifications: [
        {
          title,
          body,
          id: Math.floor(Math.random() * 10000),
          schedule: { at: new Date(Date.now() + 1000) }, // 1 second later
          sound: 'default',
          actionTypeId: 'OPEN_WALLET',
          extra: {
            type: 'receipt_reminder'
          }
        }
      ]
    });
  }
};
