import { RecurringExpense, QuickTemplate, AppMeta } from '@/types/recurring';
import { Expense } from '@/types/expense';
import { storageEngine } from '@/lib/storage-engine';
import { format, addDays, addWeeks, addMonths, addQuarters, isBefore, startOfDay } from 'date-fns';

const KEYS = {
  recurring: 'reimburse_recurring_v1',
  templates: 'reimburse_templates_v1',
  meta:      'reimburse_meta_v1',
  vendors:   'reimburse_vendors_v1',
};

/* ─── Recurring ─────────────────────────────────────────────────── */
export const recurringService = {
  getAll(): RecurringExpense[] {
    try { return JSON.parse(localStorage.getItem(KEYS.recurring) || '[]'); } catch { return []; }
  },
  save(items: RecurringExpense[]) {
    storageEngine.set(KEYS.recurring, JSON.stringify(items));
  },
  add(r: RecurringExpense) {
    const all = this.getAll();
    this.save([r, ...all]);
  },
  update(id: string, updates: Partial<RecurringExpense>) {
    const all = this.getAll().map(r => r.id === id ? { ...r, ...updates } : r);
    this.save(all);
  },
  remove(id: string) {
    this.save(this.getAll().filter(r => r.id !== id));
  },
  /** Returns expenses due today or overdue (active ones), marks them as added */
  getDue(): RecurringExpense[] {
    const today = startOfDay(new Date());
    return this.getAll().filter(r =>
      r.isActive && isBefore(startOfDay(new Date(r.nextDue)), today)
    );
  },
  markAdded(id: string) {
    const r = this.getAll().find(x => x.id === id);
    if (!r) return;
    const next = nextDueDate(r.nextDue, r.frequency);
    this.update(id, { lastAdded: new Date().toISOString(), nextDue: next });
  },
};

function nextDueDate(from: string, freq: RecurringExpense['frequency']): string {
  const d = new Date(from);
  if (freq === 'daily')     return format(addDays(d, 1),    'yyyy-MM-dd');
  if (freq === 'weekly')    return format(addWeeks(d, 1),   'yyyy-MM-dd');
  if (freq === 'quarterly') return format(addQuarters(d, 1),'yyyy-MM-dd');
  return format(addMonths(d, 1), 'yyyy-MM-dd');
}

/* ─── Templates ─────────────────────────────────────────────────── */
export const templateService = {
  getAll(): QuickTemplate[] {
    try { return JSON.parse(localStorage.getItem(KEYS.templates) || '[]'); } catch { return []; }
  },
  save(items: QuickTemplate[]) {
    storageEngine.set(KEYS.templates, JSON.stringify(items));
  },
  add(t: QuickTemplate) {
    this.save([t, ...this.getAll()]);
  },
  use(id: string) {
    const all = this.getAll().map(t =>
      t.id === id ? { ...t, usageCount: t.usageCount + 1 } : t
    );
    this.save(all);
  },
  remove(id: string) {
    this.save(this.getAll().filter(t => t.id !== id));
  },
  /** Top N by usage */
  getTop(n = 4): QuickTemplate[] {
    return [...this.getAll()].sort((a, b) => b.usageCount - a.usageCount).slice(0, n);
  },
};

/* ─── App Meta ──────────────────────────────────────────────────── */
const defaultMeta: AppMeta = {
  onboardingDone: false,
  totalAdded:     0,
  firstLaunch:    new Date().toISOString(),
};
export const metaService = {
  get(): AppMeta {
    try { return { ...defaultMeta, ...JSON.parse(localStorage.getItem(KEYS.meta) || '{}') }; }
    catch { return defaultMeta; }
  },
  save(m: AppMeta) { storageEngine.set(KEYS.meta, JSON.stringify(m)); },
  markOnboarded() { this.save({ ...this.get(), onboardingDone: true }); },
  bumpTotal()     { const m = this.get(); this.save({ ...m, totalAdded: m.totalAdded + 1 }); },
};

/* ─── Vendor suggestions ─────────────────────────────────────────── */
export const vendorService = {
  /** Build sorted unique vendor list from expense history */
  getFromExpenses(expenses: Expense[]): string[] {
    const counts: Record<string, number> = {};
    for (const e of expenses) counts[e.vendor] = (counts[e.vendor] || 0) + 1;
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([v]) => v);
  },
};
