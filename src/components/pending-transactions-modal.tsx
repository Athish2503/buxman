import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Receipt, Check, X, Sparkles, Building2, MoreHorizontal, AlertCircle } from 'lucide-react';
import { useTransactionStore } from '@/lib/useTransactionStore';
import { categoryService, iconMap } from '@/lib/category-service';
import { Expense } from '@/types/expense';
import { haptics } from '@/lib/haptics';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

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
  const [isSuccessAnimating, setIsSuccessAnimating] = useState(false);

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
    setIsSuccessAnimating(true);
    
    setTimeout(() => {
      const finalAmount = parseFloat(amount) || pendingTx.amount;
      
      const newExpense: Expense = {
        id: Math.random().toString(36).substring(2, 11),
        amount: finalAmount,
        vendor: vendor || pendingTx.merchant,
        category: category,
        date: new Date(pendingTx.timestamp || Date.now()).toISOString().split('T')[0],
        description: notes || pendingTx.rawText,
        status: 'approved',
        currency: 'INR',
        isReimbursement: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      onAddExpense(newExpense);
      updateTransaction(pendingTx.id, { status: 'completed', category, notes });
      setIsSuccessAnimating(false);
    }, 1100);
  };

  const handleDismiss = () => {
    haptics.medium();
    updateTransaction(pendingTx.id, { status: 'ignored' });
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center px-4 bg-black/85 backdrop-blur-md overflow-hidden">
        {/* Soft floating ambient animated blur backgrounds to provide visual depth */}
        <div className="absolute top-1/4 left-1/4 w-[300px] h-[300px] rounded-full bg-primary/10 blur-[90px] animate-pulse-glow pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-[280px] h-[280px] rounded-full bg-purple-500/10 blur-[80px] animate-pulse-glow pointer-events-none" style={{ animationDelay: '1.5s' }} />

        <motion.div
          initial={{ opacity: 0, scale: 0.93, y: 30 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.93, y: 20 }}
          transition={{ type: 'spring', damping: 26, stiffness: 350 }}
          className="relative w-full max-w-[420px] overflow-hidden rounded-[2.5rem] border border-white/10 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.8)] bg-zinc-950/80 backdrop-blur-3xl"
        >
          {/* Top Neon Gradient Glow Strip */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-purple-500 to-rose-400 opacity-80" />

          <div className="p-6 space-y-6">
            {/* Header Area */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-11 h-11 rounded-2xl bg-primary/10 text-primary border border-primary/20 shadow-glow">
                  <Sparkles className="w-5 h-5 animate-spin-slow" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                    <h3 className="text-[10px] font-black tracking-[0.25em] text-primary uppercase">
                      Detected Deduction
                    </h3>
                  </div>
                  <p className="text-xs font-semibold text-muted-foreground mt-0.5">
                    via {pendingTx.appName || 'Bank SMS Engine'}
                  </p>
                </div>
              </div>
              
              <button
                onClick={handleDismiss}
                className="h-9 w-9 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-white/10 active:scale-90 transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Configurable Amount UI Display (Neo-banking interface) */}
            <div className="relative py-6 px-4 bg-gradient-to-b from-white/5 to-white/[0.01] border border-white/5 rounded-3xl flex flex-col items-center justify-center shadow-inner group">
              <span className="text-[9px] font-black text-muted-foreground/60 uppercase tracking-[0.2em] mb-1">
                Amount Deducted
              </span>
              <div className="flex items-center justify-center w-full gap-1">
                <span className="text-4xl font-black text-primary select-none opacity-80">₹</span>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="text-4xl sm:text-5xl font-black text-white bg-transparent border-none outline-none focus:ring-0 focus:outline-none w-[180px] text-center p-0 tracking-tight"
                  style={{ caretColor: 'var(--primary)' }}
                />
              </div>
            </div>

            {/* Merchant and Notes Inputs */}
            <div className="space-y-4">
              {/* Payee / Merchant */}
              <div className="relative bg-white/5 border border-white/10 rounded-2xl p-3 focus-within:border-primary/50 hover:border-white/20 transition-all">
                <label className="text-[9px] font-black text-muted-foreground/60 uppercase tracking-[0.2em] block mb-1">
                  Payee / Merchant
                </label>
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-muted-foreground/60" />
                  <input
                    type="text"
                    value={vendor}
                    onChange={(e) => setVendor(e.target.value)}
                    className="w-full bg-transparent border-none p-0 text-sm font-bold focus:ring-0 outline-none text-white placeholder:text-muted-foreground/20"
                    placeholder="e.g. Starbucks"
                  />
                </div>
              </div>

              {/* Notes */}
              <div className="relative bg-white/5 border border-white/10 rounded-2xl p-3 focus-within:border-primary/50 hover:border-white/20 transition-all">
                <label className="text-[9px] font-black text-muted-foreground/60 uppercase tracking-[0.2em] block mb-1">
                  Purpose / Notes
                </label>
                <div className="flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-muted-foreground/60" />
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full bg-transparent border-none p-0 text-xs font-semibold focus:ring-0 outline-none text-white placeholder:text-muted-foreground/20"
                    placeholder="Add notes..."
                  />
                </div>
              </div>
            </div>

            {/* Category selection grid */}
            <div className="space-y-2">
              <label className="text-[9px] font-black text-muted-foreground/60 uppercase tracking-[0.2em] block ml-1">
                Assign Category
              </label>
              <div className="grid grid-cols-3 gap-2 max-h-[140px] overflow-y-auto pr-1 no-scrollbar">
                {categories.map((cat) => {
                  const isSelected = category === cat.label;
                  const Icon = iconMap[cat.iconName] || MoreHorizontal;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => {
                        haptics.selection();
                        setCategory(cat.label);
                      }}
                      className={cn(
                        "px-3 py-2.5 rounded-2xl text-[11px] font-extrabold transition-all duration-300 flex items-center justify-center gap-1.5 border relative overflow-hidden group active:scale-95",
                        isSelected
                          ? "bg-primary/20 text-primary border-primary/50 shadow-[0_0_15px_rgba(234,179,8,0.15)]"
                          : "bg-white/5 hover:bg-white/10 text-muted-foreground/75 border-white/5"
                      )}
                    >
                      <Icon className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{cat.label}</span>
                      {isSelected && (
                        <motion.div
                          layoutId="active-cat-glow"
                          className="absolute inset-0 border border-primary/45 bg-primary/5 rounded-2xl pointer-events-none"
                          transition={{ type: "spring", stiffness: 380, damping: 30 }}
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Raw SMS Payload */}
            <div className="p-3.5 bg-black/40 border border-white/5 rounded-2xl flex gap-2.5 items-start">
              <AlertCircle className="w-4 h-4 text-muted-foreground/40 shrink-0 mt-0.5" />
              <div className="min-w-0">
                <span className="text-[8px] font-black uppercase text-muted-foreground/45 tracking-widest block mb-0.5">Raw SMS payload</span>
                <p className="text-[10px] text-muted-foreground/60 leading-relaxed font-mono break-all line-clamp-2 italic">
                  "{pendingTx.rawText}"
                </p>
              </div>
            </div>

            {/* Actions row */}
            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                className="flex-1 h-13 text-xs font-bold border-white/10 hover:bg-white/5 text-muted-foreground rounded-2xl active:scale-95 transition-all"
                onClick={handleDismiss}
              >
                Ignore
              </Button>
              <Button
                className="flex-1 h-13 text-xs font-black uppercase tracking-widest bg-gradient-primary text-white border-none shadow-glow active:scale-95 transition-all"
                onClick={handleSave}
              >
                <Check className="w-4 h-4 mr-1.5" />
                Approve Log
              </Button>
            </div>
          </div>

          {/* Success Overlay Animation */}
          <AnimatePresence>
            {isSuccessAnimating && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-zinc-950/95 backdrop-blur-md rounded-[2.5rem] overflow-hidden"
              >
                <motion.div
                  initial={{ scale: 0, opacity: 0.8 }}
                  animate={{ scale: [0, 2.5, 4], opacity: [0.8, 0.4, 0] }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                  className="absolute w-32 h-32 rounded-full border-4 border-emerald-500/40 bg-emerald-500/10"
                />

                <motion.div
                  initial={{ scale: 0, opacity: 0.6 }}
                  animate={{ scale: [0, 1.8, 3], opacity: [0.6, 0.2, 0] }}
                  transition={{ duration: 0.8, delay: 0.15, ease: "easeOut" }}
                  className="absolute w-32 h-32 rounded-full border-2 border-emerald-400/30 bg-emerald-400/5"
                />

                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: [0, 1.2, 1] }}
                  transition={{ type: "spring", damping: 12, stiffness: 200 }}
                  className="relative flex items-center justify-center w-20 h-20 rounded-full bg-emerald-500 shadow-[0_0_30px_rgba(16,185,129,0.4)]"
                >
                  <Check className="w-10 h-10 text-white stroke-[3.5]" />
                </motion.div>

                <motion.p
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="mt-6 text-sm font-black uppercase tracking-widest text-emerald-400"
                >
                  Transaction Saved
                </motion.p>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
