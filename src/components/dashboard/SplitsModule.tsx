import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, Info, Check, Send, Share2, ChevronDown, ChevronUp, 
  AlertCircle, Wallet, ArrowUpRight, ArrowDownLeft, Calendar, 
  Receipt, CheckCircle2, User, RefreshCw, QrCode, Copy, Plus
} from 'lucide-react';
import { Expense } from '@/types/expense';
import { Trip } from '@/types/split';
import { contactService } from '@/lib/contact-service';
import { storageService } from '@/lib/storage';
import { tripService } from '@/lib/trip-service';
import { scheduleSplitReminders } from '@/lib/split-reminders';
import { settingsService } from '@/lib/settings';
import { cn, formatCurrency } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { haptics } from '@/lib/haptics';
import { toast } from 'sonner';
import QRCode from 'qrcode';
import confetti from 'canvas-confetti';
import { audio } from '@/lib/audio';
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

interface UnpaidSplit {
  expenseId: string;
  expenseVendor: string;
  expenseDate: string;
  totalAmount: number;
  shareAmount: number;
  type: 'you_lent' | 'you_borrowed';
  expense: Expense;
}

interface PersonBalance {
  contactId: string;
  contactName: string;
  contactAvatar?: string;
  netBalance: number; // positive if they owe you, negative if you owe them
  unpaidExpenses: UnpaidSplit[];
}

export function SplitsModule() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [selectedTripId, setSelectedTripId] = useState<string>('all');
  const [expandedPersonId, setExpandedPersonId] = useState<string | null>(null);
  
  // Settle Up Dialog State
  const [settlePerson, setSettlePerson] = useState<PersonBalance | null>(null);
  const [isSettling, setIsSettling] = useState(false);
  const [settings, setSettings] = useState(() => settingsService.get());
  const [tempUpiId, setTempUpiId] = useState('');
  const [settleAmount, setSettleAmount] = useState<number>(0);

  // Quick QR Generator State
  const [isQuickQrOpen, setIsQuickQrOpen] = useState(false);
  const [quickUpiId, setQuickUpiId] = useState(settings.upiId || '');
  const [quickAmount, setQuickAmount] = useState<number>(0);
  
  // Interactive Copy State
  const [copiedUpi, setCopiedUpi] = useState(false);

  // Direct IOU States
  const [isIouOpen, setIsIouOpen] = useState(false);
  const [iouType, setIouType] = useState<'you_owe' | 'owes_you'>('you_owe');
  const [iouContactId, setIouContactId] = useState<string>('');
  const [iouNewContactName, setIouNewContactName] = useState<string>('');
  const [iouAmount, setIouAmount] = useState<number>(0);
  const [iouDescription, setIouDescription] = useState<string>('');
  const [iouDate, setIouDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [isSavingIou, setIsSavingIou] = useState(false);
  const [contactsKey, setContactsKey] = useState(0);

  const handleSaveIou = async () => {
    if (iouAmount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    
    let targetContactId = iouContactId;
    if (targetContactId === 'new') {
      if (!iouNewContactName.trim()) {
        toast.error("Please enter friend's name");
        return;
      }
      const newContact = contactService.addContact({ name: iouNewContactName.trim() });
      targetContactId = newContact.id;
      setContactsKey(prev => prev + 1);
    }
    
    if (!targetContactId) {
      toast.error('Please select a friend');
      return;
    }

    setIsSavingIou(true);
    haptics.medium();

    try {
      const contactObj = contactService.getContacts().find(c => c.id === targetContactId);
      const contactName = contactObj?.name || 'Friend';
      
      let expenseObj: Expense;
      if (iouType === 'you_owe') {
        expenseObj = {
          id: crypto.randomUUID(),
          vendor: iouDescription.trim() || `Direct Debt (You Owe ${contactName})`,
          amount: iouAmount,
          date: iouDate,
          category: 'Others',
          description: `Direct IOU logged: You owe ${contactName}`,
          status: 'approved',
          currency: 'INR',
          isReimbursement: false,
          paidBy: targetContactId,
          split: {
            totalAmount: iouAmount,
            splitType: 'exact',
            members: [],
            userPaid: false,
          },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
      } else {
        expenseObj = {
          id: crypto.randomUUID(),
          vendor: iouDescription.trim() || `Direct Debt (${contactName} Owes You)`,
          amount: iouAmount,
          date: iouDate,
          category: 'Others',
          description: `Direct IOU logged: ${contactName} owes you`,
          status: 'approved',
          currency: 'INR',
          isReimbursement: false,
          paidBy: 'user',
          split: {
            totalAmount: iouAmount,
            splitType: 'exact',
            members: [
              {
                contactId: targetContactId,
                amount: iouAmount,
                paid: false,
              }
            ],
            userPaid: true,
          },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
      }

      storageService.addExpense(expenseObj);
      toast.success('IOU debt logged successfully');
      
      setIsIouOpen(false);
      setIouContactId('');
      setIouNewContactName('');
      setIouAmount(0);
      setIouDescription('');
      setIouDate(new Date().toISOString().split('T')[0]);
      
      audio.success();
      haptics.success();
    } catch (e) {
      toast.error('Failed to log IOU');
    } finally {
      setIsSavingIou(false);
    }
  };

  const handleCopyLink = (upiUrl: string) => {
    navigator.clipboard.writeText(upiUrl);
    setCopiedUpi(true);
    audio.success();
    haptics.success();
    toast.success('Payment link copied');
    setTimeout(() => setCopiedUpi(false), 2000);
  };

  const contacts = useMemo(() => contactService.getContacts(), [expenses, contactsKey]);

  useEffect(() => {
    if (isQuickQrOpen) {
      setQuickUpiId(settings.upiId || '');
    }
  }, [isQuickQrOpen, settings.upiId]);

  useEffect(() => {
    if (!isQuickQrOpen || !quickUpiId.trim()) return;

    const name = settings.billedFrom.name || 'User';
    const upiUrl = `upi://pay?pa=${quickUpiId.trim()}&pn=${encodeURIComponent(name)}&am=${quickAmount.toFixed(2)}&cu=INR`;

    const timer = setTimeout(() => {
      const canvas = document.getElementById('quick-upi-canvas') as HTMLCanvasElement;
      if (canvas) {
        QRCode.toCanvas(canvas, upiUrl, {
          width: 128,
          margin: 1,
          errorCorrectionLevel: 'H',
          color: {
            dark: settings.accentColor || '#6366f1',
            light: '#ffffff'
          }
        }, (err) => {
          if (err) console.error('Quick QR code generation error:', err);
        });
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [isQuickQrOpen, quickUpiId, quickAmount, settings]);

  useEffect(() => {
    if (!isSettling || !settlePerson) return;
    
    const isOwed = settlePerson.netBalance > 0;
    let upi = '';
    
    if (isOwed) {
      upi = settings.upiId || '';
    } else {
      const contactObj = contacts.find(c => c.id === settlePerson.contactId);
      upi = contactObj?.upiId || '';
    }
    
    setTempUpiId(upi);
  }, [isSettling, settlePerson, settings, contacts]);

  useEffect(() => {
    if (!isSettling || !settlePerson || !tempUpiId) return;

    const isOwed = settlePerson.netBalance > 0;
    const name = isOwed ? (settings.billedFrom.name || 'User') : settlePerson.contactName;
    const upiUrl = `upi://pay?pa=${tempUpiId.trim()}&pn=${encodeURIComponent(name)}&am=${settleAmount.toFixed(2)}&cu=INR`;

    const timer = setTimeout(() => {
      const canvas = document.getElementById('upi-qrcode-canvas') as HTMLCanvasElement;
      if (canvas) {
        QRCode.toCanvas(canvas, upiUrl, {
          width: 128,
          margin: 1,
          errorCorrectionLevel: 'H',
          color: {
            dark: settings.accentColor || '#6366f1',
            light: '#ffffff'
          }
        }, (err) => {
          if (err) console.error('QR code generation error:', err);
        });
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [isSettling, settlePerson, tempUpiId, settings, settleAmount]);

  // Load initial data
  const loadData = () => {
    setExpenses(storageService.getExpenses());
    setTrips(tripService.getTrips());
  };

  useEffect(() => {
    loadData();
    
    const handleExpensesUpdate = () => {
      loadData();
    };
    window.addEventListener('expenses-updated', handleExpensesUpdate);
    return () => {
      window.removeEventListener('expenses-updated', handleExpensesUpdate);
    };
  }, []);

  // Compute balances per contact
  const peopleBalances = useMemo(() => {
    const balances: Record<string, PersonBalance> = {};

    // Initialize all contacts
    contacts.forEach(c => {
      balances[c.id] = {
        contactId: c.id,
        contactName: c.name,
        contactAvatar: c.avatar,
        netBalance: 0,
        unpaidExpenses: []
      };
    });

    expenses.forEach(expense => {
      if (!expense.split) return;
      
      // Filter by tripId if a specific trip is selected
      if (selectedTripId !== 'all' && expense.tripId !== selectedTripId) return;

      const payerId = expense.paidBy || 'user';
      
      if (payerId === 'user') {
        // User paid. Other members owe the user if they haven't paid.
        expense.split.members.forEach(member => {
          if (!member.paid) {
            if (!balances[member.contactId]) {
              const contactObj = contacts.find(c => c.id === member.contactId);
              balances[member.contactId] = {
                contactId: member.contactId,
                contactName: contactObj?.name || 'Unknown Contact',
                contactAvatar: contactObj?.avatar,
                netBalance: 0,
                unpaidExpenses: []
              };
            }
            
            balances[member.contactId].netBalance += member.amount;
            balances[member.contactId].unpaidExpenses.push({
              expenseId: expense.id,
              expenseVendor: expense.vendor,
              expenseDate: expense.date,
              totalAmount: expense.amount,
              shareAmount: member.amount,
              type: 'you_lent',
              expense
            });
          }
        });
      } else {
        // A contact paid.
        // The user owes the contact if userPaid is false.
        const sumOthers = expense.split.members.reduce((acc, m) => acc + m.amount, 0);
        const userShare = expense.amount - sumOthers;
        
        if (userShare > 0 && !expense.split.userPaid) {
          if (!balances[payerId]) {
            const contactObj = contacts.find(c => c.id === payerId);
            balances[payerId] = {
              contactId: payerId,
              contactName: contactObj?.name || 'Unknown Contact',
              contactAvatar: contactObj?.avatar,
              netBalance: 0,
              unpaidExpenses: []
            };
          }
          
          balances[payerId].netBalance -= userShare;
          balances[payerId].unpaidExpenses.push({
            expenseId: expense.id,
            expenseVendor: expense.vendor,
            expenseDate: expense.date,
            totalAmount: expense.amount,
            shareAmount: userShare,
            type: 'you_borrowed',
            expense
          });
        }
      }
    });

    // Filter to only people with active unpaid expenses and sort by absolute balance
    return Object.values(balances)
      .filter(p => p.unpaidExpenses.length > 0)
      .sort((a, b) => Math.abs(b.netBalance) - Math.abs(a.netBalance));
  }, [expenses, contacts, selectedTripId]);

  // Overall totals
  const totalYouAreOwed = useMemo(() => {
    return peopleBalances
      .filter(p => p.netBalance > 0)
      .reduce((sum, p) => sum + p.netBalance, 0);
  }, [peopleBalances]);

  const totalYouOwe = useMemo(() => {
    return Math.abs(
      peopleBalances
        .filter(p => p.netBalance < 0)
        .reduce((sum, p) => sum + p.netBalance, 0)
    );
  }, [peopleBalances]);

  // Actions
  const handleMarkSplitPaid = (unpaid: UnpaidSplit, contactId: string) => {
    haptics.light();
    const updatedExpense = { ...unpaid.expense };
    if (!updatedExpense.split) return;

    if (unpaid.type === 'you_lent') {
      // Mark member as paid
      const members = updatedExpense.split.members.map(m => {
        if (m.contactId === contactId) {
          return { ...m, paid: true };
        }
        return m;
      });
      updatedExpense.split = {
        ...updatedExpense.split,
        members
      };
    } else {
      // Mark user as paid
      updatedExpense.split = {
        ...updatedExpense.split,
        userPaid: true
      };
    }

    storageService.updateExpense(updatedExpense);
    toast.success('Split marked as paid');
    haptics.success();
  };

  const handleSendReminder = (unpaid: UnpaidSplit, contactId: string) => {
    haptics.light();
    scheduleSplitReminders(unpaid.expense);
    
    const name = contacts.find(c => c.id === contactId)?.name || 'Contact';
    toast.success(`Reminder notification queued for ${name}`, {
      description: `They will receive an OS alert shortly.`
    });
  };

  const handleWhatsAppReminder = (unpaid: UnpaidSplit, contactId: string) => {
    haptics.medium();
    const contact = contacts.find(c => c.id === contactId);
    if (!contact) return;

    let message = '';
    const dateStr = new Date(unpaid.expenseDate).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short'
    });

    if (unpaid.type === 'you_lent') {
      message = `Hi ${contact.name}! Just a friendly reminder for the split expense of *${formatCurrency(unpaid.shareAmount)}* for *${unpaid.expenseVendor}* (${dateStr}). You can settle it whenever you get a chance! Thanks.`;
    } else {
      message = `Hi ${contact.name}! Regarding the expense *${unpaid.expenseVendor}* (${dateStr}) that you paid for, I owe you *${formatCurrency(unpaid.shareAmount)}*. Please send me your payment details so I can settle it up!`;
    }

    const url = `https://wa.me/${contact.phone ? contact.phone.replace(/[^0-9]/g, '') : ''}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  const handleSettlePerson = (person: PersonBalance) => {
    haptics.medium();
    setSettlePerson(person);
    setSettleAmount(Math.abs(person.netBalance));
    setIsSettling(true);
  };

  const confirmSettlePerson = () => {
    if (!settlePerson) return;
    haptics.medium();

    settlePerson.unpaidExpenses.forEach(unpaid => {
      const updatedExpense = { ...unpaid.expense };
      if (!updatedExpense.split) return;

      if (unpaid.type === 'you_lent') {
        const members = updatedExpense.split.members.map(m => {
          if (m.contactId === settlePerson.contactId) {
            return { ...m, paid: true };
          }
          return m;
        });
        updatedExpense.split = {
          ...updatedExpense.split,
          members
        };
      } else {
        updatedExpense.split = {
          ...updatedExpense.split,
          userPaid: true
        };
      }

      storageService.updateExpense(updatedExpense);
    });

    toast.success(`Settled all balances with ${settlePerson.contactName}`);
    setIsSettling(false);
    setSettlePerson(null);
    setExpandedPersonId(null);
    
    // Play celebratory sounds and confetti
    audio.shimmer();
    confetti({
      particleCount: 120,
      spread: 80,
      origin: { y: 0.6 },
      colors: [settings.accentColor || '#6366f1', '#10b981', '#3b82f6', '#f59e0b']
    });
    haptics.success();
  };

  return (
    <div className="space-y-6 pb-20 animate-in fade-in duration-500">
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
      {/* ── Title Header ───────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 px-1">
        <div>
          <h1 className="text-3xl font-black tracking-tight flex items-center gap-2">
            <Users className="h-8 w-8 text-primary" />
            <span>Split Bills</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-1">See who owes you money and who you need to pay back</p>
        </div>
        
        {/* Trip Filter & Quick QR & Log IOU */}
        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            onClick={() => {
              haptics.selection();
              setIsIouOpen(true);
            }}
            className="h-9 px-4 rounded-xl text-xs font-bold gap-2 bg-primary text-white hover:bg-primary/90 animate-in fade-in zoom-in-95 duration-300"
          >
            <Plus className="h-4 w-4" />
            <span>Log IOU</span>
          </Button>

          <Button
            onClick={() => {
              haptics.selection();
              setIsQuickQrOpen(true);
            }}
            className="h-9 px-4 rounded-xl text-xs font-bold gap-2 bg-primary/10 border border-primary/20 text-primary hover:bg-primary/20 animate-in fade-in zoom-in-95 duration-300"
          >
            <QrCode className="h-4 w-4" />
            <span>Quick QR</span>
          </Button>

          <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider shrink-0 ml-1">Trip:</span>
          <select 
            value={selectedTripId} 
            onChange={(e) => {
              setSelectedTripId(e.target.value);
              setExpandedPersonId(null);
              haptics.selection();
            }}
            className="bg-muted/40 border border-border/40 hover:bg-muted/60 transition-colors text-xs font-bold rounded-xl px-3 py-2 outline-none cursor-pointer text-foreground min-w-[130px]"
          >
            <option value="all">All Expenses</option>
            {trips.map(trip => (
              <option key={trip.id} value={trip.id}>{trip.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* ── Summary Bento Cards ────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3">
        {/* You get back Card */}
        <div className="relative overflow-hidden glass rounded-3xl p-4 sm:p-5 border border-border/30 bg-gradient-to-br from-emerald-500/10 via-transparent to-transparent flex flex-col justify-between h-28 sm:h-32 shadow-glow-sm">
          <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 shrink-0">
            <ArrowUpRight className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">You get back</p>
            <h3 className="text-lg sm:text-2xl font-display font-black text-emerald-400 mt-0.5 truncate">
              {formatCurrency(totalYouAreOwed)}
            </h3>
          </div>
        </div>

        {/* You Owe Card */}
        <div className="relative overflow-hidden glass rounded-3xl p-4 sm:p-5 border border-border/30 bg-gradient-to-br from-rose-500/10 via-transparent to-transparent flex flex-col justify-between h-28 sm:h-32 shadow-glow-sm">
          <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-2xl bg-rose-500/10 flex items-center justify-center text-rose-400 shrink-0">
            <ArrowDownLeft className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">You owe</p>
            <h3 className="text-lg sm:text-2xl font-display font-black text-rose-400 mt-0.5 truncate">
              {formatCurrency(totalYouOwe)}
            </h3>
          </div>
        </div>

        {/* Overall Balance Card */}
        <div className={cn(
          "col-span-2 relative overflow-hidden glass rounded-3xl p-4 sm:p-5 border border-border/30 flex items-center justify-between gap-4",
          (totalYouAreOwed - totalYouOwe) >= 0 
            ? "bg-gradient-to-br from-emerald-500/5 to-transparent"
            : "bg-gradient-to-br from-rose-500/5 to-transparent"
        )}>
          <div className="flex items-center gap-3 sm:gap-4 min-w-0">
            <div className={cn(
              "h-10 w-10 sm:h-11 sm:w-11 rounded-2xl flex items-center justify-center shrink-0 border border-white/5",
              (totalYouAreOwed - totalYouOwe) >= 0 
                ? "bg-emerald-500/10 text-emerald-400" 
                : "bg-rose-500/10 text-rose-400"
            )}>
              <Wallet className="h-5 w-5 sm:h-5.5 sm:w-5.5" />
            </div>
            <div className="min-w-0">
              <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-muted-foreground">Overall Balance</p>
              <h3 className={cn(
                "text-lg sm:text-2xl font-display font-black mt-0.5 truncate",
                (totalYouAreOwed - totalYouOwe) >= 0 ? "text-emerald-400" : "text-rose-400"
              )}>
                {(totalYouAreOwed - totalYouOwe) >= 0 ? '+' : ''}{formatCurrency(totalYouAreOwed - totalYouOwe)}
              </h3>
            </div>
          </div>
          <div className="hidden xs:block text-right">
            <span className={cn(
              "text-[8px] sm:text-[9px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border",
              (totalYouAreOwed - totalYouOwe) >= 0 
                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" 
                : "bg-rose-500/10 border-rose-500/20 text-rose-400"
            )}>
              {(totalYouAreOwed - totalYouOwe) >= 0 ? 'Clear' : 'Owed'}
            </span>
          </div>
        </div>
      </div>

      {/* ── People & Balances List ─────────────────────────────────── */}
      <div className="space-y-3">
        <h2 className="text-sm font-display font-bold px-1 flex items-center gap-2 text-muted-foreground">
          <span>Balances by Friend</span>
          <span className="text-[10px] bg-muted/50 px-2 py-0.5 rounded-full font-mono text-foreground shrink-0">
            {peopleBalances.length}
          </span>
        </h2>

        {peopleBalances.length === 0 ? (
          <div className="py-16 flex flex-col items-center justify-center text-center space-y-4 glass rounded-[2.5rem] border-2 border-dashed border-border/30">
            <div className="h-16 w-16 rounded-3xl bg-primary/10 flex items-center justify-center animate-pulse">
              <CheckCircle2 className="h-8 w-8 text-primary" />
            </div>
            <div>
              <p className="font-bold text-base">All Settled Up!</p>
              <p className="text-xs text-muted-foreground max-w-xs mt-1">
                No unpaid split bills right now. Good job! 🌴
              </p>
            </div>
          </div>
        ) : (
          <div className="grid gap-3">
            {peopleBalances.map(person => {
              const isExpanded = expandedPersonId === person.contactId;
              const isOwed = person.netBalance > 0;

              return (
                <div 
                  key={person.contactId}
                  className={cn(
                    "glass rounded-3xl border transition-all duration-300 overflow-hidden shadow-sm hover:shadow-md",
                    isExpanded ? "border-primary/30 ring-1 ring-primary/20" : "border-border/30 hover:border-white/20"
                  )}
                >
                  {/* Person Summary Row */}
                  <div 
                    onClick={() => {
                      haptics.light();
                      setExpandedPersonId(isExpanded ? null : person.contactId);
                    }}
                    className="p-4 sm:p-5 flex items-center justify-between cursor-pointer select-none gap-4"
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      {/* Avatar */}
                      <div className={cn(
                        "h-11 w-11 rounded-2xl flex items-center justify-center shrink-0 border border-white/5 shadow-inner",
                        isOwed ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"
                      )}>
                        {person.contactAvatar ? (
                          <img src={person.contactAvatar} alt={person.contactName} className="h-full w-full object-cover rounded-2xl" />
                        ) : (
                          <User className="h-5.5 w-5.5" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-bold text-base truncate">{person.contactName}</h4>
                        <p className={cn(
                          "text-xs font-semibold mt-0.5",
                          isOwed ? "text-emerald-400" : "text-rose-400"
                        )}>
                          {isOwed ? 'owes you' : 'you owe'} {formatCurrency(Math.abs(person.netBalance))}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSettlePerson(person);
                        }}
                        className={cn(
                          "h-9 px-4 rounded-xl text-xs font-bold transition-all border border-transparent shadow-sm",
                          isOwed
                            ? "bg-emerald-500 hover:bg-emerald-600 text-white"
                            : "bg-rose-500 hover:bg-rose-600 text-white"
                        )}
                      >
                        Settle
                      </Button>
                      
                      <div className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground/50 hover:bg-white/5">
                        {isExpanded ? <ChevronUp className="h-4.5 w-4.5" /> : <ChevronDown className="h-4.5 w-4.5" />}
                      </div>
                    </div>
                  </div>

                  {/* Expanded Breakdown */}
                  <AnimatePresence initial={false}>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                      >
                        <div className="px-4 sm:px-5 pb-5 pt-1 border-t border-border/20 bg-black/10 space-y-3">
                          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 mb-2">Unpaid splits</p>
                          
                          <div className="space-y-2.5">
                            {person.unpaidExpenses.map(unpaid => {
                              const dateString = new Date(unpaid.expenseDate).toLocaleDateString('en-IN', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric'
                              });

                              return (
                                <div 
                                  key={unpaid.expenseId}
                                  className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-2xl bg-muted/20 border border-border/10 gap-3 hover:bg-muted/30 transition-colors"
                                >
                                  <div className="flex items-start gap-3 min-w-0">
                                    <div className="h-9 w-9 rounded-xl bg-muted/40 flex items-center justify-center text-muted-foreground shrink-0 mt-0.5">
                                      <Receipt className="h-4.5 w-4.5" />
                                    </div>
                                    <div className="min-w-0">
                                      <h5 className="font-bold text-sm truncate">{unpaid.expenseVendor}</h5>
                                      <div className="flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground mt-0.5">
                                        <span className="flex items-center gap-1 font-mono">
                                          <Calendar className="h-2.5 w-2.5" />
                                          {dateString}
                                        </span>
                                        <span>•</span>
                                        <span>Total bill: {formatCurrency(unpaid.totalAmount)}</span>
                                      </div>
                                    </div>
                                  </div>

                                  <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0 pl-12 sm:pl-0">
                                    <div className="text-left sm:text-right">
                                      <p className={cn(
                                        "font-mono font-bold text-sm",
                                        unpaid.type === 'you_lent' ? "text-emerald-400" : "text-rose-400"
                                      )}>
                                        {unpaid.type === 'you_lent' ? '+' : '-'}{formatCurrency(unpaid.shareAmount)}
                                      </p>
                                      <span className={cn(
                                        "text-[9px] font-bold uppercase tracking-tighter",
                                        unpaid.type === 'you_lent' ? "text-emerald-400" : "text-rose-400"
                                      )}>
                                        {unpaid.type === 'you_lent' ? 'they owe you' : 'you owe them'}
                                      </span>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="flex items-center gap-2">
                                      {/* WhatsApp Reminder */}
                                      <Button
                                        onClick={() => handleWhatsAppReminder(unpaid, person.contactId)}
                                        className="h-8 px-3 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 text-[10px] font-bold gap-1 transition-all border border-primary/20"
                                        title="Send WhatsApp Reminder"
                                      >
                                        <Share2 className="h-3 w-3" />
                                        <span>Remind</span>
                                      </Button>

                                      {/* Mark Settled */}
                                      <Button
                                        onClick={() => handleMarkSplitPaid(unpaid, person.contactId)}
                                        className="h-8 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-[10px] font-bold gap-1 transition-all border-none"
                                        title="Mark as paid"
                                      >
                                        <Check className="h-3 w-3" strokeWidth={3} />
                                        <span>Paid</span>
                                      </Button>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Info Card */}
      <div className="flex items-start gap-2.5 p-4 rounded-2xl bg-primary/5 text-xs text-muted-foreground leading-relaxed border border-primary/10">
        <Info className="h-4.5 w-4.5 shrink-0 text-primary mt-0.5" />
        <p>
          This page shows your unpaid split bills. Mark a bill as Paid when settled, or click Settle to clear all balances with a friend at once.
        </p>
      </div>

      {/* ── Settle Up Confirmation Dialog ─────────────────────────── */}
      <AlertDialog open={isSettling} onOpenChange={(open) => {
        setIsSettling(open);
        if (!open) setSettlePerson(null);
      }}>
        <AlertDialogContent className="rounded-3xl border-border/40 glass max-w-[90vw] sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-bold">
              Clear balances with {settlePerson?.contactName}?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground text-xs leading-relaxed">
              This will mark all {settlePerson?.unpaidExpenses.length} unpaid bills with {settlePerson?.contactName} as paid.
            </AlertDialogDescription>
          </AlertDialogHeader>

          {settlePerson && (
            <div className="py-2 space-y-4">
              {/* Debt summary card */}
              <div className={cn(
                "p-4 rounded-2xl border text-center space-y-1 bg-black/10",
                settlePerson.netBalance > 0 ? "border-emerald-500/20" : "border-rose-500/20"
              )}>
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                  {settlePerson.netBalance > 0 ? "They owe you" : "You owe them"}
                </p>
                <h4 className={cn(
                  "text-2xl font-display font-black",
                  settlePerson.netBalance > 0 ? "text-emerald-400" : "text-rose-400"
                )}>
                  {formatCurrency(Math.abs(settlePerson.netBalance))}
                </h4>
              </div>

              {/* Settle amount input (manual override) */}
              <div className="space-y-2 text-left px-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                  Settle Amount (INR)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-2 text-xs font-mono text-muted-foreground">₹</span>
                  <Input
                    type="number"
                    value={settleAmount || ''}
                    onChange={e => {
                      const val = parseFloat(e.target.value);
                      setSettleAmount(isNaN(val) ? 0 : val);
                    }}
                    placeholder="0.00"
                    className="pl-7 h-9 text-xs rounded-xl bg-background/50 border-border/40 font-mono"
                  />
                </div>
              </div>

              {/* UPI section */}
              {(() => {
                const isOwed = settlePerson.netBalance > 0;
                const contactObj = contacts.find(c => c.id === settlePerson.contactId);
                const currentUpi = isOwed ? settings.upiId : contactObj?.upiId;

                if (!currentUpi) {
                  return (
                    <div className="space-y-3 p-4 rounded-2xl bg-muted/20 border border-border/20 text-left">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs font-bold">UPI Payments Offline</p>
                          <p className="text-[10px] text-muted-foreground">
                            {isOwed 
                              ? "Set your UPI ID to show a settlement QR Code for them to scan." 
                              : `Add ${settlePerson.contactName}'s UPI ID to generate a payment link & QR Code.`}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex gap-2">
                        <Input
                          value={tempUpiId}
                          onChange={e => setTempUpiId(e.target.value)}
                          placeholder="e.g. name@upi"
                          className="h-9 text-xs rounded-xl bg-background/50 border-border/40 font-mono"
                        />
                        <Button
                          onClick={() => {
                            if (!tempUpiId.trim()) return;
                            if (isOwed) {
                              const updated = { ...settings, upiId: tempUpiId.trim() };
                              settingsService.save(updated);
                              setSettings(updated);
                              toast.success('Your UPI ID saved');
                            } else {
                              if (contactObj) {
                                contactService.updateContact({
                                  ...contactObj,
                                  upiId: tempUpiId.trim()
                                });
                                toast.success(`${settlePerson.contactName}'s UPI ID saved`);
                                loadData();
                              }
                            }
                            haptics.success();
                          }}
                          className="h-9 px-3 rounded-xl bg-primary text-primary-foreground font-bold text-xs"
                        >
                          Save
                        </Button>
                      </div>
                    </div>
                  );
                }

                // If UPI ID exists, show QR code & Pay link
                const upiUrl = `upi://pay?pa=${currentUpi}&pn=${encodeURIComponent(isOwed ? (settings.billedFrom.name || 'User') : settlePerson.contactName)}&am=${settleAmount.toFixed(2)}&cu=INR`;

                return (
                  <div className="p-4 rounded-2xl bg-muted/20 border border-border/20 flex flex-col items-center gap-3">
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                      {isOwed ? "Ask them to scan this QR" : "Scan to pay or tap pay button"}
                    </p>

                    <div className="relative p-[3px] bg-gradient-to-tr from-primary via-violet-500 to-cyan-400 rounded-[22px] shadow-glow-sm shrink-0">
                      <div className="relative p-2 bg-white rounded-[19px] flex items-center justify-center overflow-hidden">
                        <canvas id="upi-qrcode-canvas" className="rounded-lg h-32 w-32" />
                        {/* Center Logo Overlay */}
                        <div className="absolute inset-0 m-auto w-8 h-8 rounded-xl bg-gradient-brand flex items-center justify-center shadow-md border-2 border-white overflow-hidden z-10">
                          <img src="/logo.png" alt="Logo" className="h-4.5 w-4.5 object-contain" />
                        </div>
                        {/* Animated Scanner Laser Line */}
                        <div className="scanner-line" />
                      </div>
                    </div>

                    <div className="text-center w-full space-y-2">
                      <p className="text-xs font-mono font-bold select-all text-primary">{currentUpi}</p>
                      
                      <div className="flex justify-center gap-4">
                        <button 
                          onClick={() => {
                            if (isOwed) {
                              const updated = { ...settings, upiId: '' };
                              settingsService.save(updated);
                              setSettings(updated);
                            } else {
                              if (contactObj) {
                                contactService.updateContact({ ...contactObj, upiId: undefined });
                                loadData();
                              }
                            }
                            setTempUpiId('');
                            toast.info('UPI ID cleared. You can enter a new one.');
                            haptics.selection();
                          }}
                          className="text-[9px] text-muted-foreground hover:underline uppercase tracking-wider font-bold"
                        >
                          Change UPI ID
                        </button>
                        
                        <button 
                          onClick={() => handleCopyLink(upiUrl)}
                          className="text-[9px] text-muted-foreground hover:underline uppercase tracking-wider font-bold flex items-center gap-1"
                        >
                          {copiedUpi ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                          <span>{copiedUpi ? 'Copied' : 'Copy Link'}</span>
                        </button>
                      </div>
                    </div>

                    {!isOwed && (
                      <a
                        href={upiUrl}
                        onClick={() => haptics.medium()}
                        className="flex items-center justify-center gap-2 w-full h-11 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold transition-all shadow-md mt-1"
                      >
                        <Wallet className="h-4 w-4" />
                        <span>Pay via UPI App</span>
                      </a>
                    )}
                  </div>
                );
              })()}
            </div>
          )}

          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="rounded-xl border-white/10 hover:bg-white/5">Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmSettlePerson}
              className="rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white border-none"
            >
              Clear Balances (Mark Paid)
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Quick UPI QR Code Modal ─────────────────────────── */}
      <AlertDialog open={isQuickQrOpen} onOpenChange={setIsQuickQrOpen}>
        <AlertDialogContent className="rounded-3xl border-border/40 glass max-w-[90vw] sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-bold flex items-center gap-2">
              <QrCode className="h-6 w-6 text-primary animate-pulse" />
              <span>Quick UPI QR Code</span>
            </AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground text-xs">
              Generate a scan-to-pay QR code for any amount using your UPI ID.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="py-2 space-y-4 text-left">
            {/* UPI ID input */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                Your UPI ID
              </label>
              <Input
                value={quickUpiId}
                onChange={e => setQuickUpiId(e.target.value)}
                placeholder="yourname@upi"
                className="h-9 text-xs rounded-xl bg-background/50 border-border/40 font-mono"
              />
            </div>

            {/* Amount input */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                Request Amount (INR)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-xs font-mono text-muted-foreground">₹</span>
                <Input
                  type="number"
                  value={quickAmount || ''}
                  onChange={e => {
                    const val = parseFloat(e.target.value);
                    setQuickAmount(isNaN(val) ? 0 : val);
                  }}
                  placeholder="0.00"
                  className="pl-7 h-9 text-xs rounded-xl bg-background/50 border-border/40 font-mono"
                />
              </div>
            </div>

            {/* QR Code and Info */}
            {quickUpiId.trim() ? (
              <div className="p-4 rounded-2xl bg-muted/20 border border-border/20 flex flex-col items-center gap-3">
                <div className="relative p-[3px] bg-gradient-to-tr from-primary via-violet-500 to-cyan-400 rounded-[22px] shadow-glow-sm shrink-0">
                  <div className="relative p-2 bg-white rounded-[19px] flex items-center justify-center overflow-hidden">
                    <canvas id="quick-upi-canvas" className="rounded-lg h-32 w-32" />
                    {/* Center Logo Overlay */}
                    <div className="absolute inset-0 m-auto w-8 h-8 rounded-xl bg-gradient-brand flex items-center justify-center shadow-md border-2 border-white overflow-hidden z-10">
                      <img src="/logo.png" alt="Logo" className="h-4.5 w-4.5 object-contain" />
                    </div>
                    {/* Animated Scanner Laser Line */}
                    <div className="scanner-line" />
                  </div>
                </div>
                
                <div className="text-center w-full space-y-1.5">
                  <p className="text-xs font-mono font-bold text-primary select-all">
                    {quickUpiId}
                  </p>
                  
                  {(() => {
                    const name = settings.billedFrom.name || 'User';
                    const upiUrl = `upi://pay?pa=${quickUpiId.trim()}&pn=${encodeURIComponent(name)}&am=${quickAmount.toFixed(2)}&cu=INR`;
                    return (
                      <button 
                        onClick={() => handleCopyLink(upiUrl)}
                        className="text-[9px] text-muted-foreground hover:underline uppercase tracking-wider font-bold mx-auto flex items-center gap-1"
                      >
                        {copiedUpi ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                        <span>{copiedUpi ? 'Copied' : 'Copy Link'}</span>
                      </button>
                    );
                  })()}
                </div>
                {quickAmount > 0 && (
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                    Requesting: {formatCurrency(quickAmount)}
                  </p>
                )}
              </div>
            ) : (
              <div className="p-6 text-center text-xs text-muted-foreground rounded-2xl bg-muted/20 border border-border/20">
                Please enter your UPI ID to generate the QR Code.
              </div>
            )}
          </div>

          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="rounded-xl border-white/10 hover:bg-white/5">Close</AlertDialogCancel>
            {quickUpiId.trim() && (
              <Button
                onClick={() => {
                  const updated = { ...settings, upiId: quickUpiId.trim() };
                  settingsService.save(updated);
                  setSettings(updated);
                  toast.success('Your UPI ID saved to Settings');
                  setIsQuickQrOpen(false);
                }}
                className="rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white border-none text-xs font-bold"
              >
                Save UPI & Close
              </Button>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Log Direct IOU / Debt Modal ─────────────────────────── */}
      <AlertDialog open={isIouOpen} onOpenChange={setIsIouOpen}>
        <AlertDialogContent className="rounded-3xl border-border/40 glass max-w-[90vw] sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-bold flex items-center gap-2">
              <Users className="h-6 w-6 text-primary" />
              <span>Log Direct IOU / Debt</span>
            </AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground text-xs">
              Log a direct balance between you and a friend without splitting a bill.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="py-2 space-y-4 text-left">
            {/* Direction selector */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                Transaction Type
              </label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIouType('you_owe')}
                  className={cn(
                    "h-10 rounded-xl text-xs font-bold transition-all border border-transparent shadow-sm flex items-center justify-center gap-1.5",
                    iouType === 'you_owe' 
                      ? "bg-rose-500 hover:bg-rose-600 text-white font-black" 
                      : "bg-muted/40 hover:bg-muted/60 text-muted-foreground"
                  )}
                >
                  <ArrowDownLeft className="h-4 w-4" />
                  You Owe Them
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIouType('owes_you')}
                  className={cn(
                    "h-10 rounded-xl text-xs font-bold transition-all border border-transparent shadow-sm flex items-center justify-center gap-1.5",
                    iouType === 'owes_you' 
                      ? "bg-emerald-500 hover:bg-emerald-600 text-white font-black" 
                      : "bg-muted/40 hover:bg-muted/60 text-muted-foreground"
                  )}
                >
                  <ArrowUpRight className="h-4 w-4" />
                  They Owe You
                </Button>
              </div>
            </div>

            {/* Friend Selector */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                Select Friend
              </label>
              <select
                value={iouContactId}
                onChange={e => {
                  setIouContactId(e.target.value);
                  if (e.target.value !== 'new') {
                    setIouNewContactName('');
                  }
                }}
                className="w-full bg-background/50 border border-border/40 hover:bg-muted/60 transition-colors text-xs font-bold rounded-xl px-3 py-2.5 outline-none cursor-pointer text-foreground"
              >
                <option value="">Select a Friend...</option>
                {contacts.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
                <option value="new">+ Add New Friend...</option>
              </select>
            </div>

            {/* Inline New Contact Input */}
            {iouContactId === 'new' && (
              <div className="space-y-1.5 animate-in slide-in-from-top-1 duration-200">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                  New Friend's Name
                </label>
                <Input
                  value={iouNewContactName}
                  onChange={e => setIouNewContactName(e.target.value)}
                  placeholder="Enter name"
                  className="h-9 text-xs rounded-xl bg-background/50 border-border/40 font-bold"
                />
              </div>
            )}

            {/* Amount Input */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                Amount (INR)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-xs font-mono text-muted-foreground">₹</span>
                <Input
                  type="number"
                  value={iouAmount || ''}
                  onChange={e => {
                    const val = parseFloat(e.target.value);
                    setIouAmount(isNaN(val) ? 0 : val);
                  }}
                  placeholder="0.00"
                  className="pl-7 h-9 text-xs rounded-xl bg-background/50 border-border/40 font-mono font-bold text-foreground"
                />
              </div>
            </div>

            {/* Description Input */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                For / Description
              </label>
              <Input
                value={iouDescription}
                onChange={e => setIouDescription(e.target.value)}
                placeholder="e.g. Uber ride, dinner, cash loan"
                className="h-9 text-xs rounded-xl bg-background/50 border-border/40 font-bold"
              />
            </div>

            {/* Date Input */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                Date
              </label>
              <Input
                type="date"
                value={iouDate}
                onChange={e => setIouDate(e.target.value)}
                className="h-9 text-xs rounded-xl bg-background/50 border-border/40 font-mono text-foreground font-bold"
              />
            </div>
          </div>

          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="rounded-xl border-white/10 hover:bg-white/5">Cancel</AlertDialogCancel>
            <Button
              onClick={handleSaveIou}
              disabled={isSavingIou || (!iouContactId && iouContactId !== 'new') || (iouContactId === 'new' && !iouNewContactName.trim()) || iouAmount <= 0}
              className="rounded-xl bg-primary hover:bg-primary/90 text-white border-none text-xs font-bold px-4"
            >
              {isSavingIou ? 'Saving...' : 'Log IOU'}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
