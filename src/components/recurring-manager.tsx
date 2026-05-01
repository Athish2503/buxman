import { useState } from 'react';
import { format } from 'date-fns';
import { RepeatIcon, Plus, Trash2, Play, Pause, ChevronRight, Clock } from 'lucide-react';
import { RecurringExpense } from '@/types/recurring';
import { Expense, ExpenseCategory } from '@/types/expense';
import { recurringService } from '@/lib/recurring';
import { categoryConfig } from '@/lib/categories';
import { haptics } from '@/lib/haptics';
import { formatCurrency, cn } from '@/lib/utils';
import { toast } from 'sonner';

interface RecurringManagerProps {
  onAddExpense: (e: Expense) => void;
}

const FREQ_LABELS = { daily: 'Daily', weekly: 'Weekly', monthly: 'Monthly', quarterly: 'Quarterly' };

export function RecurringManager({ onAddExpense }: RecurringManagerProps) {
  const [items, setItems] = useState<RecurringExpense[]>(() => recurringService.getAll());
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState<Partial<RecurringExpense>>({
    frequency: 'monthly',
    isActive: true,
    nextDue: format(new Date(), 'yyyy-MM-dd'),
  });

  const reload = () => setItems(recurringService.getAll());

  const addNew = () => {
    if (!draft.vendor || !draft.amount || !draft.category) {
      toast.error('Fill in vendor, amount and category');
      return;
    }
    const rec: RecurringExpense = {
      id: crypto.randomUUID(),
      name: draft.name || draft.vendor!,
      vendor: draft.vendor!,
      category: draft.category as ExpenseCategory,
      amount: Number(draft.amount),
      description: draft.description,
      projectCode: draft.projectCode,
      frequency: draft.frequency as RecurringExpense['frequency'],
      nextDue: draft.nextDue || format(new Date(), 'yyyy-MM-dd'),
      isActive: true,
      createdAt: new Date().toISOString(),
    };
    recurringService.add(rec);
    reload();
    setAdding(false);
    setDraft({ frequency: 'monthly', isActive: true, nextDue: format(new Date(), 'yyyy-MM-dd') });
    haptics.success();
    toast.success('Recurring expense added');
  };

  const addNow = (r: RecurringExpense) => {
    const expense: Expense = {
      id: crypto.randomUUID(),
      vendor: r.vendor,
      category: r.category,
      amount: r.amount,
      date: format(new Date(), 'yyyy-MM-dd'),
      description: r.description || '',
      status: 'pending',
      currency: 'INR',
      tags: r.tags,
      projectCode: r.projectCode,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    onAddExpense(expense);
    recurringService.markAdded(r.id);
    reload();
    haptics.success();
    toast.success(`Added "${r.vendor}" expense`);
  };

  const toggle = (r: RecurringExpense) => {
    recurringService.update(r.id, { isActive: !r.isActive });
    reload();
    haptics.light();
  };

  const remove = (id: string) => {
    recurringService.remove(id);
    reload();
    haptics.heavy();
    toast.success('Removed recurring expense');
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-bold text-lg">Recurring</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Auto-fill expenses on schedule</p>
        </div>
        <button
          onClick={() => setAdding(p => !p)}
          className="h-9 px-3 rounded-xl bg-primary/15 text-primary text-sm font-semibold flex items-center gap-1.5 active:scale-95 transition-all"
        >
          <Plus className="h-4 w-4" />
          Add
        </button>
      </div>

      {/* Add form */}
      {adding && (
        <div className="rounded-2xl border border-border/60 bg-card/80 p-4 space-y-3 animate-scale-in">
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">New Recurring</p>

          <input
            placeholder="Vendor name *"
            value={draft.vendor || ''}
            onChange={e => setDraft(p => ({ ...p, vendor: e.target.value }))}
            className="w-full h-10 px-3 rounded-xl bg-muted/40 border border-border/40 text-sm outline-none focus:border-primary/50"
          />

          <div className="grid grid-cols-2 gap-2">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">₹</span>
              <input
                type="number"
                placeholder="Amount *"
                value={draft.amount || ''}
                onChange={e => setDraft(p => ({ ...p, amount: Number(e.target.value) }))}
                className="w-full h-10 pl-7 pr-3 rounded-xl bg-muted/40 border border-border/40 text-sm outline-none focus:border-primary/50"
              />
            </div>
            <select
              value={draft.frequency}
              onChange={e => setDraft(p => ({ ...p, frequency: e.target.value as RecurringExpense['frequency'] }))}
              className="h-10 px-3 rounded-xl bg-muted/40 border border-border/40 text-sm outline-none focus:border-primary/50"
            >
              {Object.entries(FREQ_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>

          <select
            value={draft.category || ''}
            onChange={e => setDraft(p => ({ ...p, category: e.target.value as ExpenseCategory }))}
            className="w-full h-10 px-3 rounded-xl bg-muted/40 border border-border/40 text-sm outline-none focus:border-primary/50"
          >
            <option value="">Category *</option>
            {Object.entries(categoryConfig).map(([k, c]) => <option key={k} value={k}>{c.label}</option>)}
          </select>

          <div className="grid grid-cols-2 gap-2">
            <input
              placeholder="Project (opt)"
              value={draft.projectCode || ''}
              onChange={e => setDraft(p => ({ ...p, projectCode: e.target.value }))}
              className="h-10 px-3 rounded-xl bg-muted/40 border border-border/40 text-sm outline-none focus:border-primary/50 font-mono"
            />
            <input
              type="date"
              value={draft.nextDue || ''}
              onChange={e => setDraft(p => ({ ...p, nextDue: e.target.value }))}
              className="h-10 px-3 rounded-xl bg-muted/40 border border-border/40 text-sm outline-none focus:border-primary/50"
            />
          </div>

          <div className="flex gap-2 pt-1">
            <button onClick={() => setAdding(false)} className="flex-1 h-10 rounded-xl border border-border/50 text-sm text-muted-foreground">
              Cancel
            </button>
            <button onClick={addNew} className="flex-1 h-10 rounded-xl bg-gradient-primary text-white text-sm font-semibold">
              Save
            </button>
          </div>
        </div>
      )}

      {/* List */}
      {items.length === 0 && !adding && (
        <div className="text-center py-12">
          <RepeatIcon className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm font-semibold text-muted-foreground">No recurring expenses</p>
          <p className="text-xs text-muted-foreground mt-1">Add subscriptions, rent, or regular costs</p>
        </div>
      )}

      <div className="space-y-2">
        {items.map(r => {
          const cfg = categoryConfig[r.category];
          const Icon = cfg.icon;
          const isDue = new Date(r.nextDue) <= new Date();
          return (
            <div key={r.id} className={cn(
              'rounded-xl border p-3.5 flex items-center gap-3 transition-all',
              r.isActive ? 'border-border/60 bg-card/80' : 'border-border/30 bg-muted/20 opacity-60'
            )}>
              <div className={cn('h-10 w-10 rounded-xl flex items-center justify-center shrink-0', cfg.bgColor)}>
                <Icon className={cn('h-5 w-5', cfg.color)} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="text-sm font-semibold truncate">{r.vendor}</p>
                  {isDue && r.isActive && (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-warning/20 text-warning border border-warning/30 shrink-0">DUE</span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {formatCurrency(r.amount)} · {FREQ_LABELS[r.frequency]} · Next: {format(new Date(r.nextDue), 'dd MMM')}
                </p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {r.isActive && (
                  <button
                    onClick={() => addNow(r)}
                    className="h-8 w-8 rounded-xl bg-primary/15 text-primary flex items-center justify-center active:scale-95"
                    title="Add expense now"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                )}
                <button
                  onClick={() => toggle(r)}
                  className="h-8 w-8 rounded-xl bg-muted/50 text-muted-foreground flex items-center justify-center active:scale-95"
                >
                  {r.isActive ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                </button>
                <button
                  onClick={() => remove(r.id)}
                  className="h-8 w-8 rounded-xl bg-destructive/10 text-destructive flex items-center justify-center active:scale-95"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
