import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, X, ArrowRight, Wallet, Tag, FileText, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { haptics } from '@/lib/haptics';
import { formatCurrency, cn } from '@/lib/utils';
import { ExpenseCategory } from '@/types/expense';
import { categoryConfig } from '@/lib/categories';
import { smsParser } from '@/lib/sms-parser';

interface SMSExpenseNudgeProps {
  onAdd: (expense: any) => void;
}

export function SMSExpenseNudge({ onAdd }: SMSExpenseNudgeProps) {
  const [detected, setDetected] = useState<any>(null);
  const [category, setCategory] = useState<ExpenseCategory>('other');
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const handleSimulate = (e: any) => {
      const parsed = smsParser.parse(e.detail.body);
      if (parsed) {
        setDetected(parsed);
        haptics.heavy();
      }
    };

    window.addEventListener('simulate-sms', handleSimulate);
    return () => window.removeEventListener('simulate-sms', handleSimulate);
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    haptics.success();
    
    const expense = {
      id: crypto.randomUUID(),
      ...detected,
      category,
      description: notes,
      status: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onAdd(expense);
    
    setTimeout(() => {
      setDetected(null);
      setIsSaving(false);
      setNotes('');
    }, 500);
  };

  return (
    <AnimatePresence>
      {detected && (
        <div className="fixed inset-x-4 top-10 z-[100] flex justify-center pointer-events-none">
          <motion.div
            initial={{ y: -100, opacity: 0, scale: 0.9 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: -100, opacity: 0, scale: 0.9 }}
            className="w-full max-w-sm glass border border-primary/30 shadow-xl rounded-[2rem] overflow-hidden pointer-events-auto"
          >
            <div className="p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center">
                    <Bell className="h-4 w-4 text-primary animate-bounce" />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-primary">Transaction Detected</span>
                </div>
                <button onClick={() => setDetected(null)} className="p-1 hover:bg-muted rounded-full transition-colors">
                  <X className="h-4 w-4 text-muted-foreground" />
                </button>
              </div>

              <div className="space-y-1">
                <h3 className="text-2xl font-black tracking-tight">{formatCurrency(detected.amount)}</h3>
                <p className="text-sm text-muted-foreground flex items-center gap-1.5 font-medium">
                  <Wallet className="h-3.5 w-3.5" />
                  {detected.vendor}
                </p>
              </div>

              <div className="space-y-3 pt-2">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1 flex items-center gap-1.5">
                    <Tag className="h-3 w-3" /> Category
                  </label>
                  <div className="flex overflow-x-auto no-scrollbar gap-2 pb-1">
                    {Object.entries(categoryConfig).map(([id, cfg]) => (
                      <button
                        key={id}
                        onClick={() => { setCategory(id as ExpenseCategory); haptics.selection(); }}
                        className={cn(
                          "flex-shrink-0 px-3 py-1.5 rounded-full text-[11px] font-bold transition-all border",
                          category === id 
                            ? "bg-primary text-white border-primary shadow-glow" 
                            : "bg-muted/50 border-border/40 text-muted-foreground hover:border-primary/30"
                        )}
                      >
                        {cfg.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1 flex items-center gap-1.5">
                    <FileText className="h-3 w-3" /> Notes
                  </label>
                  <Input
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="What was this for?"
                    className="h-10 bg-background/50 border-white/10 rounded-xl text-sm"
                  />
                </div>
              </div>

              <Button
                onClick={handleSave}
                disabled={isSaving}
                className="w-full h-12 rounded-2xl bg-gradient-primary font-bold shadow-glow relative overflow-hidden group active:scale-95 transition-all"
              >
                {isSaving ? (
                  <Check className="h-5 w-5 animate-scale-in" />
                ) : (
                  <span className="flex items-center gap-2">
                    Add to Expenses <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </span>
                )}
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
