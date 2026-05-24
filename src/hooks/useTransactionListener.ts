import { useEffect } from 'react';
import FinancialNotification from '../lib/financial-notifications';
import { useTransactionStore } from '../lib/useTransactionStore';
import { categoryService } from '../lib/category-service';
import { toast } from 'sonner';
import { haptics } from '../lib/haptics';

// Module-level cache to ensure persistent set deduplication across strict mode double mounts or component lifecycles
const processedEventIds = new Set<string>();

export const useTransactionListener = () => {
  useEffect(() => {
    let transactionSub: any;
    let overlaySub: any;

    const setupListenersAndSync = async () => {
      const { Capacitor } = await import('@capacitor/core');
      if (!Capacitor.isNativePlatform()) return;

      // 1. Sync categories to native overlay chips
      try {
        const cats = categoryService.getVisible().map(c => c.label);
        await FinancialNotification.updateCategories({ categories: cats });
      } catch (e) {
        console.error('Failed to sync categories', e);
      }

      // 2. Setup permanent listeners for transaction capture events
      transactionSub = await FinancialNotification.addListener('transactionDetected', async (data) => {
        console.log('Transaction detected via plugin:', data);
        
        if (data.eventId) {
          if (processedEventIds.has(data.eventId)) return;
          processedEventIds.add(data.eventId);
          // Acknowledge to native layer to purge from persistent SharedPreferences queue
          await FinancialNotification.acknowledgeEvent({ id: data.eventId }).catch(() => {});
        }

        useTransactionStore.getState().addTransaction({
          amount: data.amount,
          merchant: data.merchant,
          type: (data.type as any) || 'debit',
          appName: data.appName || 'System',
          timestamp: data.timestamp || Date.now(),
          rawText: data.rawText || '',
          reference: data.reference,
        });
      });

      // 3. Setup permanent listeners for overlay actions (Save / Dismiss)
      overlaySub = await FinancialNotification.addListener('overlayAction', async (data) => {
        console.log('Overlay action received:', data);
        
        if (data.eventId) {
          if (processedEventIds.has(data.eventId)) return;
          processedEventIds.add(data.eventId);
          await FinancialNotification.acknowledgeEvent({ id: data.eventId }).catch(() => {});
        }

        const store = useTransactionStore.getState();
        const pendingTx = store.transactions.find(t => 
          t.status === 'pending' && 
          t.amount === data.amount && 
          t.merchant === data.merchant
        );

        if (data.action === 'save') {
          const { storageService } = await import('../lib/storage');
          const today = new Date().toISOString().split('T')[0];

          if (!data.persistedNatively) {
            storageService.addExpense({
              id: 'TXN_' + Math.random().toString(36).substring(2, 11),
              amount: data.amount,
              vendor: data.merchant,
              category: data.category || 'Personal',
              date: today,
              currency: 'INR',
              description: data.notes || (pendingTx ? pendingTx.rawText : 'Captured via Smart Overlay'),
              status: 'approved',
              isReimbursement: !!data.isReimbursement,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            } as any);
          } else {
            const { storageEngine } = await import('../lib/storage-engine');
            await storageEngine.init();
            window.dispatchEvent(new Event('expenses-updated'));
          }

          toast.success(`Logged ₹${data.amount} to ${data.merchant}`);
          haptics.success();

          if (pendingTx) {
            store.updateTransaction(pendingTx.id, {
              status: 'completed',
              category: data.category,
              notes: data.notes
            });
          }
        } else if (data.action === 'dismiss') {
          if (pendingTx) {
            store.updateTransaction(pendingTx.id, {
              status: 'ignored'
            });
          }
        }
      });

      // 4. CRITICAL: Only flush the queue AFTER listeners are fully active and hooked up
      try {
        if (typeof FinancialNotification.flushPendingQueue === 'function') {
          await FinancialNotification.flushPendingQueue();
        }
      } catch (e) {
        console.error('Failed to flush pending queue securely', e);
      }

      // 5. Automatic foreground sync: Refresh UI state and flush native queues whenever app resumes
      try {
        const { App: CapacitorApp } = await import('@capacitor/app');
        await CapacitorApp.addListener('appStateChange', async ({ isActive }) => {
          if (isActive) {
            console.log('App resumed to active state. Syncing storage and flushing native queue...');
            const { storageEngine } = await import('../lib/storage-engine');
            await storageEngine.init();
            if (typeof FinancialNotification.flushPendingQueue === 'function') {
              await FinancialNotification.flushPendingQueue();
            }
            window.dispatchEvent(new Event('expenses-updated'));
          }
        });
      } catch (e) {
        console.error('Failed to attach app state change listener', e);
      }

      // 6. Listen for custom deep link events dispatched from MainActivity
      const handleNativeDeepLink = (e: any) => {
        const url = e.detail?.url;
        console.log('Received native deep link:', url);
        if (url) {
          if (url.includes('add-expense')) {
            window.dispatchEvent(new CustomEvent('trigger-add-menu', { detail: { action: 'expense' } }));
          } else if (url.includes('voice-log')) {
            window.dispatchEvent(new CustomEvent('trigger-add-menu', { detail: { action: 'expense', voice: true } }));
          } else if (url.includes('scan-receipt')) {
            window.dispatchEvent(new CustomEvent('trigger-add-menu', { detail: { action: 'snap' } }));
          }
        }
      };
      window.addEventListener('app-deep-link', handleNativeDeepLink);
      (window as any)._nativeDeepLinkHandler = handleNativeDeepLink;
    };

    setupListenersAndSync();

    return () => {
      if (transactionSub && typeof transactionSub.remove === 'function') {
        transactionSub.remove();
      }
      if (overlaySub && typeof overlaySub.remove === 'function') {
        overlaySub.remove();
      }
      if ((window as any)._nativeDeepLinkHandler) {
        window.removeEventListener('app-deep-link', (window as any)._nativeDeepLinkHandler);
        delete (window as any)._nativeDeepLinkHandler;
      }
    };
  }, []); // Stable listener attachment on application init
};
