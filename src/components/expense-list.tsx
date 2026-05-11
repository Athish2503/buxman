import { useState, useMemo, useEffect } from 'react';
import { format } from 'date-fns';
import {
  Edit, Trash2, Eye, Filter, Download, Search,
  Receipt, ChevronDown, CheckSquare, Square, X,
  SlidersHorizontal, FileText, FileSpreadsheet, Briefcase,
  MoreVertical, ArrowUpDown, Tag, Share2, ZoomIn, RefreshCw,
  Camera, Calendar, Users
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
import { contactService } from '@/lib/contact-service';
import { generateExpensesPDF } from '@/lib/pdf-generator';
import { exportCSV } from '@/lib/csv-exporter';
import { settingsService } from '@/lib/settings';
import { haptics } from '@/lib/haptics';
import { ExpenseForm } from './expense-form';
import { formatCurrency, cn, rewardBurst } from '@/lib/utils';
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

  useEffect(() => {
    setFilterType(initialFilterType);
  }, [initialFilterType]);

  const filteredExpenses = useMemo(() => {
    let list = expenses.filter(e => {
      const catOk = filterCategory === 'all' || e.category === filterCategory;
      const statusOk = filterStatus === 'all' || e.status === filterStatus;
      const q = search.toLowerCase();
      const searchOk = !q || e.vendor.toLowerCase().includes(q) ||
        e.description.toLowerCase().includes(q);
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
  }, [expenses, filterCategory, filterStatus, search, sortKey, sortDir, filterType]);

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

  const contacts = contactService.getContacts();

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

  const groupedExpenses = useMemo(() => {
    const groups: Record<string, { expenses: Expense[], total: number }> = {};
    filteredExpenses.forEach(e => {
      const date = e.date;
      if (!groups[date]) groups[date] = { expenses: [], total: 0 };
      groups[date].expenses.push(e);
      groups[date].total += e.amount;
    });
    return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]));
  }, [filteredExpenses]);

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
                <Button key={s} size="sm" variant="outline" className="h-8 text-[10px] px-2.5 capitalize font-bold" onClick={() => { 
                  onBatchStatus?.(Array.from(selected), s); 
                  if (s === 'reimbursed' || s === 'approved') rewardBurst();
                  clearSelection(); 
                }}>
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

      {title && (
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xl font-bold tracking-tight">{title}</h2>
          <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20">
            {filteredExpenses.length} items
          </Badge>
        </div>
      )}

      {showTypeTabs && (
        <div className="flex bg-muted/40 p-1 rounded-2xl w-full border border-white/5">
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
                "flex-1 flex flex-col items-center justify-center gap-1 py-3 rounded-xl transition-all duration-300",
                active 
                  ? "bg-card text-primary shadow-xl scale-[1.02] border border-white/5" 
                  : "text-muted-foreground hover:text-foreground hover:bg-white/5"
              )}
            >
              <div className="flex items-center gap-1.5">
                {t === 'personal' ? <Tag className="h-3 w-3" /> : t === 'reimbursable' ? <Briefcase className="h-3 w-3" /> : <SlidersHorizontal className="h-3 w-3" />}
                <span className="capitalize text-[10px] font-black uppercase tracking-widest">{t}</span>
              </div>
              <span className={cn(
                "text-[9px] font-medium opacity-60",
                active ? "text-primary" : "text-muted-foreground"
              )}>
                {count} items
              </span>
            </button>
          );
        })}
      </div>
      )}

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
          <Input placeholder="Search vendors, notes..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 bg-card/40 border-white/5 h-10 rounded-xl focus:ring-primary/20" />
        </div>
        <div className="flex bg-muted/40 p-1 rounded-xl border border-white/5 shadow-inner">
          <button onClick={() => { setViewMode('cards'); haptics.selection(); }} className={cn("h-8 w-8 flex items-center justify-center rounded-lg transition-all", viewMode === 'cards' ? "bg-card shadow-sm text-primary" : "text-muted-foreground")}><MoreVertical className="h-3.5 w-3.5 rotate-90" /></button>
          <button onClick={() => { setViewMode('table'); haptics.selection(); }} className={cn("h-8 w-8 flex items-center justify-center rounded-lg transition-all", viewMode === 'table' ? "bg-card shadow-sm text-primary" : "text-muted-foreground")}><ArrowUpDown className="h-3.5 w-3.5" /></button>
        </div>
        <Sheet open={filterOpen} onOpenChange={setFilterOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon" className="h-10 w-10 shrink-0 rounded-xl bg-card/40 border-white/5"><SlidersHorizontal className="h-4 w-4" /></Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="glass rounded-t-[2.5rem] border-t-white/10 pb-12"><FilterPanel /></SheetContent>
        </Sheet>
      </div>

      <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
        {viewMode === 'cards' ? (
          <PullToRefresh onRefresh={handleRefresh}>
            <div className="space-y-8 py-2">
              {groupedExpenses.length === 0 ? (
                 <div className="py-20 text-center">
                    <div className="h-16 w-16 rounded-full bg-muted/20 flex items-center justify-center mx-auto mb-4 border border-dashed border-border">
                      <Receipt className="h-8 w-8 text-muted-foreground/30" />
                    </div>
                    <p className="font-bold text-muted-foreground">No matches found</p>
                    <p className="text-xs text-muted-foreground/60 mt-1">Try adjusting your filters or search terms</p>
                 </div>
              ) : groupedExpenses.map(([date, { expenses: groupExpenses, total }]) => (
                <div key={date} className="space-y-3">
                   <div className="flex items-center justify-between px-1">
                      <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/50">
                        {format(new Date(date), 'EEEE, do MMM')}
                      </h4>
                      <p className="text-[11px] font-bold text-muted-foreground">
                        Total: <span className="text-foreground">{formatCurrency(total)}</span>
                      </p>
                   </div>
                   <div className="space-y-3">
                    {groupExpenses.map(expense => (
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
                </div>
              ))}
            </div>
          </PullToRefresh>
        ) : (
          <div className="rounded-2xl border border-white/5 bg-card/40 overflow-hidden overflow-x-auto shadow-xl">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-white/5 border-b border-white/5">
                  <th className="p-4 w-10"><Checkbox checked={selected.size === filteredExpenses.length && filteredExpenses.length > 0} onCheckedChange={toggleSelectAll} /></th>
                  <th className="p-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Vendor</th>
                  <th className="p-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 text-right">Amount</th>
                  <th className="p-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Status</th>
                  <th className="p-4 w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredExpenses.map(expense => (
                  <tr key={expense.id} className={cn("hover:bg-white/5 transition-colors", selected.has(expense.id) ? "bg-primary/5" : "")} onClick={() => toggleSelect(expense.id)}>
                    <td className="p-4" onClick={e => e.stopPropagation()}><Checkbox checked={selected.has(expense.id)} onCheckedChange={() => toggleSelect(expense.id)} /></td>
                    <td className="p-4">
                      <div className="flex items-center gap-1.5">
                        <p className="text-xs font-bold">{expense.vendor}</p>
                        {expense.isReimbursement && <Briefcase className="h-2.5 w-2.5 text-primary" />}
                      </div>
                      <p className="text-[10px] text-muted-foreground/60 mt-0.5">{format(new Date(expense.date), 'dd/MM/yy')}</p>
                    </td>
                    <td className="p-4 text-right text-xs font-mono font-black">{formatCurrency(expense.amount)}</td>
                    <td className="p-4">
                      {expense.isReimbursement && (
                        <Badge className={cn("text-[9px] font-black uppercase tracking-tighter", STATUS_COLORS[expense.status])}>{expense.status}</Badge>
                      )}
                    </td>
                    <td className="p-4" onClick={e => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="glass border-white/10 rounded-xl min-w-[120px]">
                          <DropdownMenuItem onClick={() => setSelectedExpense(expense)} className="gap-2 text-xs font-medium"><Eye className="h-3.5 w-3.5" /> View</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setEditingExpense(expense)} className="gap-2 text-xs font-medium"><Edit className="h-3.5 w-3.5" /> Edit</DropdownMenuItem>
                          <DropdownMenuSeparator className="bg-white/5" />
                          <DropdownMenuItem className="text-destructive gap-2 text-xs font-medium" onClick={() => onDeleteExpense(expense.id)}><Trash2 className="h-3.5 w-3.5" /> Delete</DropdownMenuItem>
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
        <DialogContent className="glass max-w-sm mx-4 p-0 overflow-hidden border-white/10 rounded-[2.5rem] shadow-2xl">
          <DialogHeader className="sr-only">
            <DialogTitle>Expense Details</DialogTitle>
          </DialogHeader>
          {selectedExpense && (
            <div className="flex flex-col">
              <div className="p-8 pb-6 text-center relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-primary/10 to-transparent pointer-events-none" />
                <div className={cn(
                  "h-16 w-16 rounded-[1.5rem] flex items-center justify-center mx-auto mb-4 shadow-xl border border-white/10",
                  getCategoryConfig(selectedExpense.category).bgColor
                )}>
                  {(() => {
                    const Icon = getCategoryConfig(selectedExpense.category).icon;
                    return <Icon className={cn("h-8 w-8", getCategoryConfig(selectedExpense.category).color)} />;
                  })()}
                </div>
                <h2 className="text-xl font-black tracking-tight mb-1">{selectedExpense.vendor}</h2>
                <p className="text-3xl font-black font-mono tracking-tighter text-primary">
                  {formatCurrency(selectedExpense.amount)}
                </p>
                {selectedExpense.isReimbursement && (
                  <Badge className={cn(
                    "mt-4 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full",
                    STATUS_COLORS[selectedExpense.status]
                  )}>
                    {selectedExpense.status}
                  </Badge>
                )}
              </div>

              <div className="px-6 py-6 space-y-4 bg-black/10">
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white/5 p-3 rounded-2xl border border-white/5">
                    <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/40 mb-1 flex items-center gap-1.5">
                      <Calendar className="h-3 w-3" /> Date
                    </p>
                    <p className="text-xs font-bold">{format(new Date(selectedExpense.date), 'EEEE, do MMM yyyy')}</p>
                  </div>
                  <div className="bg-white/5 p-3 rounded-2xl border border-white/5">
                    <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/40 mb-1 flex items-center gap-1.5">
                      <Tag className="h-3 w-3" /> Category
                    </p>
                    <p className="text-xs font-bold">{getCategoryConfig(selectedExpense.category).label}</p>
                  </div>
                </div>

                {/* Split Details Section */}
                {(selectedExpense.split || selectedExpense.paidBy) && (
                  <div className="bg-white/5 p-4 rounded-3xl border border-white/10 space-y-4">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2">
                        <Users className="h-3.5 w-3.5" /> Split Billing
                      </p>
                      {selectedExpense.paidBy && (
                        <Badge variant="outline" className="text-[9px] font-black uppercase tracking-widest bg-primary/10 border-primary/20 text-primary">
                          Paid by {selectedExpense.paidBy === 'user' ? 'You' : contacts.find(c => c.id === selectedExpense.paidBy)?.name || 'Unknown'}
                        </Badge>
                      )}
                    </div>
                    
                    {selectedExpense.split && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-[8px] font-black uppercase tracking-widest text-muted-foreground/40 px-1">
                          <span>Participant</span>
                          <span>Share</span>
                        </div>
                        <div className="space-y-1.5">
                          {selectedExpense.split.members.map(member => {
                            const isUser = member.contactId === 'user';
                            const contact = isUser ? { name: 'You (Owner)' } : contacts.find(c => c.id === member.contactId);
                            return (
                              <div key={member.contactId} className="flex items-center justify-between bg-white/5 p-2.5 rounded-xl border border-white/5">
                                <span className="text-[11px] font-bold">{contact?.name || 'Unknown'}</span>
                                <span className="text-xs font-mono font-black">₹{member.amount.toFixed(2)}</span>
                              </div>
                            );
                          })}
                        </div>
                        <div className="pt-2 flex items-center justify-between px-1">
                          <span className="text-[9px] font-bold text-muted-foreground uppercase">Split Type</span>
                          <span className="text-[10px] font-black uppercase text-primary tracking-widest">{selectedExpense.split.splitType}</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {selectedExpense.description && (
                  <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                    <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/40 mb-1 flex items-center gap-1.5">
                      <FileText className="h-3 w-3" /> Note
                    </p>
                    <p className="text-xs font-medium leading-relaxed">{selectedExpense.description}</p>
                  </div>
                )}

                {selectedExpense.receiptImage && (
                  <div className="space-y-2">
                    <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/40 flex items-center gap-1.5 px-1">
                      <Camera className="h-3 w-3" /> Receipt
                    </p>
                    <div 
                      className="relative rounded-2xl overflow-hidden border border-white/10 group cursor-pointer"
                      onClick={() => setViewingReceipt(selectedExpense.receiptImage!)}
                    >
                      <img src={selectedExpense.receiptImage} className="w-full aspect-[4/3] object-cover transition-transform group-hover:scale-105" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <ZoomIn className="h-8 w-8 text-white" />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="p-4 bg-card/60 backdrop-blur-xl border-t border-white/5 flex gap-2">
                <Button 
                  variant="outline" 
                  className="flex-1 h-11 rounded-xl font-black uppercase tracking-widest text-[10px] border-white/5"
                  onClick={() => {
                    setEditingExpense(selectedExpense);
                    setSelectedExpense(null);
                  }}
                >
                  <Edit className="h-3.5 w-3.5 mr-2" /> Edit
                </Button>
                <Button 
                  variant="outline" 
                  className="h-11 w-11 rounded-xl border-destructive/10 text-destructive hover:bg-destructive/10"
                  onClick={() => {
                    onDeleteExpense(selectedExpense.id);
                    setSelectedExpense(null);
                    haptics.heavy();
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <ImageViewer src={viewingReceipt || ''} isOpen={!!viewingReceipt} onClose={() => setViewingReceipt(null)} title="Receipt" />
      <Dialog open={!!editingExpense} onOpenChange={open => !open && setEditingExpense(null)}>
        <DialogContent className="glass w-[95vw] sm:max-w-xl max-h-[92vh] overflow-y-auto overflow-x-hidden p-0 sm:p-6 rounded-[2.5rem] sm:rounded-3xl border-white/10 shadow-2xl">
          <DialogHeader className="sr-only">
            <DialogTitle>Edit Expense</DialogTitle>
          </DialogHeader>
          {editingExpense && <ExpenseForm onSubmit={exp => { onUpdateExpense(exp); setEditingExpense(null); }} initialData={editingExpense} isEdit onClose={() => setEditingExpense(null)} />}
        </DialogContent>
      </Dialog>
      <ExportDialog isOpen={exportDialogOpen} onClose={() => setExportDialogOpen(false)} onConfirm={handleExportPDF} title="Export PDF" count={filteredExpenses.length} />
    </div>
  );
}
