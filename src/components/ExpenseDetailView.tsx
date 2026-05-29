import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { 
  X, Calendar, Tag, FileText, Camera, ZoomIn, 
  Trash2, Edit, Users, Receipt, ArrowLeft, 
  Share2, IndianRupee, Briefcase, Clock
} from 'lucide-react';
import { createPortal } from 'react-dom';
import { Expense, ExpenseStatus } from '@/types/expense';
import { getCategoryConfig } from '@/lib/categories';
import { formatCurrency, cn, rewardBurst } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { haptics } from '@/lib/haptics';
import { useIsMobile } from '@/hooks/useIsMobile';
import { contactService } from '@/lib/contact-service';
import { scheduleSplitReminders } from '@/lib/split-reminders';

interface ExpenseDetailViewProps {
  expense: Expense | null;
  onClose: () => void;
  onEdit: (expense: Expense) => void;
  onDelete: (id: string) => void;
  onUpdateExpense?: (expense: Expense) => void;
}

const STATUS_CONFIG: Record<ExpenseStatus, { label: string; icon: string; color: string; bg: string }> = {
  pending: { label: 'Pending', icon: '⏳', color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
  approved: { label: 'Approved', icon: '✅', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
  reimbursed: { label: 'Reimbursed', icon: '💸', color: 'text-violet-400', bg: 'bg-violet-500/10 border-violet-500/20' },
  rejected: { label: 'Rejected', icon: '❌', color: 'text-rose-400', bg: 'bg-rose-500/10 border-rose-500/20' },
};

export function ExpenseDetailView({ expense, onClose, onEdit, onDelete, onUpdateExpense }: ExpenseDetailViewProps) {
  const isMobile = useIsMobile();
  const contacts = contactService.getContacts();

  if (!expense) return null;

  const cfg = getCategoryConfig(expense.category);
  const CategoryIcon = cfg.icon;
  const status = STATUS_CONFIG[expense.status];

  const content = (
    <div className="flex flex-col h-full bg-background overflow-hidden">
      {/* Hero Header */}
      <div 
        className="relative shrink-0 pt-12 pb-10 px-8 text-center overflow-hidden border-b border-white/5"
        style={{
          background: `linear-gradient(to bottom, ${cfg.gradientFrom}15, transparent)`,
        }}
      >
        {/* Decorative elements */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full blur-[100px] opacity-20" style={{ background: cfg.gradientFrom }} />
          <div className="absolute -bottom-20 -left-20 w-64 h-64 rounded-full blur-[100px] opacity-10" style={{ background: cfg.gradientTo }} />
        </div>

        {/* Close Button (Mobile Only) */}
        {isMobile && (
          <button 
            onClick={onClose}
            className="absolute top-6 left-6 h-10 w-10 rounded-2xl bg-black/20 backdrop-blur-xl border border-white/10 flex items-center justify-center text-white active:scale-90 transition-all z-20"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
        )}

        <div className="relative z-10">
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className={cn(
              "h-20 w-20 rounded-[2rem] flex items-center justify-center mx-auto mb-6 shadow-2xl border border-white/10",
              cfg.bgColor
            )}
          >
            <CategoryIcon className={cn("h-10 w-10", cfg.color)} />
          </motion.div>

          <motion.h2 
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="text-2xl font-black tracking-tight mb-2"
          >
            {expense.vendor}
          </motion.h2>

          <motion.div 
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.15 }}
            className="flex items-center justify-center gap-1.5 text-4xl font-black font-mono tracking-tighter text-foreground mb-4"
          >
            <span className="text-2xl text-muted-foreground/40 font-black">₹</span>
            {expense.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </motion.div>

          <motion.div
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="flex items-center justify-center gap-2"
          >
            {expense.isReimbursement ? (
              <Badge className={cn(
                "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-[0.1em] border",
                status.bg,
                status.color
              )}>
                {status.icon} {status.label}
              </Badge>
            ) : (
              <Badge className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-[0.1em] border border-emerald-500/20 bg-emerald-500/10 text-emerald-400">
                ⭐ Personal
              </Badge>
            )}
            {expense.projectCode && (
              <Badge variant="outline" className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-[0.1em] border-white/10 text-muted-foreground">
                <Briefcase className="h-3 w-3 mr-1.5 opacity-60" /> {expense.projectCode}
              </Badge>
            )}
          </motion.div>
        </div>
      </div>

      {/* Details List */}
      <div className="flex-1 overflow-y-auto no-scrollbar p-6 space-y-6">
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-card/40 backdrop-blur-xl p-4 rounded-[1.5rem] border border-white/5">
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40 mb-2 flex items-center gap-2">
              <Calendar className="h-3 w-3" /> Date
            </p>
            <p className="text-sm font-bold">{format(new Date(expense.date), 'EEEE, MMM do')}</p>
            <p className="text-[10px] text-muted-foreground/60 mt-1">{format(new Date(expense.date), 'yyyy')}</p>
          </div>
          <div className="bg-card/40 backdrop-blur-xl p-4 rounded-[1.5rem] border border-white/5">
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40 mb-2 flex items-center gap-2">
              <Tag className="h-3 w-3" /> Category
            </p>
            <p className="text-sm font-bold">{cfg.label}</p>
            <div className="flex gap-1 mt-2">
              {expense.tags?.map(t => (
                <span key={t} className="text-[8px] px-1.5 py-0.5 rounded-md bg-primary/10 text-primary font-black uppercase tracking-tighter">#{t}</span>
              ))}
            </div>
          </div>
        </div>

        {/* Split Details Section */}
        {(expense.split || expense.paidBy) && (
          <div className="bg-card/40 backdrop-blur-xl p-5 rounded-[2rem] border border-white/5 space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary flex items-center gap-2">
                <Users className="h-3.5 w-3.5" /> Shared Expense
              </h3>
              {expense.paidBy && (
                <div className="px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-[8px] font-black uppercase tracking-widest">
                  Paid by {expense.paidBy === 'user' ? 'You' : contacts.find(c => c.id === expense.paidBy)?.name || 'Someone'}
                </div>
              )}
            </div>
            
            {expense.split && (
              <div className="space-y-3">
                <div className="space-y-2">
                  {/* User (Owner) Share Row */}
                  {(() => {
                    const sumOthers = expense.split.members.reduce((acc, m) => acc + m.amount, 0);
                    const userShare = expense.amount - sumOthers;
                    if (userShare <= 0) return null;
                    return (
                      <div className="flex items-center justify-between bg-white/5 p-3 rounded-2xl border border-white/5">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-black text-primary uppercase">
                            ME
                          </div>
                          <div className="flex flex-col">
                            <span className="text-xs font-bold text-foreground">You (Owner)</span>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              {expense.paidBy === 'user' || !expense.paidBy ? (
                                <span className="text-[8px] bg-primary/10 border border-primary/20 text-primary px-1.5 py-0.2 rounded-full font-bold uppercase tracking-wider">Lender</span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (onUpdateExpense && expense.split) {
                                      haptics.light();
                                      const updatedExpense = {
                                        ...expense,
                                        split: {
                                          ...expense.split,
                                          userPaid: !expense.split.userPaid
                                        },
                                        updatedAt: new Date().toISOString()
                                      };
                                      onUpdateExpense(updatedExpense);
                                      scheduleSplitReminders(updatedExpense);
                                    }
                                  }}
                                  className={cn(
                                    "text-[8px] px-1.5 py-0.2 rounded-full font-bold uppercase tracking-wider border active:scale-95 transition-transform cursor-pointer",
                                    expense.split.userPaid
                                      ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                                      : "bg-amber-500/10 border-amber-500/20 text-amber-400 hover:bg-amber-500/20"
                                  )}
                                >
                                  {expense.split.userPaid ? "Paid" : "Pending"}
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                        <span className="text-sm font-mono font-black">₹{userShare.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                      </div>
                    );
                  })()}

                  {expense.split.members.map(member => {
                    const isUser = member.contactId === 'user';
                    const contact = isUser ? { name: 'You (Owner)' } : contacts.find(c => c.id === member.contactId);
                    return (
                      <div key={member.contactId} className="flex items-center justify-between bg-white/5 p-3 rounded-2xl border border-white/5">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-muted/20 flex items-center justify-center text-[10px] font-black text-muted-foreground uppercase">
                            {contact?.name?.substring(0, 2) || '??'}
                          </div>
                          <div className="flex flex-col">
                            <span className="text-xs font-bold">{contact?.name || 'Unknown'}</span>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              {expense.paidBy === member.contactId ? (
                                <span className="text-[8px] bg-primary/10 border border-primary/20 text-primary px-1.5 py-0.2 rounded-full font-bold uppercase tracking-wider">Lender</span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (onUpdateExpense && expense.split) {
                                      haptics.light();
                                      const updatedMembers = expense.split.members.map(m => {
                                        if (m.contactId === member.contactId) {
                                          return { ...m, paid: !m.paid };
                                        }
                                        return m;
                                      });
                                      
                                      const updatedExpense = {
                                        ...expense,
                                        split: {
                                          ...expense.split,
                                          members: updatedMembers
                                        },
                                        updatedAt: new Date().toISOString()
                                      };
                                      
                                      onUpdateExpense(updatedExpense);
                                      scheduleSplitReminders(updatedExpense);
                                    }
                                  }}
                                  className={cn(
                                    "text-[8px] px-1.5 py-0.2 rounded-full font-bold uppercase tracking-wider border active:scale-95 transition-transform cursor-pointer",
                                    member.paid
                                      ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                                      : "bg-amber-500/10 border-amber-500/20 text-amber-400 hover:bg-amber-500/20"
                                  )}
                                >
                                  {member.paid ? "Paid" : "Pending"}
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                        <span className="text-sm font-mono font-black">₹{member.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                      </div>
                    );
                  })}
                </div>
                <div className="pt-2 flex items-center justify-between px-1">
                  <span className="text-[9px] font-black text-muted-foreground/40 uppercase tracking-widest">Calculation Mode</span>
                  <span className="text-[10px] font-black uppercase text-primary tracking-widest bg-primary/10 px-2 py-0.5 rounded-md">{expense.split.splitType}</span>
                </div>
              </div>
            )}
          </div>
        )}

        {expense.description && (
          <div className="bg-card/40 backdrop-blur-xl p-5 rounded-[1.5rem] border border-white/5">
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40 mb-3 flex items-center gap-2">
              <FileText className="h-3.5 w-3.5" /> Notes
            </p>
            <p className="text-sm font-medium leading-relaxed text-foreground/80">{expense.description}</p>
          </div>
        )}

        {expense.receiptImage && (
          <div className="space-y-3">
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40 flex items-center gap-2 px-1">
              <Camera className="h-3.5 w-3.5" /> Attached Receipt
            </p>
            <div 
              className="relative rounded-[2rem] overflow-hidden border border-white/10 group cursor-pointer shadow-2xl"
              onClick={() => haptics.light()}
            >
              <img src={expense.receiptImage} className="w-full aspect-[4/3] object-cover transition-transform group-hover:scale-105" alt="Receipt" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end justify-center p-6">
                <div className="h-12 w-12 rounded-full bg-white/20 backdrop-blur-xl border border-white/30 flex items-center justify-center text-white shadow-xl">
                  <ZoomIn className="h-6 w-6" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Audit info */}
        <div className="flex items-center justify-center gap-4 pt-4 pb-12 opacity-30">
          <div className="flex items-center gap-1.5">
            <Clock className="h-3 w-3" />
            <span className="text-[9px] font-bold uppercase tracking-widest">Added {format(new Date(expense.createdAt || expense.date), 'MMM d, p')}</span>
          </div>
        </div>
      </div>

      {/* Sticky Bottom Actions */}
      <div className="shrink-0 p-6 bg-gradient-to-t from-background via-background to-transparent pt-10">
        <div className="flex gap-3 max-w-2xl mx-auto">
          <Button 
            className="flex-1 h-14 rounded-2xl bg-primary text-white hover:opacity-90 font-black uppercase tracking-widest text-[11px] shadow-glow border-none gap-2"
            onClick={() => {
              haptics.selection();
              onEdit(expense);
            }}
          >
            <Edit className="h-4.5 w-4.5" /> Edit Expense
          </Button>
          <Button 
            variant="outline" 
            className="h-14 w-14 rounded-2xl border-white/10 bg-card hover:bg-white/5 text-foreground shadow-xl"
            onClick={() => {
              // Handle Share/Export
              haptics.light();
            }}
          >
            <Share2 className="h-5 w-5" />
          </Button>
          <Button 
            variant="outline" 
            className="h-14 w-14 rounded-2xl border-rose-500/20 bg-rose-500/10 text-rose-400 hover:bg-rose-500 hover:text-white transition-all shadow-xl"
            onClick={() => {
              haptics.heavy();
              onDelete(expense.id);
            }}
          >
            <Trash2 className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  );

  const overlay = (
    <div className="fixed inset-0 z-40 flex items-end sm:items-center justify-center">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/90 backdrop-blur-xl"
        onClick={onClose}
      />
      <motion.div
        initial={isMobile ? { y: "100%" } : { scale: 0.9, opacity: 0 }}
        animate={isMobile ? { y: 0 } : { scale: 1, opacity: 1 }}
        exit={isMobile ? { y: "100%" } : { scale: 0.9, opacity: 0 }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        drag={isMobile ? "y" : false}
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={isMobile ? { top: 0, bottom: 0.8 } : 0}
        onDragEnd={(_, info) => {
          if (info.offset.y > 150 || info.velocity.y > 500) {
            haptics.light();
            onClose();
          }
        }}
        className={cn(
          "relative w-full overflow-hidden bg-background shadow-2xl z-10 flex flex-col",
          isMobile ? "h-[94vh] rounded-t-[3rem]" : "h-[85vh] max-w-xl rounded-[3rem] border border-white/10"
        )}
      >
        {isMobile && (
          <div className="flex justify-center pt-4 pb-2 shrink-0 bg-transparent absolute top-0 left-0 right-0 z-30 pointer-events-auto cursor-grab active:cursor-grabbing">
            <div 
              className="h-1.5 w-12 rounded-full" 
              style={{ backgroundColor: cfg?.gradientFrom ? `${cfg.gradientFrom}60` : 'rgba(255,255,255,0.2)' }}
            />
          </div>
        )}
        <div className="flex-1 overflow-hidden pt-6">
          {content}
        </div>
      </motion.div>
    </div>
  );

  return createPortal(
    <AnimatePresence>
      {expense && overlay}
    </AnimatePresence>,
    document.body
  );
}
