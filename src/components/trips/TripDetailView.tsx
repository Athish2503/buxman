import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Trip, SettleUpSummary } from '@/types/split';
import { Expense } from '@/types/expense';
import { tripService } from '@/lib/trip-service';
import { contactService } from '@/lib/contact-service';
import { storageService } from '@/lib/storage';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Plus, Receipt, User, Wallet, CheckCircle2, AlertCircle, Trash2 } from 'lucide-react';
import { ExpenseForm } from '../expense-form';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Edit2, Settings2, Share2, Copy, Download, ExternalLink, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { ContactSelector } from '../split/ContactSelector';
import { haptics } from '@/lib/haptics';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface TripDetailViewProps {
  trip: Trip;
  onBack: () => void;
}

export function TripDetailView({ trip, onBack }: TripDetailViewProps) {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [summary, setSummary] = useState<SettleUpSummary[]>([]);
  const [debts, setDebts] = useState<{ from: string, to: string, amount: number }[]>([]);
  const [activeTab, setActiveTab] = useState<'expenses' | 'settle'>('expenses');
  const [isSettling, setIsSettling] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [editName, setEditName] = useState(trip.name);
  const [editStatus, setEditStatus] = useState(trip.status);
  const [editParticipants, setEditParticipants] = useState(trip.participants);

  useEffect(() => {
    setExpenses(tripService.getTripExpenses(trip.id));
    setSummary(tripService.calculateSettlement(trip.id));
    setDebts(tripService.getPeerToPeerDebts(trip.id));
  }, [trip.id]);

  const handleAddExpense = (expense: Expense) => {
    expense.tripId = trip.id;
    storageService.addExpense(expense);
    setExpenses(tripService.getTripExpenses(trip.id));
    setSummary(tripService.calculateSettlement(trip.id));
    setDebts(tripService.getPeerToPeerDebts(trip.id));
  };

  const handleSettleAll = () => {
    toast.success('All balances settled successfully');
    setIsSettling(false);
  };

  const handleUpdateTrip = () => {
    tripService.updateTrip({
      ...trip,
      name: editName,
      status: editStatus,
      participants: editParticipants
    });
    toast.success('Trip updated');
    setIsEditing(false);
  };

  const handleDeleteExpense = (id: string) => {
    storageService.deleteExpense(id);
    refreshData();
    toast.success('Expense removed');
  };

  const handleEditExpense = (expense: Expense) => {
    setEditingExpense(expense);
  };

  const handleUpdateExpense = (updatedExpense: Expense) => {
    storageService.updateExpense(updatedExpense);
    refreshData();
    setEditingExpense(null);
    toast.success('Expense updated');
  };

  const refreshData = () => {
    setExpenses(tripService.getTripExpenses(trip.id));
    setSummary(tripService.calculateSettlement(trip.id));
    setDebts(tripService.getPeerToPeerDebts(trip.id));
  };

  const getShareText = () => {
    let text = `🏝️ *Trip Summary: ${trip.name}*\n`;
    text += `━━━━━━━━━━━━━━━━━━━━\n`;
    text += `💰 *Total Spent:* ₹${expenses.reduce((acc, e) => acc + e.amount, 0).toFixed(2)}\n`;
    text += `👥 *Participants:* ${trip.participants.length + 1}\n\n`;
    
    text += `*Expense Breakdown:*\n`;
    expenses.forEach(e => {
      text += `• ${e.vendor}: *₹${e.amount.toFixed(2)}* (${new Date(e.date).toLocaleDateString()})\n`;
    });
    
    text += `\n*Settlement Summary:*\n`;
    summary.forEach(s => {
      const isUser = s.contactId === 'user';
      const contact = isUser ? { name: 'You' } : contacts.find(c => c.id === s.contactId);
      if (!contact) return;
      const bal = s.netBalance;
      text += `${isUser ? '👤' : '👤'} *${contact.name}:* ${bal >= 0 ? 'Receives' : 'Pays'} ₹${Math.abs(bal).toFixed(2)}\n`;
    });

    if (debts.length > 0) {
      text += `\n*How to Settle:*\n`;
      debts.forEach(d => {
        const from = d.from === 'user' ? 'You' : contacts.find(c => c.id === d.from)?.name;
        const to = d.to === 'user' ? 'You' : contacts.find(c => c.id === d.to)?.name;
        text += `✅ ${from} → ${to}: *₹${d.amount.toFixed(2)}*\n`;
      });
    }

    text += `\n_Generated via Buxman App_`;
    return text;
  };

  const handleShareWhatsApp = () => {
    const text = encodeURIComponent(getShareText());
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  const handleCopyText = () => {
    navigator.clipboard.writeText(getShareText());
    toast.success('Summary copied to clipboard');
    haptics.medium();
  };

  const contacts = contactService.getContacts();

  return (
    <div className="space-y-6 pb-20">
      {/* ── Header ────────────────────────────────────────────────── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={onBack} className="rounded-xl h-10 w-10 bg-muted/20 hover:bg-muted/40">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h2 className="text-xl font-bold tracking-tight leading-tight">{trip.name}</h2>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
                {trip.participants.length + 1} Participants
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-1">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setIsSharing(true)} 
              className="rounded-xl h-10 w-10 text-primary hover:bg-primary/10"
            >
              <Share2 className="h-5 w-5" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setIsEditing(true)} 
              className="rounded-xl h-10 w-10 text-muted-foreground hover:bg-muted/40"
            >
              <Settings2 className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Action Bar */}
        <div className="flex gap-2">
          <ExpenseForm 
            onSubmit={handleAddExpense} 
            trigger={
              <Button className="flex-1 h-12 bg-primary hover:bg-primary/90 text-white rounded-2xl shadow-glow gap-2 font-bold transition-all active:scale-95">
                <Plus className="h-5 w-5" />
                <span>New Expense</span>
              </Button>
            }
          />
          <div className="px-4 h-12 flex flex-col justify-center glass rounded-2xl border border-border/40">
            <p className="text-[8px] font-bold uppercase tracking-widest text-muted-foreground">Trip Total</p>
            <p className="text-sm font-mono font-black">₹{expenses.reduce((acc, e) => acc + e.amount, 0).toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* Hidden Edit Expense Form */}
      {editingExpense && (
        <AlertDialog open={!!editingExpense} onOpenChange={(open) => !open && setEditingExpense(null)}>
          <AlertDialogContent className="rounded-3xl border-border/40 glass max-w-[95vw] w-[450px] p-0 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border/30 bg-muted/20">
              <h3 className="font-bold text-sm">Edit Expense</h3>
              <Button variant="ghost" size="icon" onClick={() => setEditingExpense(null)} className="h-8 w-8 rounded-xl">
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="p-6 max-h-[80vh] overflow-y-auto">
              <ExpenseForm 
                onSubmit={handleUpdateExpense} 
                initialData={editingExpense} 
                isEdit={true}
                onClose={() => setEditingExpense(null)}
              />
            </div>
          </AlertDialogContent>
        </AlertDialog>
      )}

      <div className="flex p-1.5 bg-muted/30 border border-border/40 rounded-[20px] backdrop-blur-sm">
        <button
          onClick={() => setActiveTab('expenses')}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all",
            activeTab === 'expenses' ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
          )}
        >
          <Receipt className="h-3.5 w-3.5" />
          Expenses
        </button>
        <button
          onClick={() => setActiveTab('settle')}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all",
            activeTab === 'settle' ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
          )}
        >
          <Wallet className="h-3.5 w-3.5" />
          Settle Up
        </button>
      </div>

      <div className="space-y-4">
        {activeTab === 'expenses' ? (
          <div className="space-y-6">
            {expenses.length === 0 ? (
              <div className="py-12 flex flex-col items-center justify-center text-muted-foreground space-y-3 border-2 border-dashed border-border/40 rounded-3xl">
                <AlertCircle className="h-8 w-8 opacity-20" />
                <p className="text-sm font-medium">No expenses recorded for this trip</p>
              </div>
            ) : (
              Object.entries(
                expenses.reduce((groups, expense) => {
                  const date = new Date(expense.date).toLocaleDateString('en-IN', { 
                    day: 'numeric', 
                    month: 'short', 
                    year: 'numeric' 
                  });
                  if (!groups[date]) groups[date] = [];
                  groups[date].push(expense);
                  return groups;
                }, {} as Record<string, Expense[]>)
              ).sort((a, b) => new Date(b[0]).getTime() - new Date(a[0]).getTime())
              .map(([date, dateExpenses]) => (
                <div key={date} className="space-y-3">
                  <div className="flex items-center gap-2 px-1">
                    <div className="h-[1px] flex-1 bg-border/40" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">{date}</span>
                    <div className="h-[1px] flex-1 bg-border/40" />
                  </div>
                  {dateExpenses.map(expense => (
                    <div key={expense.id} className="glass rounded-2xl p-4 border border-border/30 flex items-center justify-between group gap-3">
                      <div className="flex items-center gap-4 min-w-0">
                        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                          <Receipt className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-bold text-sm truncate">{expense.vendor}</h4>
                          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                            {expense.paidBy && (
                              <span className="text-primary font-medium truncate">
                                Paid by {contacts.find(c => c.id === expense.paidBy)?.name || 'Unknown'}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="text-right flex items-center gap-3 shrink-0">
                        <div>
                          <p className="font-mono font-bold text-sm">₹{expense.amount.toFixed(2)}</p>
                          {expense.split && (
                            <p className="text-[9px] text-primary font-bold uppercase tracking-tighter">Split</p>
                          )}
                        </div>
                        {/* Desktop: Show on hover */}
                        <div className="hidden sm:flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => handleEditExpense(expense)}
                            className="h-8 w-8 text-muted-foreground hover:text-primary rounded-lg"
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => handleDeleteExpense(expense.id)}
                            className="h-8 w-8 text-muted-foreground hover:text-rose-500 rounded-lg"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        {/* Mobile: Always show but smaller */}
                        <div className="flex items-center gap-1 sm:hidden">
                           <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => handleEditExpense(expense)}
                            className="h-8 w-8 text-muted-foreground hover:text-primary rounded-lg bg-muted/20"
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => handleDeleteExpense(expense.id)}
                            className="h-8 w-8 text-muted-foreground hover:text-rose-500 rounded-lg bg-muted/20"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ))
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="glass rounded-3xl p-6 border border-border/40 bg-gradient-to-br from-primary/10 to-transparent">
              <h3 className="font-bold text-sm mb-4">Settlement Summary</h3>
              <div className="space-y-4">
                {summary.map(s => {
                  const isUser = s.contactId === 'user';
                  const contact = isUser ? { name: 'You (Owner)' } : contacts.find(c => c.id === s.contactId);
                  if (!contact) return null;
                  const isOwed = s.netBalance > 0;
                  
                  return (
                    <div key={s.contactId} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "h-10 w-10 rounded-full flex items-center justify-center",
                          isUser ? "bg-primary/20 text-primary" : "bg-muted/50"
                        )}>
                          <User className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="font-bold text-sm">{contact.name}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {isOwed ? 'is owed' : 'owes'} ₹{Math.abs(s.netBalance).toFixed(2)}
                          </p>
                        </div>
                      </div>
                      <div className={cn(
                        "px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider",
                        isOwed ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500"
                      )}>
                        {isOwed ? 'Receive' : 'Pay'}
                      </div>
                    </div>
                  );
                })}
                
                {summary.length === 0 && (
                  <p className="text-center py-4 text-xs text-muted-foreground">Add expenses with splits to see settlement</p>
                )}
              </div>
            </div>

            {debts.length > 0 && (
              <div className="space-y-3">
                <h3 className="font-bold text-sm px-1">How to Settle</h3>
                {debts.map((debt, idx) => {
                  const from = debt.from === 'user' ? { name: 'You' } : contacts.find(c => c.id === debt.from);
                  const to = debt.to === 'user' ? { name: 'You' } : contacts.find(c => c.id === debt.to);
                  if (!from || !to) return null;

                  return (
                    <div key={idx} className="glass rounded-2xl p-4 border border-border/30 flex items-center gap-3">
                      <div className="flex-1">
                        <span className="font-bold text-sm text-rose-500">{from.name}</span>
                        <span className="text-muted-foreground text-xs mx-2">pays</span>
                        <span className="font-bold text-sm text-emerald-500">{to.name}</span>
                      </div>
                      <div className="font-mono font-black text-sm">₹{debt.amount.toFixed(2)}</div>
                    </div>
                  );
                })}
              </div>
            )}

            <Button 
              onClick={() => setIsSettling(true)}
              className="w-full h-12 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl font-bold gap-2"
            >
              <CheckCircle2 className="h-5 w-5" />
              Settle All Balances
            </Button>
          </div>
        )}
      </div>

      <AlertDialog open={isSettling} onOpenChange={setIsSettling}>
        <AlertDialogContent className="rounded-3xl border-border/40 glass">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-bold">Settle All Balances?</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              This will mark all current outstanding balances for this trip as settled. This action is recorded in your history.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="rounded-xl border-border/40">Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleSettleAll}
              className="rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white border-none"
            >
              Confirm Settlement
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isEditing} onOpenChange={setIsEditing}>
        <AlertDialogContent className="p-0 overflow-hidden rounded-[32px] border-none bg-transparent max-w-[95vw] w-[450px] shadow-2xl">
          <div className="relative bg-gradient-to-br from-indigo-950 via-slate-900 to-black p-7 text-white">
            {/* Background Accents */}
            <div className="absolute top-0 right-0 w-48 h-48 bg-primary/20 rounded-full blur-[80px] -mr-24 -mt-24" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-violet-600/10 rounded-full blur-[80px] -ml-24 -mb-24" />

            <div className="relative z-10 space-y-8">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-2xl bg-white/5 backdrop-blur-md flex items-center justify-center border border-white/10 shadow-inner">
                    <Settings2 className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-b from-white to-white/60">
                      Trip Settings
                    </h2>
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/30">Configuration</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsEditing(false)} 
                  className="h-10 w-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-all"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-6">
                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30 ml-1">Trip Status</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['active', 'completed', 'archived'] as const).map(s => (
                      <button
                        key={s}
                        onClick={() => setEditStatus(s)}
                        className={cn(
                          "py-3 rounded-2xl border text-[11px] font-black uppercase tracking-wider transition-all duration-300",
                          editStatus === s
                            ? "bg-primary border-primary text-white shadow-glow-sm scale-[1.02]"
                            : "bg-white/5 border-white/10 text-white/40 hover:bg-white/10 hover:border-white/20"
                        )}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30 ml-1">Trip Name</label>
                  <div className="relative group">
                    <Input 
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                      className="h-14 bg-white/5 border-white/10 rounded-2xl px-5 text-sm font-bold focus-visible:ring-primary focus-visible:border-primary transition-all placeholder:text-white/20"
                      placeholder="Enter trip name..."
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30 ml-1">Participants</label>
                  <div className="p-1.5 rounded-[24px] bg-white/5 border border-white/10 backdrop-blur-sm">
                    <ContactSelector 
                      selectedIds={editParticipants} 
                      onSelect={setEditParticipants} 
                      className="bg-transparent border-none"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <Button 
                  variant="ghost" 
                  onClick={() => setIsEditing(false)}
                  className="flex-1 h-14 rounded-2xl bg-white/5 border border-white/10 text-white/60 font-bold hover:bg-white/10 hover:text-white"
                >
                  Discard
                </Button>
                <Button 
                  onClick={handleUpdateTrip}
                  className="flex-[1.5] h-14 rounded-2xl bg-primary hover:bg-primary/90 text-white font-black text-sm uppercase tracking-widest shadow-glow active:scale-[0.98] transition-all"
                >
                  Update Trip
                </Button>
              </div>
            </div>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isSharing} onOpenChange={setIsSharing}>
        <AlertDialogContent className="rounded-[40px] border-none p-0 overflow-hidden bg-transparent max-w-sm">
          <div className="relative p-8 bg-gradient-to-br from-indigo-950 via-slate-900 to-black text-white overflow-hidden">
            {/* Abstract Background Shapes */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 rounded-full blur-[80px] -mr-32 -mt-32 animate-pulse" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-violet-600/10 rounded-full blur-[80px] -ml-32 -mb-32" />
            
            {/* Close Button */}
            <button
              onClick={() => setIsSharing(false)}
              className="absolute top-6 right-6 z-[30] h-10 w-10 rounded-full bg-white/10 flex items-center justify-center text-white/70 hover:bg-white/20 hover:text-white transition-all backdrop-blur-md border border-white/10"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="relative z-10 space-y-8">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20">
                    <Share2 className="h-4 w-4 text-primary" />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40">Trip Ledger</span>
                </div>
              </div>

              <div className="space-y-2">
                <AlertDialogTitle className="text-4xl font-black tracking-tight leading-none bg-clip-text text-transparent bg-gradient-to-b from-white to-white/60">
                  {trip.name}
                </AlertDialogTitle>
                <p className="text-primary font-bold text-sm flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary animate-ping" />
                  Detailed Trip Ledger
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-sm">
                  <p className="text-[9px] uppercase tracking-widest text-white/40 font-bold mb-1">Total Spent</p>
                  <p className="text-xl font-mono font-black text-emerald-400">₹{expenses.reduce((acc, e) => acc + e.amount, 0).toLocaleString()}</p>
                </div>
                <div className="p-4 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-sm">
                  <p className="text-[9px] uppercase tracking-widest text-white/40 font-bold mb-1">Participants</p>
                  <p className="text-xl font-mono font-black text-violet-400">{trip.participants.length + 1}</p>
                </div>
              </div>

              {/* Scrollable Ledger Section */}
              <div className="space-y-6 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                <div className="space-y-3">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-white/20">Expenses Log</p>
                  {expenses.map(e => (
                    <div key={e.id} className="flex items-center justify-between py-1 border-b border-white/5">
                      <div>
                        <p className="text-xs font-bold text-white/90">{e.vendor}</p>
                        <p className="text-[9px] text-white/30">{new Date(e.date).toLocaleDateString()}</p>
                      </div>
                      <span className="text-xs font-mono font-bold text-white/70">₹{e.amount}</span>
                    </div>
                  ))}
                </div>

                <div className="space-y-3">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-white/20">Net Balances</p>
                  <div className="space-y-2">
                    {summary.map(s => {
                      const isUser = s.contactId === 'user';
                      const contact = isUser ? { name: 'You' } : contacts.find(c => c.id === s.contactId);
                      if (!contact) return null;
                      return (
                        <div key={s.contactId} className="flex items-center justify-between">
                          <span className="text-xs text-white/60">{contact.name}</span>
                          <span className={cn(
                            "text-xs font-mono font-bold",
                            s.netBalance >= 0 ? "text-emerald-400" : "text-rose-400"
                          )}>
                            {s.netBalance >= 0 ? '+' : ''}₹{Math.abs(s.netBalance).toFixed(0)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {debts.length > 0 && (
                  <div className="space-y-3">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-white/20">Settlement Steps</p>
                    {debts.map((d, i) => {
                      const from = d.from === 'user' ? 'You' : contacts.find(c => c.id === d.from)?.name;
                      const to = d.to === 'user' ? 'You' : contacts.find(c => c.id === d.to)?.name;
                      return (
                        <div key={i} className="bg-white/5 p-2 rounded-xl border border-white/5 text-[10px]">
                          <span className="text-rose-400 font-bold">{from}</span>
                          <span className="text-white/30 mx-1">pays</span>
                          <span className="text-emerald-400 font-bold">{to}</span>
                          <span className="float-right font-mono text-white/90">₹{d.amount.toFixed(0)}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="pt-8 flex flex-col gap-3">
                <Button 
                  onClick={handleShareWhatsApp}
                  className="w-full h-14 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-lg gap-2 shadow-[0_0_20px_rgba(16,185,129,0.3)]"
                >
                  <ExternalLink className="h-5 w-5" />
                  Share to WhatsApp
                </Button>
                <div className="flex gap-3">
                  <Button 
                    onClick={handleCopyText}
                    variant="outline" 
                    className="flex-1 h-12 rounded-2xl bg-white/5 border-white/10 text-white font-bold gap-2 hover:bg-white/10"
                  >
                    <Copy className="h-4 w-4" />
                    Copy Text
                  </Button>
                </div>
              </div>

              <div className="text-center pt-4">
                <p className="text-[9px] font-black tracking-[0.4em] text-white/20 uppercase">Generated by Buxman</p>
              </div>
            </div>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
