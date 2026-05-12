import { useEffect } from 'react';
import FinancialNotification from '../lib/financial-notifications';
import { useTransactionStore } from '../lib/useTransactionStore';
import { categoryService } from '../lib/category-service';

export const useTransactionListener = () => {
  useEffect(() => {
    // 1. Sync categories on mount
    const syncCats = async () => {
      const { Capacitor } = await import('@capacitor/core');
      if (!Capacitor.isNativePlatform()) return;

      const cats = categoryService.getVisible().map(c => c.label);
      await FinancialNotification.updateCategories({ categories: cats });
      // Flush any transactions detected while the app was closed
      try {
        if ((FinancialNotification as any).flushPendingQueue) {
          await (FinancialNotification as any).flushPendingQueue();
        }
      } catch (e) {
        console.error('Failed to flush pending queue', e);
      }
    };
    syncCats();

    // 2. Listen for real-time transactions
    let transactionSub: any;
    let overlaySub: any;

    const setupListeners = async () => {
      const { Capacitor } = await import('@capacitor/core');
      if (!Capacitor.isNativePlatform()) return;

      transactionSub = await FinancialNotification.addListener('transactionDetected', (data) => {
        console.log('Transaction detected via plugin:', data);
        useTransactionStore.getState().addTransaction({
          amount: data.amount,
          merchant: data.merchant,
          type: data.type as any,
          appName: data.appName,
          timestamp: data.timestamp,
          rawText: data.rawText,
          reference: data.reference,
        });
      });

      // 3. Listen for overlay actions
      overlaySub = await FinancialNotification.addListener('overlayAction', (data) => {
        console.log('Overlay action received:', data);
        const store = useTransactionStore.getState();
        
        const pendingTx = store.transactions.find(t => 
          t.status === 'pending' && 
          t.amount === data.amount && 
          t.merchant === data.merchant
        );

        if (pendingTx) {
          if (data.action === 'save') {
            store.updateTransaction(pendingTx.id, {
              status: 'completed',
              category: data.category,
              notes: data.notes
            });
          } else if (data.action === 'dismiss') {
            store.updateTransaction(pendingTx.id, {
              status: 'ignored'
            });
          }
        }
      });
    };

    setupListeners();

    return () => {
      if (transactionSub && typeof transactionSub.remove === 'function') {
        transactionSub.remove();
      }
      if (overlaySub && typeof overlaySub.remove === 'function') {
        overlaySub.remove();
      }
    };
  }, []); // Empty dependency array ensures permanent, stable native listeners
};
