import { Plus, Trash2, MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { cn, formatCurrency } from '@/lib/utils';
import { AppSettings, BudgetGoal, ExpenseCategory } from '@/types/expense';
import { CategoryDefinition, categoryService, iconMap } from '@/lib/category-service';
import { SubModuleHeader } from './Common';

interface BudgetControlsModuleProps {
  settings: AppSettings;
  categories: CategoryDefinition[];
  newBudget: Partial<BudgetGoal>;
  setNewBudget: React.Dispatch<React.SetStateAction<Partial<BudgetGoal>>>;
  updateSettings: (updates: Partial<AppSettings>) => void;
  onBack: () => void;
}

export function BudgetControlsModule({
  settings,
  categories,
  newBudget,
  setNewBudget,
  updateSettings,
  onBack
}: BudgetControlsModuleProps) {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
      <SubModuleHeader title="Budget Controls" onBack={onBack} />
      
      <div className="space-y-6">
        <div className="p-5 rounded-3xl bg-white dark:bg-card/30 border border-border/50 dark:border-border/40 space-y-4 shadow-sm dark:shadow-none">
           <p className="text-[11px] font-black uppercase tracking-widest text-muted-foreground ml-1">New Spending Goal</p>
           <div className="grid grid-cols-1 gap-3">
              <Select value={newBudget.category} onValueChange={v => setNewBudget(p => ({ ...p, category: v as ExpenseCategory }))}>
                <SelectTrigger className="bg-muted/50 border-border/60 h-12 rounded-2xl text-sm">
                  <SelectValue placeholder="Select category..." />
                </SelectTrigger>
                <SelectContent className="rounded-2xl">
                  {categories.filter(c => c.isVisible).map(c => {
                    const Icon = iconMap[c.iconName] || MoreHorizontal;
                    return (
                      <SelectItem key={c.id} value={c.id} className="rounded-xl">
                        <div className="flex items-center gap-2">
                          <Icon className={cn("h-4 w-4", c.color)} />
                          {c.label}
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              <div className="grid grid-cols-2 gap-3">
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-bold">₹</span>
                  <Input
                    type="number"
                    value={newBudget.limit || ''}
                    onChange={e => setNewBudget(p => ({ ...p, limit: Number(e.target.value) }))}
                    placeholder="Limit"
                    className="pl-8 bg-muted/50 border-border/60 h-12 rounded-2xl text-sm font-bold"
                  />
                </div>
                <Select value={newBudget.period} onValueChange={v => setNewBudget(p => ({ ...p, period: v as BudgetGoal['period'] }))}>
                  <SelectTrigger className="bg-muted/50 border-border/60 h-12 rounded-2xl text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl">
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="quarterly">Quarterly</SelectItem>
                    <SelectItem value="yearly">Yearly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button
                onClick={() => {
                  if (!newBudget.category || !newBudget.limit) return;
                  const budget: BudgetGoal = {
                    category: newBudget.category,
                    limit: Number(newBudget.limit),
                    period: newBudget.period as BudgetGoal['period'] || 'monthly',
                  };
                  const updatedBudgets = [...(settings.budgets || []).filter(b => b.category !== budget.category), budget];
                  updateSettings({ budgets: updatedBudgets });
                  setNewBudget({ period: 'monthly' });
                  toast.success(`Budget goal set!`);
                }}
                disabled={!newBudget.category || !newBudget.limit}
                className="h-12 text-sm w-full gap-2 rounded-2xl bg-primary text-white shadow-lg shadow-primary/20"
              >
                <Plus className="h-4 w-4" /> Add Goal
              </Button>
           </div>
        </div>

        <div className="grid grid-cols-1 gap-2">
          {settings.budgets.map(b => {
            const cat = categoryService.getById(b.category);
            const Icon = iconMap[cat.iconName] || MoreHorizontal;
            return (
              <div key={b.category} className="flex items-center gap-3 p-4 rounded-3xl bg-white dark:bg-card/30 border border-border/50 dark:border-border/40 shadow-sm dark:shadow-none">
                <div className={cn("h-10 w-10 rounded-2xl flex items-center justify-center shrink-0 shadow-sm", cat.bgColor)}>
                  <Icon className={cn("h-5 w-5", cat.color)} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold truncate">{cat.label}</p>
                  <p className="text-[10px] font-mono text-muted-foreground uppercase">{formatCurrency(b.limit)} / {b.period}</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 text-destructive hover:bg-destructive/10 rounded-xl"
                  onClick={() => {
                    updateSettings({ budgets: settings.budgets.filter(x => x.category !== b.category) });
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
