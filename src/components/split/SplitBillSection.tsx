import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Contact, ExpenseSplit, SplitType, SplitMember } from '@/types/split';
import { ContactSelector } from './ContactSelector';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Users, Info, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { contactService } from '@/lib/contact-service';

interface SplitBillSectionProps {
  amount: number;
  onSplitChange: (split: ExpenseSplit | undefined) => void;
  onPaidByChange: (paidBy: string | undefined) => void;
  initialSplit?: ExpenseSplit;
  initialPaidBy?: string;
}

export function SplitBillSection({ 
  amount, 
  onSplitChange, 
  onPaidByChange,
  initialSplit,
  initialPaidBy 
}: SplitBillSectionProps) {
  const [isEnabled, setIsEnabled] = useState(!!initialSplit);
  const [paidBy, setPaidBy] = useState<string>(initialPaidBy || 'user');
  const [splitType, setSplitType] = useState<SplitType>(initialSplit?.splitType || 'equal');
  const [selectedContactIds, setSelectedContactIds] = useState<string[]>(
    initialSplit?.members.map(m => m.contactId) || []
  );
  const [customAmounts, setCustomAmounts] = useState<Record<string, number>>(
    initialSplit?.members.reduce((acc, m) => ({ ...acc, [m.contactId]: m.amount }), {}) || {}
  );

  useEffect(() => {
    if (!isEnabled) {
      onSplitChange(undefined);
      return;
    }

    let members: SplitMember[] = [];
    
    if (splitType === 'equal') {
      const share = amount / (selectedContactIds.length + 1); // +1 for the user
      members = selectedContactIds.map(id => ({
        contactId: id,
        amount: share,
        paid: false
      }));
    } else if (splitType === 'exact') {
      members = selectedContactIds.map(id => ({
        contactId: id,
        amount: customAmounts[id] || 0,
        paid: false
      }));
    }

    onSplitChange({
      totalAmount: amount,
      splitType,
      members
    });
  }, [isEnabled, splitType, selectedContactIds, customAmounts, amount]);
  
  // Auto-initialize exact amounts to equal shares when participants are added or if all are zero
  useEffect(() => {
    if (isEnabled && splitType === 'exact' && selectedContactIds.length > 0) {
      const missingAny = selectedContactIds.some(id => customAmounts[id] === undefined) || customAmounts['user'] === undefined;
      const allZero = selectedContactIds.every(id => !customAmounts[id] || customAmounts[id] === 0) && (!customAmounts['user'] || customAmounts['user'] === 0);
      
      if (missingAny || allZero) {
        const share = amount / (selectedContactIds.length + 1);
        const newAmounts = { ...customAmounts };
        newAmounts['user'] = Number(share.toFixed(2));
        selectedContactIds.forEach(id => {
          newAmounts[id] = Number(share.toFixed(2));
        });
        setCustomAmounts(newAmounts);
      }
    }
  }, [isEnabled, splitType, selectedContactIds.length, amount]);

  useEffect(() => {
    onPaidByChange(paidBy === 'user' ? undefined : paidBy);
  }, [paidBy]);

  const handleCustomAmountChange = (contactId: string, val: string) => {
    const num = parseFloat(val) || 0;
    setCustomAmounts(prev => ({ ...prev, [contactId]: num }));
  };

  const contacts = contactService.getContacts();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className={cn("h-4 w-4", isEnabled ? "text-primary" : "text-muted-foreground")} />
          <Label className="text-sm font-bold">Split this bill</Label>
        </div>
        <button
          type="button"
          onClick={() => setIsEnabled(!isEnabled)}
          className={cn(
            "relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50",
            isEnabled ? "bg-primary" : "bg-muted"
          )}
        >
          <span
            className={cn(
              "pointer-events-none block h-4 w-4 rounded-full bg-background shadow-lg ring-0 transition-transform",
              isEnabled ? "translate-x-4" : "translate-x-0"
            )}
          />
        </button>
      </div>

      {isEnabled && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="space-y-4 pt-2"
        >
          <div className="space-y-2">
            <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Who paid?</Label>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setPaidBy('user')}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-medium transition-all",
                  paidBy === 'user'
                    ? "bg-primary/20 border-primary text-primary"
                    : "bg-muted/30 border-border/40 text-muted-foreground hover:bg-muted/50"
                )}
              >
                You
                {paidBy === 'user' && <Check className="h-3 w-3" />}
              </button>
              {contacts.filter(c => selectedContactIds.includes(c.id)).map(contact => (
                <button
                  key={contact.id}
                  type="button"
                  onClick={() => setPaidBy(contact.id)}
                  className={cn(
                    "flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-medium transition-all",
                    paidBy === contact.id
                      ? "bg-primary/20 border-primary text-primary"
                      : "bg-muted/30 border-border/40 text-muted-foreground hover:bg-muted/50"
                  )}
                >
                  {contact.name}
                  {paidBy === contact.id && <Check className="h-3 w-3" />}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            {(['equal', 'exact'] as SplitType[]).map(type => (
              <button
                key={type}
                type="button"
                onClick={() => setSplitType(type)}
                className={cn(
                  "flex-1 py-2 rounded-xl border text-xs font-semibold capitalize transition-all",
                  splitType === type
                    ? "bg-primary/10 border-primary text-primary"
                    : "bg-muted/30 border-border/40 text-muted-foreground hover:bg-muted/50"
                )}
              >
                {type}
              </button>
            ))}
          </div>

          <div className="space-y-2">
            <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Select Participants</Label>
            <ContactSelector 
              selectedIds={selectedContactIds} 
              onSelect={setSelectedContactIds} 
            />
          </div>

          {selectedContactIds.length > 0 && (
            <div className="rounded-2xl bg-muted/30 border border-border/40 p-4 space-y-3">
              <div className="flex items-center justify-between text-[11px] font-bold text-muted-foreground uppercase tracking-wider border-b border-border/20 pb-2">
                <span>Participant</span>
                <span>Amount</span>
              </div>
              
              <div className="flex items-center justify-between gap-4">
                <span className="text-sm font-medium text-foreground">
                  You (Owner) {paidBy === 'user' && <span className="text-[10px] text-primary font-bold">(Paid)</span>}
                </span>
                {splitType === 'equal' ? (
                  <span className="font-mono text-sm">₹{(amount / (selectedContactIds.length + 1)).toFixed(2)}</span>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground text-xs">₹</span>
                    <input
                      type="number"
                      value={customAmounts['user'] ?? ''}
                      onChange={e => handleCustomAmountChange('user', e.target.value)}
                      className="w-20 bg-background/50 border border-border/40 rounded-lg px-2 py-1 text-sm font-mono text-right outline-none focus:border-primary/50"
                      placeholder="0.00"
                    />
                  </div>
                )}
              </div>

              {selectedContactIds.map(id => {
                const contact = contacts.find(c => c.id === id);
                if (!contact) return null;
                const share = amount / (selectedContactIds.length + 1);
                
                return (
                  <div key={id} className="flex items-center justify-between gap-4">
                    <span className="text-sm text-muted-foreground">
                      {contact.name} {paidBy === contact.id && <span className="text-[10px] text-primary font-bold">(Paid)</span>}
                    </span>
                    {splitType === 'equal' ? (
                      <span className="font-mono text-sm">₹{share.toFixed(2)}</span>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground text-xs">₹</span>
                        <input
                          type="number"
                          value={customAmounts[id] ?? ''}
                          onChange={e => handleCustomAmountChange(id, e.target.value)}
                          className="w-20 bg-background/50 border border-border/40 rounded-lg px-2 py-1 text-sm font-mono text-right outline-none focus:border-primary/50"
                          placeholder="0.00"
                        />
                      </div>
                    )}
                  </div>
                );
              })}
              
              {splitType === 'exact' && (
                <div className="pt-2 border-t border-border/20 flex items-center justify-between">
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase">Unallocated</span>
                    <button 
                      type="button"
                      onClick={() => {
                        const share = amount / (selectedContactIds.length + 1);
                        const newAmounts = { ...customAmounts };
                        newAmounts['user'] = Number(share.toFixed(2));
                        selectedContactIds.forEach(id => {
                          newAmounts[id] = Number(share.toFixed(2));
                        });
                        setCustomAmounts(newAmounts);
                      }}
                      className="text-[9px] text-primary hover:underline font-bold uppercase tracking-wider text-left"
                    >
                      Distribute Equally
                    </button>
                  </div>
                  <span className={cn(
                    "text-xs font-mono font-bold",
                    Math.abs(amount - (Object.entries(customAmounts).reduce((acc, [id, val]) => {
                      if (id !== 'user' && !selectedContactIds.includes(id)) return acc;
                      return acc + (val || 0);
                    }, 0))) < 0.01 ? "text-emerald-500" : "text-rose-500"
                  )}>
                    ₹{Math.max(0, amount - (Object.entries(customAmounts).reduce((acc, [id, val]) => {
                      if (id !== 'user' && !selectedContactIds.includes(id)) return acc;
                      return acc + (val || 0);
                    }, 0))).toFixed(2)}
                  </span>
                </div>
              )}
            </div>
          )}

          <div className="flex items-start gap-2 p-3 rounded-xl bg-primary/5 text-[10px] text-muted-foreground leading-relaxed">
            <Info className="h-3 w-3 shrink-0 text-primary mt-0.5" />
            <p>
              Splitting an expense will track who owes whom. The "Paid By" person is considered the lender.
            </p>
          </div>
        </motion.div>
      )}
    </div>
  );
}
