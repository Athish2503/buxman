import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import {
  Edit, Trash2, Eye, Filter, Download, Search,
  Receipt, ChevronDown, CheckSquare, Square, X,
  SlidersHorizontal, FileText, FileSpreadsheet,
  MoreVertical, ArrowUpDown, Tag
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';

import { Expense, ExpenseStatus, ExpenseSummary } from '@/types/expense';
import { getCategoryConfig, categoryConfig } from '@/lib/categories';
import { generateExpensesPDF } from '@/lib/pdf-generator';
import { exportCSV } from '@/lib/csv-exporter';
import { settingsService } from '@/lib/settings';
import { haptics } from '@/lib/haptics';
import { ExpenseForm } from './expense-form';
import { formatCurrency, cn } from '@/lib/utils';

interface ExpenseListProps {
  expenses: Expense[];
  onUpdateExpense: (expense: Expense) => void;
  onDeleteExpense: (id: string) => void;
  onDeleteAll: () => void;
  onBatchDelete?: (ids: string[]) => void;
  onBatchStatus?: (ids: string[], status: ExpenseStatus) => void;
}

type SortKey = 'date' | 'amount' | 'vendor' | 'status';
type SortDir = 'asc' | 'desc';

const STATUS_COLORS: Record<ExpenseStatus, string> = {
  pending: 'status-pending',
  approved: 'status-approved',
  reimbursed: 'status-reimbursed',
  rejected: 'status-rejected',
};

export function ExpenseList({
  expenses, onUpdateExpense, onDeleteExpense, onDeleteAll,
  onBatchDelete, onBatchStatus
}: ExpenseListProps) {
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('date');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [filterOpen, setFilterOpen] = useState(false);

  const filteredExpenses = useMemo(() => {
    let list = expenses.filter(e => {
      const catOk = filterCategory === 'all' || e.category === filterCategory;
      const statusOk = filterStatus === 'all' || e.status === filterStatus;
      const q = search.toLowerCase();
      const searchOk = !q || e.vendor.toLowerCase().includes(q) ||
        e.description.toLowerCase().includes(q) ||
        (e.tags || []).some(t => t.includes(q)) ||
        (e.projectCode || '').toLowerCase().includes(q);
      return catOk && statusOk && searchOk;
    });

    list.sort((a, b) => {
      let cmp = 0;
      if (sortKey === 'date') cmp = new Date(a.date).getTime() - new Date(b.date).getTime();
      else if (sortKey === 'amount') cmp = a.amount - b.amount;
      else if (sortKey === 'vendor') cmp = a.vendor.localeCompare(b.vendor);
      else if (sortKey === 'status') cmp = a.status.localeCompare(b.status);
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return list;
  }, [expenses, filterCategory, filterStatus, search, sortKey, sortDir]);

  const summary: ExpenseSummary = useMemo(() => ({
    total: filteredExpenses.reduce((s, e) => s + e.amount, 0),
    pending: filteredExpenses.filter(e => e.status === 'pending').reduce((s, e) => s + e.amount, 0),
    approved: filteredExpenses.filter(e => e.status === 'approved').reduce((s, e) => s + e.amount, 0),
    reimbursed: filteredExpenses.filter(e => e.status === 'reimbursed').reduce((s, e) => s + e.amount, 0),
    rejected: filteredExpenses.filter(e => e.status === 'rejected').reduce((s, e) => s + e.amount, 0),
    count: filteredExpenses.length,
  }), [filteredExpenses]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('desc'); }
    haptics.light();
  };

  const toggleSelect = (id: string) => {
    haptics.selection();
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    haptics.selection();
    if (selected.size === filteredExpenses.length) setSelected(new Set());
    else setSelected(new Set(filteredExpenses.map(e => e.id)));
  };

  const clearSelection = () => setSelected(new Set());

  const handleExportPDF = () => {
    const settings = settingsService.get();
    generateExpensesPDF(filteredExpenses, summary, {
      title: 'Expense Reimbursement Invoice',
      billedTo: settings.billedTo,
      billedFrom: settings.billedFrom,
    });
  };

  const handleExportCSV = () => exportCSV(filteredExpenses);

  const activeFilters = [filterCategory !== 'all', filterStatus !== 'all'].filter(Boolean).length;

  // Filter panel (shared between Sheet on mobile and inline on desktop)
  const FilterPanel = () => (
    <div className="space-y-4 p-1">
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Category</p>
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="bg-muted/50 h-9">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {Object.entries(categoryConfig).map(([k, c]) => (
              <SelectItem key={k} value={k}>{c.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Status</p>
        <div className="grid grid-cols-2 gap-2">
          {['all', 'pending', 'approved', 'reimbursed', 'rejected'].map(s => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={cn(
                "py-1.5 px-3 rounded-lg text-xs font-medium border capitalize transition-all",
                filterStatus === s
                  ? "border-primary bg-primary/15 text-primary"
                  : "border-border text-muted-foreground hover:border-border/80"
              )}
            >
              {s === 'all' ? 'All' : s}
            </button>
          ))}
        </div>
      </div>
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Sort By</p>
        <div className="grid grid-cols-2 gap-2">
          {(['date', 'amount', 'vendor', 'status'] as SortKey[]).map(k => (
            <button
              key={k}
              onClick={() => toggleSort(k)}
              className={cn(
                "py-1.5 px-3 rounded-lg text-xs font-medium border capitalize transition-all flex items-center justify-between",
                sortKey === k
                  ? "border-primary bg-primary/15 text-primary"
                  : "border-border text-muted-foreground hover:border-border/80"
              )}
            >
              {k}
              {sortKey === k && (
                <span className="text-[10px]">{sortDir === 'desc' ? '↓' : '↑'}</span>
              )}
            </button>
          ))}
        </div>
      </div>
      {(filterCategory !== 'all' || filterStatus !== 'all') && (
        <Button
          variant="ghost"
          size="sm"
          className="w-full text-muted-foreground h-8"
          onClick={() => { setFilterCategory('all'); setFilterStatus('all'); }}
        >
          <X className="h-3.5 w-3.5 mr-1" /> Clear filters
        </Button>
      )}
    </div>
  );

  if (expenses.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center animate-fade-in">
        <div className="h-20 w-20 rounded-2xl bg-gradient-primary flex items-center justify-center mb-5 shadow-glow">
          <Receipt className="h-10 w-10 text-white" />
        </div>
        <h3 className="text-xl font-bold mb-2">No expenses yet</h3>
        <p className="text-muted-foreground text-sm max-w-xs">
          Add your first expense to start tracking reimbursements and generating invoices.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="glass border border-primary/30 rounded-xl px-4 py-3 flex items-center gap-3 animate-slide-right">
          <span className="text-sm font-semibold text-primary">{selected.size} selected</span>
          <div className="flex-1 flex flex-wrap gap-2">
            {(['approved', 'reimbursed', 'rejected'] as ExpenseStatus[]).map(s => (
              <Button
                key={s}
                size="sm"
                variant="outline"
                className="h-7 text-xs capitalize"
                onClick={() => { onBatchStatus?.(Array.from(selected), s); clearSelection(); }}
              >
                Mark {s}
              </Button>
            ))}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="sm" variant="outline" className="h-7 text-xs text-destructive border-destructive/30 hover:bg-destructive/10">
                  <Trash2 className="h-3 w-3 mr-1" /> Delete
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="glass border-border/50 max-w-sm mx-4">
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete {selected.size} expenses?</AlertDialogTitle>
                  <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction className="bg-destructive" onClick={() => { onBatchDelete?.(Array.from(selected)); clearSelection(); }}>
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 shrink-0" onClick={clearSelection}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Search + Filter bar */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search vendor, notes, tags..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 bg-muted/50 border-border/60 h-10"
          />
          {search && (
            <button className="absolute right-3 top-1/2 -translate-y-1/2" onClick={() => setSearch('')}>
              <X className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
            </button>
          )}
        </div>

        {/* Mobile: sheet filter */}
        <Sheet open={filterOpen} onOpenChange={setFilterOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon" className={cn("h-10 w-10 shrink-0 relative", activeFilters > 0 && "border-primary text-primary")}>
              <SlidersHorizontal className="h-4 w-4" />
              {activeFilters > 0 && (
                <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-primary text-white text-[9px] flex items-center justify-center font-bold">
                  {activeFilters}
                </span>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="glass border-border/50 rounded-t-2xl max-h-[85vh] overflow-y-auto pb-8">
            <SheetHeader className="mb-4">
              <SheetTitle>Filter & Sort</SheetTitle>
            </SheetHeader>
            <FilterPanel />
          </SheetContent>
        </Sheet>

        {/* Export menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon" className="h-10 w-10 shrink-0">
              <Download className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="glass border-border/50">
            <DropdownMenuItem onClick={handleExportPDF} className="gap-2">
              <FileText className="h-4 w-4 text-primary" />
              Export as PDF
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleExportCSV} className="gap-2">
              <FileSpreadsheet className="h-4 w-4 text-success" />
              Export as CSV
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <DropdownMenuItem onSelect={e => e.preventDefault()} className="gap-2 text-destructive focus:text-destructive">
                  <Trash2 className="h-4 w-4" />
                  Delete All
                </DropdownMenuItem>
              </AlertDialogTrigger>
              <AlertDialogContent className="glass border-border/50 max-w-sm mx-4">
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete all {expenses.length} expenses?</AlertDialogTitle>
                  <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction className="bg-destructive" onClick={onDeleteAll}>Delete All</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Results count + select-all */}
      <div className="flex items-center justify-between px-1">
        <p className="text-xs text-muted-foreground">
          <span className="font-semibold text-foreground">{filteredExpenses.length}</span>
          {filteredExpenses.length !== expenses.length && ` of ${expenses.length}`} expenses
          {filteredExpenses.length > 0 && (
            <span className="ml-1">· <span className="font-semibold text-foreground">{formatCurrency(summary.total)}</span></span>
          )}
        </p>
        {filteredExpenses.length > 1 && (
          <button
            onClick={toggleSelectAll}
            className="text-xs text-muted-foreground hover:text-primary transition-colors flex items-center gap-1"
          >
            {selected.size === filteredExpenses.length
              ? <><CheckSquare className="h-3.5 w-3.5" /> Deselect all</>
              : <><Square className="h-3.5 w-3.5" /> Select all</>
            }
          </button>
        )}
      </div>

      {/* Expense cards */}
      <div className="space-y-2 stagger-children">
        {filteredExpenses.map(expense => {
          const cfg = getCategoryConfig(expense.category);
          const Icon = cfg.icon;
          const isSelected = selected.has(expense.id);

          return (
            <div
              key={expense.id}
              className={cn(
                "group relative rounded-xl border transition-all duration-200 animate-fade-in-up",
                isSelected
                  ? "border-primary/50 bg-primary/5"
                  : "border-border/60 bg-card/80 hover:border-border hover:bg-card"
              )}
            >
              {/* Selection tap area (left) */}
              <div
                className="absolute left-0 top-0 bottom-0 w-12 flex items-center justify-center cursor-pointer z-10"
                onClick={() => toggleSelect(expense.id)}
              >
                <div className={cn(
                  "h-4 w-4 rounded border-2 flex items-center justify-center transition-all",
                  isSelected ? "border-primary bg-primary" : "border-border/60 opacity-0 group-hover:opacity-100"
                )}>
                  {isSelected && <div className="h-2 w-2 rounded-sm bg-white" />}
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 pl-12">
                {/* Category icon */}
                <div className={cn(
                  "h-10 w-10 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105",
                  cfg.bgColor
                )}>
                  <Icon className={cn("h-5 w-5", cfg.color)} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="font-semibold text-sm leading-tight truncate">{expense.vendor}</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {cfg.label} · {format(new Date(expense.date), 'dd MMM yyyy')}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-bold text-sm font-mono">{formatCurrency(expense.amount)}</p>
                      <Badge className={cn("mt-1 text-[10px] py-0 px-1.5 h-4 rounded-full capitalize font-medium", STATUS_COLORS[expense.status])}>
                        {expense.status}
                      </Badge>
                    </div>
                  </div>

                  {/* Description */}
                  {expense.description && (
                    <p className="text-xs text-muted-foreground mt-1.5 line-clamp-1">{expense.description}</p>
                  )}

                  {/* Tags + Project */}
                  {((expense.tags && expense.tags.length > 0) || expense.projectCode) && (
                    <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                      {expense.projectCode && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-secondary/15 text-secondary font-mono font-medium">
                          {expense.projectCode}
                        </span>
                      )}
                      {(expense.tags || []).slice(0, 2).map(tag => (
                        <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground flex items-center gap-0.5">
                          <Tag className="h-2 w-2" />{tag}
                        </span>
                      ))}
                      {(expense.tags || []).length > 2 && (
                        <span className="text-[10px] text-muted-foreground">+{expense.tags!.length - 2}</span>
                      )}
                    </div>
                  )}

                  {/* Actions — always visible on mobile, hover on desktop */}
                  <div className="flex items-center gap-0.5 mt-2 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs rounded-lg"
                      onClick={() => setSelectedExpense(expense)}
                    >
                      <Eye className="h-3.5 w-3.5 sm:mr-1" />
                      <span className="hidden sm:inline">View</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs rounded-lg"
                      onClick={() => setEditingExpense(expense)}
                    >
                      <Edit className="h-3.5 w-3.5 sm:mr-1" />
                      <span className="hidden sm:inline">Edit</span>
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-destructive hover:text-destructive rounded-lg">
                          <Trash2 className="h-3.5 w-3.5 sm:mr-1" />
                          <span className="hidden sm:inline">Delete</span>
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="glass border-border/50 max-w-sm mx-4">
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete expense?</AlertDialogTitle>
                          <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction className="bg-destructive" onClick={() => onDeleteExpense(expense.id)}>
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {filteredExpenses.length === 0 && (
          <div className="text-center py-16 animate-fade-in">
            <p className="text-muted-foreground text-sm">No expenses match your filters.</p>
            <Button variant="link" size="sm" className="mt-2" onClick={() => { setFilterCategory('all'); setFilterStatus('all'); setSearch(''); }}>
              Clear all filters
            </Button>
          </div>
        )}
      </div>

      {/* View Dialog */}
      <Dialog open={!!selectedExpense} onOpenChange={open => !open && setSelectedExpense(null)}>
        <DialogContent className="glass border-border/50 max-w-sm mx-4 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedExpense && (() => {
                const cfg = getCategoryConfig(selectedExpense.category);
                const Icon = cfg.icon;
                return (
                  <>
                    <div className={cn("h-7 w-7 rounded-lg flex items-center justify-center", cfg.bgColor)}>
                      <Icon className={cn("h-4 w-4", cfg.color)} />
                    </div>
                    {selectedExpense.vendor}
                  </>
                );
              })()}
            </DialogTitle>
          </DialogHeader>
          {selectedExpense && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Amount', value: formatCurrency(selectedExpense.amount) },
                  { label: 'Date', value: format(new Date(selectedExpense.date), 'dd MMM yyyy') },
                  { label: 'Category', value: getCategoryConfig(selectedExpense.category).label },
                  { label: 'Status', value: null },
                ].map(item => (
                  <div key={item.label} className="bg-muted/40 rounded-xl p-3">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mb-1">{item.label}</p>
                    {item.label === 'Status' ? (
                      <Badge className={cn("capitalize text-xs font-semibold", STATUS_COLORS[selectedExpense.status])}>
                        {selectedExpense.status}
                      </Badge>
                    ) : (
                      <p className="font-semibold text-sm">{item.value}</p>
                    )}
                  </div>
                ))}
              </div>
              {selectedExpense.description && (
                <div className="bg-muted/40 rounded-xl p-3">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mb-1">Notes</p>
                  <p className="text-sm">{selectedExpense.description}</p>
                </div>
              )}
              {(selectedExpense.tags && selectedExpense.tags.length > 0) && (
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mb-2">Tags</p>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedExpense.tags.map(t => (
                      <Badge key={t} variant="secondary" className="text-xs">{t}</Badge>
                    ))}
                  </div>
                </div>
              )}
              {selectedExpense.receiptImage && (
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mb-2">Receipt</p>
                  <img src={selectedExpense.receiptImage} alt="Receipt" className="w-full rounded-xl border border-border/50 max-h-52 object-contain" />
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editingExpense} onOpenChange={open => !open && setEditingExpense(null)}>
        <DialogContent className="glass border-border/50 max-w-xl mx-4 max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Expense</DialogTitle>
          </DialogHeader>
          {editingExpense && (
            <ExpenseForm
              onSubmit={expense => { onUpdateExpense(expense); setEditingExpense(null); }}
              initialData={editingExpense}
              isEdit
              onClose={() => setEditingExpense(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
