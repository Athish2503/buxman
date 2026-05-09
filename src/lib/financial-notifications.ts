import { registerPlugin } from '@capacitor/core';

export interface FinancialNotificationPlugin {
  checkPermissions(): Promise<{ notifications: boolean; overlay: boolean }>;
  openNotificationSettings(): Promise<void>;
  openOverlaySettings(): Promise<void>;
  updateCategories(options: { categories: string[] }): Promise<void>;
  flushPendingQueue(): Promise<void>;
  addListener(eventName: 'transactionDetected', listenerFunc: (data: any) => void): Promise<any>;
  addListener(eventName: 'overlayAction', listenerFunc: (data: any) => void): Promise<any>;
}

const FinancialNotification = registerPlugin<FinancialNotificationPlugin>('FinancialNotification');
console.log('FinancialNotification plugin registered:', FinancialNotification);

export default FinancialNotification;

export const syncCategoriesToNative = async (categories: string[]) => {
  try {
    await FinancialNotification.updateCategories({ categories });
  } catch (e) {
    console.error('Failed to sync categories to native', e);
  }
};
