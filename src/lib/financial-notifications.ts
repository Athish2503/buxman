import { registerPlugin } from '@capacitor/core';

export interface FinancialNotificationPlugin {
  checkPermissions(): Promise<{ notifications: boolean; overlay: boolean }>;
  openNotificationSettings(): Promise<void>;
  openOverlaySettings(): Promise<void>;
  updateCategories(options: { categories: string[] }): Promise<void>;
  flushPendingQueue(): Promise<void>;
  requestIgnoreBatteryOptimizations(): Promise<void>;
  isIgnoringBatteryOptimizations(): Promise<{ isIgnoring: boolean }>;
  
  // Simulations
  simulateTransaction(options: { amount?: number; merchant?: string; appName?: string }): Promise<void>;
  simulateNotification(options: { title?: string; text?: string; packageName?: string }): Promise<void>;
  simulateSms(options: { sender?: string; body?: string }): Promise<void>;
  simulateGPayTransaction(options: { amount?: number; merchant?: string }): Promise<void>;
  forceOverlay(options: { amount?: number; merchant?: string; appName?: string }): Promise<void>;

  acknowledgeEvent(options: { id: string }): Promise<void>;

  addListener(eventName: 'transactionDetected', listenerFunc: (data: {
    eventId?: string;
    amount: number;
    merchant: string;
    source: string;
    appName: string;
    confidence: number;
    type: string;
    rawText: string;
    timestamp: number;
    reference?: string;
    transactionId?: string;
  }) => void): Promise<any>;
  
  addListener(eventName: 'overlayAction', listenerFunc: (data: {
    eventId?: string;
    action: 'save' | 'dismiss';
    amount: number;
    merchant: string;
    category?: string;
    notes?: string;
  }) => void): Promise<any>;
}

const FinancialNotification = registerPlugin<FinancialNotificationPlugin>('FinancialNotification');

export default FinancialNotification;

export const syncCategoriesToNative = async (categories: string[]) => {
  try {
    const { Capacitor } = await import('@capacitor/core');
    if (!Capacitor.isNativePlatform()) return;
    await FinancialNotification.updateCategories({ categories });
  } catch (e) {
    console.error('Failed to sync categories to native', e);
  }
};
