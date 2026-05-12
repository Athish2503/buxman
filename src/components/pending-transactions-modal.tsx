import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Receipt, Check, X, Sparkles, Building2 } from 'lucide-react';
import { useTransactionStore, Transaction } from '@/lib/useTransactionStore';
import { categoryService } from '@/lib/category-service';
import { Expense } from '@/types/expense';
import { haptics } from '@/lib/haptics';
import { formatCurrency } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface PendingTransactionsModalProps {
  onAddExpense: (expense: Expense) => void;
}

export function PendingTransactionsModal({ onAddExpense }: PendingTransactionsModalProps) {
  const transactions = useTransactionStore((state) => state.transactions);
  const updateTransaction = useTransactionStore((state) => state.updateTransaction);

  // Retrieve active pending transaction
  const pendingTx = transactions.find((t) => t.status === 'pending');

  const [vendor, setVendor] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Personal');
  const [notes, setNotes] = useState('');

  // Synchronize internal form state when active pending transaction switches
  useEffect(() => {
    if (pendingTx) {
      setVendor(pendingTx.merchant || 'Unknown Merchant');
      setAmount(pendingTx.amount ? pendingTx.amount.toString() : '0');
      setCategory(pendingTx.category || 'Personal');
      setNotes(pendingTx.notes || '');
    }
  }, [pendingTx]);

  if (!pendingTx) return null;

  const categories = categoryService.getVisible();

  const handleSave = () => {
    haptics.success();
    const finalAmount = parseFloat(amount) || pendingTx.amount;
    
    const newExpense: Expense = {
      id: Math.random().toString(36).substring(2, 11),
      amount: finalAmount,
      vendor: vendor || pendingTx.merchant,
      category: category,
      date: new Date(pendingTx.timestamp || Date.now()).toISOString().split('T')[0],
      type: 'personal',
      notes: notes || pendingTx.rawText,
      status: 'settled', // pre-settled since it's a direct confirmed bank capture
    };

    onAddExpense(newExpense);
    updateTransaction(pendingTx.id, { status: 'completed', category, notes });
  };

  const handleDismiss = () => {
    haptics.medium();
    updateTransaction(pendingTx.id, { status: 'ignored' });
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center px-4 bg-black/60 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ type: 'spring', damping: 24, stiffness: 320 }}
          className="relative w-full max-w-md overflow-hidden glass border border-white/10 rounded-3xl shadow-2xl bg-card"
        >
          {/* Top Aurora Glow Strip */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-brand animate-pulse-glow" />

          <div className="p-6 space-y-6">
            {/* Header section */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-2xl bg-primary/10 text-primary">
                  <Sparkles className="w-5 h-5 animate-spin-slow" />
                </div>
                <div>
                  <h3 className="text-xs font-bold tracking-widest text-primary uppercase">
                    Deduction Captured
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Via {pendingTx.appName || 'Bank Engine'}
                  </p>
                </div>
              </div>
              <button
                onClick={handleDismiss}
                className="p-1.5 rounded-full hover:bg-white/5 text-muted-foreground transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Configurable Amount & Merchant details */}
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                  Amount Deducted
                </label>
                <Input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="mt-1 text-3xl font-black text-white h-14 bg-white/5 border-white/10 rounded-2xl focus-visible:ring-primary"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                  Merchant / Payee
                </label>
                <div className="relative mt-1">
                  <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type="text"
                    value={vendor}
                    onChange={(e) => setVendor(e.target.value)}
                    className="pl-10 text-sm font-semibold h-11 bg-white/5 border-white/10 rounded-xl focus-visible:ring-primary"
                  />
                </div>
              </div>
            </div>

            {/* Glass Category Chips */}
            <div>
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-2">
                Assign Category
              </label>
              <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto pr-1">
                {categories.map((cat) => {
                  const isSelected = category === cat.label;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => {
                        haptics.selection();
                        setCategory(cat.label);
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all flex items-center gap-1.5 border ${
                        isSelected
                          ? 'bg-primary text-primary-foreground border-primary shadow-glow'
                          : 'bg-white/5 hover:bg-white/10 text-muted-foreground border-white/5'
                      }`}
                    >
                      <span className="text-sm">{cat.icon}</span>
                      <span>{cat.label}</span>
                      {isSelected && <Check className="w-3 h-3 ml-0.5" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Optional Memo Notes */}
            <div>
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">
                Purpose / Memo
              </label>
              <Input
                type="text"
                placeholder="What was this expense for?"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="text-xs h-10 bg-white/5 border-white/10 rounded-xl"
              />
              <p className="mt-1.5 text-[9px] text-muted-foreground/60 italic line-clamp-1">
                Raw message: "{pendingTx.rawText}"
              </p>
            </div>

            {/* Primary confirmation logic */}
            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                className="flex-1 h-12 text-xs font-bold border-white/10 hover:bg-white/5 text-muted-foreground rounded-xl"
                onClick={handleDismiss}
              >
                Ignore
              </Button>
              <Button
                className="flex-1 h-12 text-xs font-bold rounded-xl bg-gradient-brand text-black shadow-glow"
                onClick={handleSave}
              >
                <Receipt className="w-4 h-4 mr-1.5" />
                Save Expense
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
