import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Contact } from '@/types/split';
import { contactService } from '@/lib/contact-service';
import { Search, User, Plus, Check, X, Phone, QrCode, UserPlus, ChevronDown } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { haptics } from '@/lib/haptics';
import { toast } from 'sonner';

interface FriendSearchSelectorProps {
  mode?: 'single' | 'multi';
  value: string | string[];
  onChange: (value: any) => void;
  placeholder?: string;
  className?: string;
  allowAddNew?: boolean;
}

export function FriendSearchSelector({
  mode = 'single',
  value,
  onChange,
  placeholder = 'Search friends by name, phone or UPI...',
  className,
  allowAddNew = true,
}: FriendSearchSelectorProps) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [isAddingNew, setIsAddingNew] = useState(false);

  // New friend form state
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newUpiId, setNewUpiId] = useState('');

  const loadContacts = () => {
    setContacts(contactService.getContacts());
  };

  useEffect(() => {
    loadContacts();
  }, []);

  const selectedIds = useMemo(() => {
    if (mode === 'single') {
      return value ? [value as string] : [];
    }
    return Array.isArray(value) ? (value as string[]) : [];
  }, [mode, value]);

  const filteredContacts = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return contacts;
    return contacts.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.phone && c.phone.toLowerCase().includes(q)) ||
        (c.upiId && c.upiId.toLowerCase().includes(q)) ||
        (c.email && c.email.toLowerCase().includes(q))
    );
  }, [contacts, searchQuery]);

  const handleSelect = (id: string) => {
    haptics.selection();
    if (mode === 'single') {
      onChange(id);
      setIsOpen(false);
      setSearchQuery('');
    } else {
      const current = selectedIds;
      if (current.includes(id)) {
        onChange(current.filter((item) => item !== id));
      } else {
        onChange([...current, id]);
      }
    }
  };

  const handleRemove = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    haptics.light();
    if (mode === 'single') {
      onChange('');
    } else {
      onChange(selectedIds.filter((item) => item !== id));
    }
  };

  const handleCreateFriend = () => {
    const nameToUse = newName.trim() || searchQuery.trim();
    if (!nameToUse) {
      toast.error('Please enter a friend name');
      return;
    }

    const created = contactService.addContact({
      name: nameToUse,
      phone: newPhone.trim() || undefined,
      upiId: newUpiId.trim() || undefined,
    });

    toast.success(`Added ${created.name} to friends`);
    haptics.success();
    loadContacts();
    
    // Auto select
    handleSelect(created.id);

    // Reset form
    setNewName('');
    setNewPhone('');
    setNewUpiId('');
    setIsAddingNew(false);
    setSearchQuery('');
  };

  return (
    <div className={cn("relative w-full space-y-2", className)}>
      {/* Selected Friends Badges (Multi or Single) */}
      {selectedIds.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {selectedIds.map((id) => {
            const contact = contacts.find((c) => c.id === id);
            const displayName = contact ? contact.name : 'Selected Friend';
            return (
              <motion.span
                key={id}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-primary/15 text-primary border border-primary/30"
              >
                <div className="h-4 w-4 rounded-full bg-primary/20 flex items-center justify-center text-[10px]">
                  {contact?.avatar ? (
                    <img src={contact.avatar} alt={displayName} className="h-full w-full rounded-full object-cover" />
                  ) : (
                    <User className="h-2.5 w-2.5" />
                  )}
                </div>
                <span>{displayName}</span>
                <button
                  type="button"
                  onClick={(e) => handleRemove(id, e)}
                  className="h-4 w-4 rounded-full hover:bg-primary/20 flex items-center justify-center transition-colors"
                >
                  <X className="h-3 w-3" />
                </button>
              </motion.span>
            );
          })}
        </div>
      )}

      {/* Main Search Input / Trigger */}
      <div className="relative">
        <div className="relative flex items-center">
          <Search className="absolute left-3.5 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              if (!isOpen) setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
            placeholder={placeholder}
            className="pl-9 pr-9 h-10 text-xs rounded-xl bg-background/50 border-border/40 font-semibold text-foreground focus:ring-2 focus:ring-primary/30"
          />
          {searchQuery ? (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-3 h-5 w-5 rounded-full hover:bg-muted flex items-center justify-center text-muted-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setIsOpen(!isOpen)}
              className="absolute right-3 h-5 w-5 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground"
            >
              <ChevronDown className={cn("h-4 w-4 transition-transform duration-200", isOpen && "rotate-180")} />
            </button>
          )}
        </div>
      </div>

      {/* Dropdown / Search Results Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="absolute left-0 right-0 z-50 mt-1 max-h-60 overflow-y-auto rounded-2xl border border-border/40 glass bg-background/95 backdrop-blur-xl shadow-2xl p-2 space-y-1"
          >
            {/* Quick Add New Friend Inline Header Action */}
            {allowAddNew && !isAddingNew && (
              <button
                type="button"
                onClick={() => {
                  setNewName(searchQuery);
                  setIsAddingNew(true);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-primary hover:bg-primary/10 transition-colors border border-dashed border-primary/30 mb-1"
              >
                <UserPlus className="h-4 w-4" />
                <span>+ Add "{searchQuery || 'New Friend'}"</span>
              </button>
            )}

            {/* Inline Add New Friend Form */}
            {isAddingNew && (
              <div className="p-3 rounded-xl bg-muted/40 border border-primary/20 space-y-2 mb-2 animate-in fade-in duration-200">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider text-primary">New Friend Details</span>
                  <button
                    type="button"
                    onClick={() => setIsAddingNew(false)}
                    className="text-muted-foreground hover:text-foreground text-xs"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
                <Input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Friend Name *"
                  className="h-8 text-xs rounded-lg bg-background border-border/40 font-bold"
                  autoFocus
                />
                <div className="grid grid-cols-2 gap-1.5">
                  <Input
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    placeholder="Phone (optional)"
                    className="h-8 text-xs rounded-lg bg-background border-border/40"
                  />
                  <Input
                    value={newUpiId}
                    onChange={(e) => setNewUpiId(e.target.value)}
                    placeholder="UPI ID (optional)"
                    className="h-8 text-xs rounded-lg bg-background border-border/40"
                  />
                </div>
                <div className="flex justify-end gap-1.5 pt-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsAddingNew(false)}
                    className="h-7 text-xs px-2.5 rounded-lg"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleCreateFriend}
                    className="h-7 text-xs px-3 rounded-lg bg-primary text-white font-bold"
                  >
                    Save & Select
                  </Button>
                </div>
              </div>
            )}

            {/* Friend List */}
            {filteredContacts.length === 0 && !isAddingNew ? (
              <div className="py-6 text-center text-xs text-muted-foreground space-y-2">
                <p>No friends found matching "{searchQuery}"</p>
                {allowAddNew && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setNewName(searchQuery);
                      setIsAddingNew(true);
                    }}
                    className="h-8 text-xs font-bold border-primary/40 text-primary hover:bg-primary/10 rounded-xl"
                  >
                    <Plus className="h-3.5 w-3.5 mr-1" /> Add "{searchQuery}" as Friend
                  </Button>
                )}
              </div>
            ) : (
              filteredContacts.map((contact) => {
                const isSelected = selectedIds.includes(contact.id);
                return (
                  <button
                    key={contact.id}
                    type="button"
                    onClick={() => handleSelect(contact.id)}
                    className={cn(
                      "w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all text-left group",
                      isSelected
                        ? "bg-primary/20 text-primary font-bold"
                        : "hover:bg-muted/50 text-foreground"
                    )}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={cn(
                        "h-7 w-7 rounded-full flex items-center justify-center shrink-0 border border-border/40 overflow-hidden text-xs font-bold",
                        isSelected ? "bg-primary text-white border-primary" : "bg-muted text-muted-foreground"
                      )}>
                        {contact.avatar ? (
                          <img src={contact.avatar} alt={contact.name} className="h-full w-full object-cover" />
                        ) : (
                          contact.name.charAt(0).toUpperCase()
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-xs font-bold leading-none">{contact.name}</p>
                        {(contact.phone || contact.upiId) && (
                          <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-0.5 font-mono">
                            {contact.phone && (
                              <span className="flex items-center gap-0.5">
                                <Phone className="h-2.5 w-2.5" />
                                {contact.phone}
                              </span>
                            )}
                            {contact.upiId && (
                              <span className="flex items-center gap-0.5">
                                <QrCode className="h-2.5 w-2.5" />
                                {contact.upiId}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    {isSelected && (
                      <div className="h-5 w-5 rounded-full bg-primary text-white flex items-center justify-center shrink-0">
                        <Check className="h-3 w-3" strokeWidth={3} />
                      </div>
                    )}
                  </button>
                );
              })
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Background click overlay to dismiss dropdown */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-transparent"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}
