import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';

// Simple hash function to convert UUID string to a numeric ID for notifications
function getNotificationId(receiptId: string, intervalIndex: number): number {
  let hash = 0;
  for (let i = 0; i < receiptId.length; i++) {
    hash = (hash << 5) - hash + receiptId.charCodeAt(i);
    hash |= 0; // Convert to 32bit integer
  }
  // Use modulo to keep it in a safe range for notification IDs (which are often 32-bit ints)
  // and add intervalIndex to distinguish between multiple reminders for the same receipt.
  return (Math.abs(hash) % 100000000) + (intervalIndex * 100000000);
}


export const notificationService = {
  async requestPermissions() {
    const perm = await LocalNotifications.checkPermissions();
    if (perm.display !== 'granted') {
      await LocalNotifications.requestPermissions();
    }
    
    // Create Android channel for high importance
    if (Capacitor.getPlatform() === 'android') {
      await LocalNotifications.createChannel({
        id: 'wallet-reminders',
        name: 'Wallet Reminders',
        description: 'Nudges to log your receipts',
        importance: 5, // High importance for heads-up
        visibility: 1,
        sound: 'default',
        vibration: true,
      });
    }
  },

  async testNotification() {
    await this.requestPermissions();
    await LocalNotifications.schedule({
      notifications: [
        {
          title: 'Buxman Test 🚀',
          body: 'This is an actual Android system notification!',
          id: 999,
          schedule: { at: new Date(Date.now() + 2000) }, // 2 seconds later
          sound: 'default',
          channelId: 'wallet-reminders',
        }
      ]
    });
  },

  async scheduleFunnyReminder(title: string, body: string) {
    await this.requestPermissions();
    
    await LocalNotifications.schedule({
      notifications: [
        {
          title,
          body,
          id: Math.floor(Math.random() * 10000),
          schedule: { at: new Date(Date.now() + 1000) },
          sound: 'default',
          channelId: 'wallet-reminders',
          actionTypeId: 'OPEN_WALLET',
          extra: { type: 'receipt_reminder' }
        }
      ]
    });
  },


  async scheduleWalletReminders(receiptId: string, createdAt: string) {
    await this.requestPermissions();

    const createdDate = new Date(createdAt).getTime();
    const now = Date.now();

    const reminders = [
      { delay: 6 * 60 * 60 * 1000, label: '6 hours' },
      { delay: 24 * 60 * 60 * 1000, label: '1 day' },
      { delay: 2 * 24 * 60 * 60 * 1000, label: '2 days' },
      { delay: 3 * 24 * 60 * 60 * 1000, label: '3 days' },
      { delay: 7 * 24 * 60 * 60 * 1000, label: '1 week' },
    ];

    const messages = [
      "Still in the wallet? 🧐 Log this receipt before you forget what it was for!",
      "Don't let your money sit there! 💸 Convert this receipt into a reimbursement.",
      "Is this receipt gathering digital dust? 🕸️ Log it now!",
      "Final call for this receipt! 📢 It's been 3 days. Get it done!",
      "Okay, now you're just being lazy. 🙄 Log that receipt from last week!"
    ];

    const notifications = reminders
      .map((rem, idx) => {
        const targetTime = createdDate + rem.delay;
        
        // Only schedule if the target time is in the future
        if (targetTime <= now) return null;

        return {
          id: getNotificationId(receiptId, idx),
          title: 'Wallet Nudge 📸',
          body: messages[idx] || "You have an unlogged receipt in your wallet.",
          schedule: { at: new Date(targetTime) },
          sound: 'default',
          channelId: 'wallet-reminders',
          actionTypeId: 'OPEN_WALLET',
          extra: { receiptId, type: 'wallet_nudge' }
        };

      })
      .filter((n): n is NonNullable<typeof n> => n !== null);

    if (notifications.length > 0) {
      await LocalNotifications.schedule({ notifications });
    }
  },


  async cancelWalletReminders(receiptId: string) {
    const ids = [0, 1, 2, 3, 4].map(idx => ({ id: getNotificationId(receiptId, idx) }));
    await LocalNotifications.cancel({ notifications: ids });
  }
};

