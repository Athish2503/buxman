import { useEffect } from 'react';
import FinancialNotification from '../lib/financial-notifications';
import { useTransactionStore } from '../lib/useTransactionStore';
import { categoryService } from '../lib/category-service';

export const useTransactionListener = () => {
  const addTransaction = useTransactionStore((state) => state.addTransaction);
  const updateTransaction = useTransactionStore((state) => state.updateTransaction);
  const transactions = useTransactionStore((state) => state.transactions);

  useEffect(() => {
    // 1. Sync categories on mount
    const syncCats = async () => {
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
    const transactionSub = FinancialNotification.addListener('transactionDetected', (data) => {
      console.log('Transaction detected via plugin:', data);
      addTransaction({
        amount: data.amount,
        merchant: data.merchant,
        type: data.type,
        appName: data.appName,
        timestamp: data.timestamp,
        rawText: data.rawText,
        reference: data.reference,
      });
    });

    // 3. Listen for overlay actions
    const overlaySub = FinancialNotification.addListener('overlayAction', (data) => {
      console.log('Overlay action received:', data);
      
      // Find the transaction in our store that matches this data
      // (Overlay actions happen shortly after detection)
      const pendingTx = transactions.find(t => 
        t.status === 'pending' && 
        t.amount === data.amount && 
        t.merchant === data.merchant
      );

      if (pendingTx) {
        if (data.action === 'save') {
          updateTransaction(pendingTx.id, {
            status: 'completed',
            category: data.category,
            notes: data.notes
          });
        } else if (data.action === 'dismiss') {
          updateTransaction(pendingTx.id, {
            status: 'ignored'
          });
        }
      }
    });

    return () => {
      transactionSub.then(h => h.remove());
      overlaySub.then(h => h.remove());
    };
  }, [addTransaction, updateTransaction, transactions]);
};
