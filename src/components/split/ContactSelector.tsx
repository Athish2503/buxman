import { useState, useEffect } from 'react';
import { Contact } from '@/types/split';
import { contactService } from '@/lib/contact-service';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, User, Check, X, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface ContactSelectorProps {
  selectedIds: string[];
  onSelect: (ids: string[]) => void;
  className?: string;
}

export function ContactSelector({ selectedIds, onSelect, className }: ContactSelectorProps) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [newName, setNewName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    setContacts(contactService.getContacts());
  }, []);

  const handleAdd = () => {
    if (newName.trim()) {
      const newContact = contactService.addContact({ name: newName.trim() });
      setContacts(contactService.getContacts());
      setNewName('');
      setIsAdding(false);
      onSelect([...selectedIds, newContact.id]);
    }
  };

  const toggleSelect = (id: string) => {
    if (selectedIds.includes(id)) {
      onSelect(selectedIds.filter(i => i !== id));
    } else {
      onSelect([...selectedIds, id]);
    }
  };

  const filteredContacts = contacts.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className={cn("relative group", className)}>
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-2 pt-1 px-1 -mx-1 scroll-smooth">
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <AnimatePresence mode="wait">
            {isSearching ? (
              <motion.div
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
                className="flex items-center gap-1 bg-muted/30 rounded-full pr-1 pl-3 border border-border/40"
              >
                <input
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search..."
                  className="h-9 w-24 bg-transparent text-xs outline-none font-bold"
                  autoFocus
                />
                <button
                  type="button"
                  className="h-7 w-7 rounded-full flex items-center justify-center text-muted-foreground hover:bg-muted/50"
                  onClick={() => {
                    setIsSearching(false);
                    setSearchQuery('');
                  }}
                >
                  <X className="h-4 w-4" />
                </button>
              </motion.div>
            ) : !isAdding && (
              <motion.button
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                type="button"
                onClick={() => setIsSearching(true)}
                className="h-9 w-9 rounded-full border-2 border-border/10 flex items-center justify-center text-muted-foreground hover:border-primary/40 hover:text-primary transition-all active:scale-90"
              >
                <Search className="h-4 w-4" />
              </motion.button>
            )}
          </AnimatePresence>

          <AnimatePresence mode="wait">
            {!isAdding ? (
              !isSearching && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  type="button"
                  onClick={() => setIsAdding(true)}
                  className="h-9 w-9 rounded-full border-2 border-dashed border-border/40 flex items-center justify-center text-muted-foreground hover:border-primary/40 hover:text-primary transition-all active:scale-90"
                >
                  <Plus className="h-4 w-4" />
                </motion.button>
              )
            ) : (
            <motion.div
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: 'auto' }}
              exit={{ opacity: 0, width: 0 }}
              className="flex items-center gap-1 flex-shrink-0 bg-muted/30 rounded-full pr-1 pl-3 border border-border/40"
            >
              <input
                value={newName}
                onChange={e => setNewName(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAdd();
                  } else if (e.key === 'Escape') {
                    setIsAdding(false);
                  }
                }}
                placeholder="Name"
                className="h-9 w-24 bg-transparent text-xs outline-none font-bold"
                autoFocus
              />
              <button
                type="button"
                className="h-7 w-7 rounded-full bg-primary/20 text-primary flex items-center justify-center hover:bg-primary/30"
                onClick={handleAdd}
              >
                <Check className="h-4 w-4" />
              </button>
              <button
                type="button"
                className="h-7 w-7 rounded-full flex items-center justify-center text-muted-foreground hover:bg-muted/50"
                onClick={() => setIsAdding(false)}
              >
                <X className="h-4 w-4" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
        </div>

        <div className="w-[1px] h-6 bg-border/40 flex-shrink-0 mx-1" />

        {filteredContacts.map(contact => {
          const isSelected = selectedIds.includes(contact.id);
          return (
            <motion.button
              key={contact.id}
              layout
              type="button"
              onClick={() => toggleSelect(contact.id)}
              className={cn(
                "flex-shrink-0 relative group/btn flex items-center gap-2 pl-1 pr-3 py-1 rounded-full border transition-all duration-300 active:scale-95",
                isSelected
                  ? "bg-primary/10 border-primary/40 text-primary"
                  : "bg-muted/20 border-transparent text-muted-foreground hover:bg-muted/40"
              )}
            >
              <div className={cn(
                "h-7 w-7 rounded-full flex items-center justify-center overflow-hidden border-2 transition-colors",
                isSelected ? "border-primary/40" : "border-background"
              )}>
                {contact.avatar ? (
                  <img src={contact.avatar} alt={contact.name} className="h-full w-full object-cover" />
                ) : (
                  <div className={cn(
                    "h-full w-full flex items-center justify-center",
                    isSelected ? "bg-primary/20" : "bg-muted/50"
                  )}>
                    <User className="h-3.5 w-3.5" />
                  </div>
                )}
              </div>
              <span className="text-[11px] font-bold whitespace-nowrap">{contact.name}</span>
              {isSelected && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-primary text-white flex items-center justify-center border-2 border-background"
                >
                  <Check className="h-2 w-2" strokeWidth={4} />
                </motion.div>
              )}
            </motion.button>
          );
        })}
      </div>
      
      {/* Subtle fade indicators for scroll */}
      <div className="absolute right-0 top-0 bottom-2 w-12 bg-gradient-to-l from-background to-transparent pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity" />
    </div>
  );
}
