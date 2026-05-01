import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';
import { smsParser } from './sms-parser';

export const backgroundTasks = {
  /**
   * Initializes background listeners for SMS (Conceptual)
   */
  async initSMSListener() {
    if (!Capacitor.isNativePlatform()) return;

    // Conceptual: This would connect to a background-capable SMS plugin
    // e.g., @capacitor-community/sms-receive
    
    // For now, we'll scaffold the notification logic that would trigger
    // when an SMS is received while the app is in background.
  },

  async triggerNotification(body: string) {
    const parsed = smsParser.parse(body);
    if (!parsed) return;

    await LocalNotifications.schedule({
      notifications: [
        {
          title: 'Transaction Detected 💸',
          body: `Spent ${parsed.amount} at ${parsed.vendor}. Tap to categorize!`,
          id: 101,
          schedule: { at: new Date(Date.now() + 1000) },
          sound: 'beep.wav',
          attachments: [],
          actionTypeId: 'EXPENSE_ACTION',
          extra: parsed
        }
      ]
    });
  }
};
