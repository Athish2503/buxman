import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Receipt, Check, X, Sparkles, Building2, MoreHorizontal, AlertCircle, QrCode } from 'lucide-react';
import { useTransactionStore } from '@/lib/useTransactionStore';
import { categoryService, iconMap } from '@/lib/category-service';
import { Expense } from '@/types/expense';
import { haptics } from '@/lib/haptics';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { SplitBillSection } from '@/components/split';
import { ExpenseSplit } from '@/types/split';
import { settingsService } from '@/lib/settings';
import QRCode from 'qrcode';
import { toast } from 'sonner';

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
  const [split, setSplit] = useState<ExpenseSplit | undefined>(undefined);
  const [paidBy, setPaidBy] = useState<string | undefined>(undefined);
  const [settings, setSettings] = useState(() => settingsService.get());
  const [tempUpiId, setTempUpiId] = useState(settings.upiId || '');

  // Track if UPI ID is updated in settings
  useEffect(() => {
    setTempUpiId(settings.upiId || '');
  }, [settings.upiId]);

  const isCredit = pendingTx ? pendingTx.type === 'credit' : false;

  // Synchronize internal form state when active pending transaction switches
  useEffect(() => {
    if (pendingTx) {
      setVendor(pendingTx.merchant || 'Unknown Merchant');
      setAmount(pendingTx.amount ? pendingTx.amount.toString() : '0');
      setCategory(pendingTx.category || 'Personal');
      setNotes(pendingTx.notes || '');
    }
  }, [pendingTx]);

  // Generate UPI QR Code URL
  useEffect(() => {
    if (!pendingTx || !settings.upiId || !split || !split.members || split.members.length === 0) return;

    const splitAmount = (parseFloat(amount) || pendingTx.amount) / (split.members.length + 1);
    const name = settings.billedFrom.name || 'User';
    const upiUrl = `upi://pay?pa=${settings.upiId.trim()}&pn=${encodeURIComponent(name)}&am=${splitAmount.toFixed(2)}&cu=INR`;

    QRCode.toDataURL(upiUrl, {
      width: 256,
      margin: 1.5,
      color: {
        dark: settings.accentColor || '#7c3aed',
        light: '#ffffff'
      }
    })
    .then((url) => {
      const img = document.getElementById('split-upi-qr-image') as HTMLImageElement;
      if (img) img.src = url;
    })
    .catch((err) => {
      console.error('Failed to generate split UPI QR Code:', err);
    });
  }, [amount, split, settings.upiId, pendingTx]);

  if (!pendingTx) return null;

  const handleSaveUpiId = () => {
    if (!tempUpiId.trim()) return;
    const updated = { ...settings, upiId: tempUpiId.trim() };
    settingsService.save(updated);
    setSettings(updated);
    toast.success('Your UPI ID has been configured!');
  };

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
        paidBy: paidBy,
        split: split,
        type: pendingTx.type || 'debit',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      } as any;

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
          className="relative w-full max-w-[420px] rounded-[2.5rem] border border-white/10 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.8)] bg-zinc-950/80 backdrop-blur-3xl"
        >
          {/* Top Neon Gradient Glow Strip */}
          <div className={cn(
            "absolute top-0 left-0 right-0 h-1 opacity-80 z-10",
            isCredit 
              ? "bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-600"
              : "bg-gradient-to-r from-primary via-purple-500 to-rose-400"
          )} />

          <div className="max-h-[85vh] overflow-y-auto p-6 space-y-6 no-scrollbar">
            {/* Header Area */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "flex items-center justify-center w-11 h-11 rounded-2xl border shadow-glow",
                  isCredit 
                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                    : "bg-primary/10 text-primary border-primary/20"
                )}>
                  <Sparkles className="w-5 h-5 animate-spin-slow" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className={cn("h-1.5 w-1.5 rounded-full animate-pulse", isCredit ? "bg-emerald-400" : "bg-primary")} />
                    <h3 className={cn(
                      "text-[10px] font-black tracking-[0.25em] uppercase",
                      isCredit ? "text-emerald-400" : "text-primary"
                    )}>
                      {isCredit ? 'Detected Credit' : 'Detected Deduction'}
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
                {isCredit ? 'Amount Credited' : 'Amount Deducted'}
              </span>
              <div className="flex items-center justify-center w-full gap-1">
                <span className={cn("text-4xl font-black select-none opacity-80", isCredit ? "text-emerald-400" : "text-primary")}>₹</span>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="text-4xl sm:text-5xl font-black text-white bg-transparent border-none outline-none focus:ring-0 focus:outline-none w-[180px] text-center p-0 tracking-tight"
                  style={{ caretColor: isCredit ? '#10b981' : 'var(--primary)' }}
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

            {/* Split Bill Section */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
              <SplitBillSection
                amount={parseFloat(amount) || pendingTx.amount}
                onSplitChange={setSplit}
                onPaidByChange={setPaidBy}
                initialSplit={split}
                initialPaidBy={paidBy}
              />
            </div>

            {/* UPI Split QR Code Generator Section */}
            {split && split.members && split.members.length > 0 && !isCredit && (
              <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-4 animate-in fade-in slide-in-from-top-4 duration-300">
                <style>{`
                  @keyframes scan {
                    0% { top: 0%; opacity: 0.2; }
                    50% { opacity: 0.8; }
                    100% { top: 100%; opacity: 0.2; }
                  }
                  .scanner-line {
                    position: absolute;
                    left: 0;
                    width: 100%;
                    height: 3px;
                    background: linear-gradient(90deg, transparent, ${settings.accentColor || '#6366f1'}, transparent);
                    animation: scan 2.5s linear infinite;
                    box-shadow: 0 0 10px ${settings.accentColor || '#6366f1'};
                    pointer-events: none;
                  }
                `}</style>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <QrCode className="h-4 w-4 text-primary animate-pulse" />
                    <span className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">Quick Split UPI QR</span>
                  </div>
                  <span className="text-xs font-mono font-bold text-emerald-400">
                    ₹{((parseFloat(amount) || pendingTx.amount) / (split.members.length + 1)).toFixed(2)} each
                  </span>
                </div>

                {settings.upiId ? (
                  <div className="flex flex-col items-center justify-center p-4 bg-zinc-950/60 rounded-xl border border-white/5 relative overflow-hidden group">
                    {/* Scanner line animation */}
                    <div className="scanner-line" />
                    
                    <img 
                      id="split-upi-qr-image"
                      alt="UPI Split QR Code"
                      className="w-40 h-40 object-contain p-2 bg-white rounded-lg shadow-lg z-10"
                    />

                    <div className="mt-3 text-center space-y-1 z-10">
                      <p className="text-[10px] text-muted-foreground">Scan with any UPI app to pay</p>
                      <p className="text-xs font-mono font-extrabold text-foreground">{settings.upiId}</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2.5 p-3 rounded-xl bg-amber-500/5 border border-amber-500/20">
                    <p className="text-xs text-amber-300 font-medium">
                      Setup your UPI ID to generate dynamic payment QR codes for your friends.
                    </p>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="e.g. yourname@upi"
                        className="flex-1 bg-background/50 border border-border/40 rounded-lg px-2.5 py-1.5 text-xs font-mono text-white outline-none focus:border-primary/50"
                        value={tempUpiId}
                        onChange={(e) => setTempUpiId(e.target.value)}
                      />
                      <Button
                        size="sm"
                        onClick={handleSaveUpiId}
                        className="h-8 text-xs font-bold"
                      >
                        Save
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}

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
                className={cn(
                  "flex-1 h-13 text-xs font-black uppercase tracking-widest text-white border-none shadow-glow active:scale-95 transition-all",
                  isCredit 
                    ? "bg-gradient-to-r from-emerald-500 to-teal-500 shadow-emerald-500/20"
                    : "bg-gradient-primary"
                )}
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
