import FinancialNotification from './financial-notifications';
import { contactService } from './contact-service';
import { Expense } from '@/types/expense';

// In-memory registry for web browser timeout IDs
const browserTimeouts: Record<string, any> = {};

export const cancelSplitReminder = async (expenseId: string, contactId: string) => {
  const reminderId = `${expenseId}_${contactId}`;
  
  // Cancel in browser
  if (browserTimeouts[reminderId]) {
    clearTimeout(browserTimeouts[reminderId]);
    delete browserTimeouts[reminderId];
    console.log(`[Reminders] Cancelled web browser timeout: ${reminderId}`);
  }

  // Cancel natively on Android
  try {
    const { Capacitor } = await import('@capacitor/core');
    if (Capacitor.isNativePlatform()) {
      await FinancialNotification.cancelReminder({ id: reminderId }).catch(err => {
        console.error('Failed to cancel native reminder:', err);
      });
    }
  } catch (e) {
    console.error('Error cancelling reminder:', e);
  }
};

export const scheduleSplitReminders = async (expense: Expense) => {
  try {
    const split = expense.split;
    if (!split || !split.members || split.members.length === 0) return;

    const contacts = contactService.getContacts();
    const paidBy = expense.paidBy || 'user';
    const delaySeconds = 30; // 30 seconds simulated delay ("unpaid for a long time")

    const { Capacitor } = await import('@capacitor/core');
    const isNative = Capacitor.isNativePlatform();

    // Request Notification permission in browser if web
    if (!isNative && typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission !== 'granted' && Notification.permission !== 'denied') {
        Notification.requestPermission();
      }
    }

    const triggerReminder = async (memberId: string, title: string, body: string) => {
      const reminderId = `${expense.id}_${memberId}`;
      
      // 1. Cancel existing reminder first to prevent multiple alerts
      await cancelSplitReminder(expense.id, memberId);

      if (isNative) {
        await FinancialNotification.scheduleReminder({
          id: reminderId,
          title,
          body,
          delaySeconds
        }).catch(err => {
          console.error('Failed to schedule native reminder:', err);
        });
      } else {
        // Schedule in browser using native Notification API
        const timeoutId = setTimeout(() => {
          if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
            new Notification(title, { body });
          } else {
            console.log(`[OS Notification Fallback] ${title}: ${body}`);
          }
          delete browserTimeouts[reminderId];
        }, delaySeconds * 1000);
        
        browserTimeouts[reminderId] = timeoutId;
        console.log(`[Reminders] Scheduled web browser notification: ${reminderId} (30s)`);
      }
    };

    if (paidBy === 'user') {
      // User paid. Schedule reminders for unpaid members.
      const unpaid = split.members.filter(m => !m.paid);
      
      // Also cancel reminders for members who are now marked as PAID
      const paid = split.members.filter(m => m.paid);
      for (const m of paid) {
        await cancelSplitReminder(expense.id, m.contactId);
      }

      for (const m of unpaid) {
        const contact = contacts.find(c => c.id === m.contactId);
        const name = contact?.name || 'Someone';
        const title = 'Split Bill Reminder ⏳';
        const body = `${name} still owes you ₹${m.amount.toFixed(2)} for "${expense.vendor}"`;
        await triggerReminder(m.contactId, title, body);
      }
    } else {
      // Someone else paid.
      const sumOthers = split.members.reduce((acc, m) => acc + m.amount, 0);
      const userShare = expense.amount - sumOthers;
      const lender = contacts.find(c => c.id === paidBy);
      const lenderName = lender?.name || 'Someone';

      // User owes the lender
      if (userShare > 0) {
        const title = 'Split Bill Reminder ⏳';
        const body = `You still owe ${lenderName} ₹${userShare.toFixed(2)} for "${expense.vendor}"`;
        await triggerReminder('user', title, body);
      } else {
        await cancelSplitReminder(expense.id, 'user');
      }

      // Check other members
      const unpaid = split.members.filter(m => !m.paid && m.contactId !== paidBy);
      const paid = split.members.filter(m => m.paid && m.contactId !== paidBy);
      
      for (const m of paid) {
        await cancelSplitReminder(expense.id, m.contactId);
      }

      for (const m of unpaid) {
        const contact = contacts.find(c => c.id === m.contactId);
        const name = contact?.name || 'Someone';
        const title = 'Split Bill Reminder ⏳';
        const body = `${name} still owes ${lenderName} ₹${m.amount.toFixed(2)} for "${expense.vendor}"`;
        await triggerReminder(m.contactId, title, body);
      }
    }
  } catch (e) {
    console.error('Failed to schedule split reminders:', e);
  }
};
