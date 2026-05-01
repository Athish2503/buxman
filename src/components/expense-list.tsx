import { useState, useMemo, useEffect } from 'react';
import { format } from 'date-fns';
import {
  Edit, Trash2, Eye, Filter, Download, Search,
  Receipt, ChevronDown, CheckSquare, Square, X,
  SlidersHorizontal, FileText, FileSpreadsheet, Briefcase,
  MoreVertical, ArrowUpDown, Tag, Share2, ZoomIn, RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';

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
import { Checkbox } from '@/components/ui/checkbox';

import { Expense, ExpenseStatus, ExpenseSummary } from '@/types/expense';
import { getCategoryConfig } from '@/lib/categories';
import { categoryService } from '@/lib/category-service';
import { generateExpensesPDF } from '@/lib/pdf-generator';
import { exportCSV } from '@/lib/csv-exporter';
import { settingsService } from '@/lib/settings';
import { haptics } from '@/lib/haptics';
import { ExpenseForm } from './expense-form';
import { formatCurrency, cn } from '@/lib/utils';
import { ExportDialog } from './export-dialog';
import { ImageViewer } from './image-viewer';
import { ExpenseItem } from './expense-item';
import { PullToRefresh } from './pull-to-refresh';

interface ExpenseListProps {
  expenses: Expense[];
  initialFilterType?: 'all' | 'personal' | 'reimbursable';
  showTypeTabs?: boolean;
  title?: string;
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
  expenses, initialFilterType = 'all', showTypeTabs = true, title, onUpdateExpense, 
  onDeleteExpense, onDeleteAll, onBatchDelete, onBatchStatus
}: ExpenseListProps) {
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterType, setFilterType] = useState<'all' | 'personal' | 'reimbursable'>(initialFilterType);
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('date');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [filterOpen, setFilterOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'cards' | 'table'>(() => 
    typeof window !== 'undefined' && window.innerWidth < 640 ? 'cards' : 'table'
  );
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [viewingReceipt, setViewingReceipt] = useState<string | null>(null);

  // Sync filter when changed from parent (dashboard buttons)
  useEffect(() => {
    setFilterType(initialFilterType);
  }, [initialFilterType]);

  const filteredExpenses = useMemo(() => {
    let list = expenses.filter(e => {
      const catOk = filterCategory === 'all' || e.category === filterCategory;
      const statusOk = filterStatus === 'all' || e.status === filterStatus;
      const q = search.toLowerCase();
      const searchOk = !q || e.vendor.toLowerCase().includes(q) ||
        e.description.toLowerCase().includes(q) ||
        (e.tags || []).some(t => t.includes(q)) ||
        (e.projectCode || '').toLowerCase().includes(q);
      const typeOk = filterType === 'all' || 
        (filterType === 'personal' && !e.isReimbursement) || 
        (filterType === 'reimbursable' && e.isReimbursement);
      return catOk && statusOk && searchOk && typeOk;
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

  const handleRefresh = async () => {
    await new Promise(resolve => setTimeout(resolve, 1000));
    toast.success('Updated');
  };

  const handleStatusChange = (id: string, status: ExpenseStatus) => {
    const exp = expenses.find(e => e.id === id);
    if (exp) onUpdateExpense({ ...exp, status });
  };

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

  const handleExportPDF = async (shareMessage?: string) => {
    const settings = settingsService.get();
    const dataToExport = selected.size > 0 
      ? filteredExpenses.filter(e => selected.has(e.id))
      : filteredExpenses;
    
    if (dataToExport.length === 0) {
      toast.error('No expenses to export');
      return;
    }

    const toastId = toast.loading('Generating PDF report...');
    try {
      const exportSummary = selected.size > 0 ? {
        total: dataToExport.reduce((s, e) => s + e.amount, 0),
        pending: dataToExport.filter(e => e.status === 'pending').reduce((s, e) => s + e.amount, 0),
        approved: dataToExport.filter(e => e.status === 'approved').reduce((s, e) => s + e.amount, 0),
        reimbursed: dataToExport.filter(e => e.status === 'reimbursed').reduce((s, e) => s + e.amount, 0),
        rejected: dataToExport.filter(e => e.status === 'rejected').reduce((s, e) => s + e.amount, 0),
        count: dataToExport.length,
      } : summary;

      await generateExpensesPDF(dataToExport, exportSummary, {
        title: 'Expense Reimbursement Invoice',
        billedTo: settings.billedTo,
        billedFrom: settings.billedFrom,
        shareMessage,
      });
      toast.success('Report generated successfully', { id: toastId });
    } catch (error) {
      console.error(error);
      toast.error('Failed to generate PDF', { id: toastId });
    }
  };

  const handleExportCSV = async () => {
    const dataToExport = selected.size > 0 
      ? filteredExpenses.filter(e => selected.has(e.id))
      : filteredExpenses;
    
    if (dataToExport.length === 0) {
      toast.error('No expenses to export');
      return;
    }

    const toastId = toast.loading('Exporting CSV...');
    try {
      await exportCSV(dataToExport);
      toast.success('CSV exported successfully', { id: toastId });
    } catch (error) {
      console.error(error);
      toast.error('Failed to export CSV', { id: toastId });
    }
  };

  const activeFilters = [filterCategory !== 'all', filterStatus !== 'all'].filter(Boolean).length;

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
            {categoryService.getAll().map((cat) => (
              <SelectItem key={cat.id} value={cat.id}>{cat.label}</SelectItem>
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
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Type</p>
        <div className="grid grid-cols-3 gap-2">
          {(['all', 'personal', 'reimbursable'] as const).map(t => (
            <button
              key={t}
              onClick={() => {
                haptics.selection();
                setFilterType(t);
              }}
              className={cn(
                "py-1.5 px-3 rounded-lg text-xs font-medium border capitalize transition-all",
                filterType === t
                  ? "border-primary bg-primary/15 text-primary"
                  : "border-border text-muted-foreground hover:border-border/80"
              )}
            >
              {t}
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
    </div>
  );

  return (
    <div className="space-y-4">
      {selected.size > 0 && (
        <div className="glass border border-primary/30 rounded-2xl p-3 flex flex-col gap-3 animate-slide-right shadow-2xl">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-bold text-primary uppercase tracking-wider">{selected.size} Selected</span>
            <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={clearSelection}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            <div className="flex flex-wrap gap-1.5 flex-1">
              {(['approved', 'reimbursed', 'rejected'] as ExpenseStatus[]).map(s => (
                <Button key={s} size="sm" variant="outline" className="h-8 text-[10px] px-2.5 capitalize font-bold" onClick={() => { onBatchStatus?.(Array.from(selected), s); clearSelection(); }}>
                  {s}
                </Button>
              ))}
              <Button size="sm" variant="outline" className="h-8 text-[10px] px-2.5 text-destructive border-destructive/20 font-bold" onClick={() => { onBatchDelete?.(Array.from(selected)); clearSelection(); }}>
                Delete
              </Button>
            </div>
            <Button size="sm" className="h-8 text-[10px] px-3 bg-primary text-white font-bold" onClick={() => setExportDialogOpen(true)}>
              Share PDF
            </Button>
          </div>
        </div>
      )}

      {/* Module Title */}
      {title && (
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xl font-bold tracking-tight">{title}</h2>
          <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20">
            {filteredExpenses.length} items
          </Badge>
        </div>
      )}

      {/* Top Level Type Tabs */}
      {showTypeTabs && (
        <div className="flex bg-muted/40 p-1 rounded-2xl w-full">
        {(['all', 'personal', 'reimbursable'] as const).map(t => {
          const active = filterType === t;
          const count = expenses.filter(e => {
            if (t === 'all') return true;
            if (t === 'personal') return !e.isReimbursement;
            return e.isReimbursement;
          }).length;
          
          return (
            <button
              key={t}
              onClick={() => {
                haptics.selection();
                setFilterType(t);
              }}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all duration-300",
                active 
                  ? "bg-background text-foreground shadow-lg scale-[1.02] border border-border/50" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <span className="capitalize">{t}</span>
              <span className={cn(
                "px-1.5 py-0.5 rounded-md text-[9px]",
                active ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground/60"
              )}>
                {count}
              </span>
            </button>
          );
        })}
      </div>
      )}

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 bg-muted/50 h-10" />
        </div>
        <div className="flex bg-muted/40 p-1 rounded-xl border">
          <button onClick={() => setViewMode('cards')} className={cn("h-8 px-2.5 rounded-lg transition-all", viewMode === 'cards' ? "bg-background shadow-sm" : "text-muted-foreground")}><MoreVertical className="h-3.5 w-3.5 rotate-90" /></button>
          <button onClick={() => setViewMode('table')} className={cn("h-8 px-2.5 rounded-lg transition-all", viewMode === 'table' ? "bg-background shadow-sm" : "text-muted-foreground")}><ArrowUpDown className="h-3.5 w-3.5" /></button>
        </div>
        <Sheet open={filterOpen} onOpenChange={setFilterOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon" className="h-10 w-10 shrink-0"><SlidersHorizontal className="h-4 w-4" /></Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="glass rounded-t-2xl"><FilterPanel /></SheetContent>
        </Sheet>
      </div>

      <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
        {viewMode === 'cards' ? (
          <PullToRefresh onRefresh={handleRefresh}>
            <div className="space-y-1 py-2">
              {filteredExpenses.map(expense => (
                <ExpenseItem
                  key={expense.id}
                  expense={expense}
                  isSelected={selected.has(expense.id)}
                  onToggleSelect={toggleSelect}
                  onView={setSelectedExpense}
                  onEdit={setEditingExpense}
                  onDelete={onDeleteExpense}
                  onStatusChange={handleStatusChange}
                />
              ))}
            </div>
          </PullToRefresh>
        ) : (
          <div className="rounded-xl border border-border/60 bg-card/40 overflow-hidden overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-muted/30 border-b">
                  <th className="p-3 w-10"><Checkbox checked={selected.size === filteredExpenses.length} onCheckedChange={toggleSelectAll} /></th>
                  <th className="p-3 text-[10px] font-bold uppercase text-muted-foreground">Vendor</th>
                  <th className="p-3 text-[10px] font-bold uppercase text-muted-foreground text-right">Amount</th>
                  <th className="p-3 text-[10px] font-bold uppercase text-muted-foreground">Status</th>
                  <th className="p-3 w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredExpenses.map(expense => (
                  <tr key={expense.id} className={cn("hover:bg-muted/20", selected.has(expense.id) ? "bg-primary/5" : "")} onClick={() => toggleSelect(expense.id)}>
                    <td className="p-3" onClick={e => e.stopPropagation()}><Checkbox checked={selected.has(expense.id)} onCheckedChange={() => toggleSelect(expense.id)} /></td>
                    <td className="p-3">
                      <div className="flex items-center gap-1.5">
                        <p className="text-xs font-bold">{expense.vendor}</p>
                        {expense.isReimbursement && <Briefcase className="h-2.5 w-2.5 text-primary" />}
                      </div>
                      <p className="text-[10px] text-muted-foreground">{format(new Date(expense.date), 'dd/MM/yy')}</p>
                    </td>
                    <td className="p-3 text-right text-xs font-mono font-bold">{formatCurrency(expense.amount)}</td>
                    <td className="p-3"><Badge className={cn("text-[9px] uppercase", STATUS_COLORS[expense.status])}>{expense.status}</Badge></td>
                    <td className="p-3" onClick={e => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7"><MoreVertical className="h-3.5 w-3.5" /></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="glass">
                          <DropdownMenuItem onClick={() => setSelectedExpense(expense)}>View</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setEditingExpense(expense)}>Edit</DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive" onClick={() => onDeleteExpense(expense.id)}>Delete</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Dialog open={!!selectedExpense} onOpenChange={open => !open && setSelectedExpense(null)}>
        <DialogContent className="glass max-w-sm mx-4">
          <DialogHeader><DialogTitle>{selectedExpense?.vendor}</DialogTitle></DialogHeader>
          {selectedExpense && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-muted/40 p-3 rounded-xl"><p className="text-[10px] uppercase text-muted-foreground">Amount</p><p className="font-bold">{formatCurrency(selectedExpense.amount)}</p></div>
                <div className="bg-muted/40 p-3 rounded-xl"><p className="text-[10px] uppercase text-muted-foreground">Status</p><Badge className={STATUS_COLORS[selectedExpense.status]}>{selectedExpense.status}</Badge></div>
              </div>
              {selectedExpense.receiptImage && <img src={selectedExpense.receiptImage} className="w-full rounded-xl" />}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <ImageViewer src={viewingReceipt || ''} isOpen={!!viewingReceipt} onClose={() => setViewingReceipt(null)} title="Receipt" />
      <Dialog open={!!editingExpense} onOpenChange={open => !open && setEditingExpense(null)}>
        <DialogContent className="glass max-w-xl max-h-[92vh] overflow-y-auto">
          {editingExpense && <ExpenseForm onSubmit={exp => { onUpdateExpense(exp); setEditingExpense(null); }} initialData={editingExpense} isEdit onClose={() => setEditingExpense(null)} />}
        </DialogContent>
      </Dialog>
      <ExportDialog isOpen={exportDialogOpen} onClose={() => setExportDialogOpen(false)} onConfirm={handleExportPDF} title="Export PDF" count={filteredExpenses.length} />
    </div>
  );
}
