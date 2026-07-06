import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';
import { X, Plus, Film, Tv, Check, Star, User, Clapperboard } from 'lucide-react';
import { useIsMobile } from '@/hooks/useIsMobile';
import { SwipeToAdd } from '@/components/ui/swipe-to-add';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { mediaService } from '@/lib/media-service';
import { contactService } from '@/lib/contact-service';
import { MediaRecommendation } from '@/types/media';
import { haptics } from '@/lib/haptics';
import { audio } from '@/lib/audio';
import { cn, rewardBurst } from '@/lib/utils';
import { toast } from 'sonner';

const PRESET_GENRES = [
  'Action', 'Comedy', 'Drama', 'Sci-Fi', 'Fantasy', 
  'Horror', 'Thriller', 'Romance', 'Mystery', 
  'Animation', 'Documentary', 'Anime'
];

export interface MediaEntryFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (item: Omit<MediaRecommendation, 'id' | 'createdAt' | 'updatedAt'>) => void;
  initialData?: MediaRecommendation;
  isEdit?: boolean;
}

function FormBody({
  onSubmit,
  initialData,
  isEdit = false,
  onDone,
}: Omit<MediaEntryFormProps, 'open' | 'onOpenChange'> & { onDone?: () => void }) {
  const [title, setTitle] = useState(initialData?.title || '');
  const [type, setType] = useState<'movie' | 'series'>(initialData?.type || 'movie');
  const [selectedFriendId, setSelectedFriendId] = useState(initialData?.recommendedBy || '');
  const [genres, setGenres] = useState<string[]>(initialData?.genres || []);
  const [customGenre, setCustomGenre] = useState('');
  const [status, setStatus] = useState<'to_watch' | 'watching' | 'watched'>(initialData?.status || 'to_watch');
  const [rating, setRating] = useState<number>(initialData?.rating || 5);
  const [notes, setNotes] = useState(initialData?.notes || '');

  // Friend input inline state
  const [isAddingFriend, setIsAddingFriend] = useState(false);
  const [newFriendName, setNewFriendName] = useState('');
  const [contacts, setContacts] = useState(() => contactService.getContacts());

  const [isProcessing, setIsProcessing] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleAddFriend = () => {
    if (newFriendName.trim()) {
      const newContact = contactService.addContact({ name: newFriendName.trim() });
      setContacts(contactService.getContacts());
      setSelectedFriendId(newContact.id);
      setNewFriendName('');
      setIsAddingFriend(false);
      haptics.success();
      toast.success(`Friend "${newContact.name}" added`);
    }
  };

  const handleToggleGenre = (genre: string) => {
    haptics.light();
    if (genres.includes(genre)) {
      setGenres(prev => prev.filter(g => g !== genre));
    } else {
      setGenres(prev => [...prev, genre]);
    }
  };

  const handleAddCustomGenre = () => {
    const trimmed = customGenre.trim();
    if (trimmed && !genres.includes(trimmed)) {
      setGenres(prev => [...prev, trimmed]);
      setCustomGenre('');
      haptics.medium();
    }
  };

  const handleFormSubmit = async () => {
    if (isProcessing) return;
    if (!title.trim()) {
      toast.error('Title is required');
      return;
    }

    setIsProcessing(true);

    try {
      const payload: Omit<MediaRecommendation, 'id' | 'createdAt' | 'updatedAt'> = {
        title: title.trim(),
        type,
        genres,
        recommendedBy: selectedFriendId || undefined,
        status,
        rating: status === 'watched' ? rating : undefined,
        notes: notes.trim() || undefined,
      };

      setSuccess(true);
      haptics.success();
      audio.success();
      toast.success(isEdit ? 'Recommendation updated' : 'Recommendation added to Watchlist');

      await new Promise(r => setTimeout(r, 850));

      if (!isEdit) {
        rewardBurst();
        // Reset states
        setTitle('');
        setType('movie');
        setSelectedFriendId('');
        setGenres([]);
        setNotes('');
        setStatus('to_watch');
      }

      onSubmit(payload);
      setSuccess(false);
      onDone?.();
    } catch (error) {
      console.error(error);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex flex-col gap-5 py-1">
      {/* Title */}
      <div className="space-y-1.5">
        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Title</Label>
        <Input
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="e.g. Interstellar, Severance"
          className="h-9 text-xs rounded-xl bg-background/50 border-border/40 font-bold text-foreground"
        />
      </div>

      {/* Type Toggle */}
      <div className="space-y-1.5">
        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Media Type</Label>
        <div className="grid grid-cols-2 gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => { haptics.light(); setType('movie'); }}
            className={cn(
              "h-10 rounded-xl text-xs font-bold transition-all border border-transparent flex items-center justify-center gap-1.5",
              type === 'movie' 
                ? "bg-purple-500 hover:bg-purple-600 text-white font-black" 
                : "bg-muted/40 hover:bg-muted/60 text-muted-foreground"
            )}
          >
            <Film className="h-4 w-4" />
            Movie
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => { haptics.light(); setType('series'); }}
            className={cn(
              "h-10 rounded-xl text-xs font-bold transition-all border border-transparent flex items-center justify-center gap-1.5",
              type === 'series' 
                ? "bg-cyan-500 hover:bg-cyan-600 text-white font-black" 
                : "bg-muted/40 hover:bg-muted/60 text-muted-foreground"
            )}
          >
            <Tv className="h-4 w-4" />
            Series
          </Button>
        </div>
      </div>

      {/* Recommended By Friend Selector */}
      <div className="space-y-1.5">
        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground block">
          Recommended By Friend
        </Label>
        <div className="relative group">
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-2 pt-1 px-1 -mx-1 scroll-smooth">
            {/* Inline add friend button */}
            <AnimatePresence mode="wait">
              {!isAddingFriend ? (
                <button
                  type="button"
                  onClick={() => setIsAddingFriend(true)}
                  className="h-9 w-9 shrink-0 rounded-full border border-dashed border-border/40 flex items-center justify-center text-muted-foreground hover:border-primary/40 hover:text-primary transition-all active:scale-90"
                >
                  <Plus className="h-4 w-4" />
                </button>
              ) : (
                <motion.div
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: 'auto' }}
                  exit={{ opacity: 0, width: 0 }}
                  className="flex items-center gap-1 shrink-0 bg-muted/30 rounded-full pr-1 pl-3 border border-border/40"
                >
                  <input
                    value={newFriendName}
                    onChange={e => setNewFriendName(e.target.value)}
                    placeholder="Name"
                    className="h-9 w-20 bg-transparent text-xs outline-none font-bold text-foreground"
                    autoFocus
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddFriend();
                      } else if (e.key === 'Escape') {
                        setIsAddingFriend(false);
                      }
                    }}
                  />
                  <button
                    type="button"
                    className="h-7 w-7 rounded-full bg-primary/20 text-primary flex items-center justify-center hover:bg-primary/30"
                    onClick={handleAddFriend}
                  >
                    <Check className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    className="h-7 w-7 rounded-full flex items-center justify-center text-muted-foreground hover:bg-muted/50"
                    onClick={() => setIsAddingFriend(false)}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Self / No one chip */}
            <button
              type="button"
              onClick={() => {
                haptics.light();
                setSelectedFriendId('');
              }}
              className={cn(
                "flex-shrink-0 relative flex items-center gap-2 pl-1.5 pr-3 py-1 rounded-full border transition-all duration-300 active:scale-95",
                selectedFriendId === ''
                  ? "bg-primary/10 border-primary/40 text-primary"
                  : "bg-muted/20 border-transparent text-muted-foreground hover:bg-muted/30"
              )}
            >
              <div className={cn(
                "h-6 w-6 rounded-full flex items-center justify-center overflow-hidden border transition-colors",
                selectedFriendId === '' ? "border-primary/40 bg-primary/20 text-primary" : "border-background bg-muted/50 text-muted-foreground"
              )}>
                <User className="h-3 w-3" />
              </div>
              <span className="text-[11px] font-bold whitespace-nowrap">Self / No one</span>
            </button>

            {contacts.length > 0 && <div className="w-[1px] h-6 bg-border/40 flex-shrink-0 mx-1" />}

            {/* List of friends */}
            {contacts.map(c => {
              const isSelected = selectedFriendId === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    haptics.light();
                    setSelectedFriendId(isSelected ? '' : c.id);
                  }}
                  className={cn(
                    "flex-shrink-0 relative flex items-center gap-2 pl-1.5 pr-3 py-1 rounded-full border transition-all duration-300 active:scale-95",
                    isSelected
                      ? "bg-primary/10 border-primary/40 text-primary"
                      : "bg-muted/20 border-transparent text-muted-foreground hover:bg-muted/30"
                  )}
                >
                  <div className={cn(
                    "h-6 w-6 rounded-full flex items-center justify-center overflow-hidden border transition-colors",
                    isSelected ? "border-primary/40" : "border-background"
                  )}>
                    {c.avatar ? (
                      <img src={c.avatar} alt={c.name} className="h-full w-full object-cover" />
                    ) : (
                      <div className={cn(
                        "h-full w-full flex items-center justify-center",
                        isSelected ? "bg-primary/20 text-primary" : "bg-muted/50"
                      )}>
                        <User className="h-3 w-3" />
                      </div>
                    )}
                  </div>
                  <span className="text-[11px] font-bold whitespace-nowrap">{c.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Genres preset tags */}
      <div className="space-y-1.5">
        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground block">Genres</Label>
        <div className="flex flex-wrap gap-1">
          {PRESET_GENRES.map(genre => {
            const isSelected = genres.includes(genre);
            return (
              <button
                key={genre}
                type="button"
                onClick={() => handleToggleGenre(genre)}
                className={cn(
                  "px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all",
                  isSelected
                    ? "bg-primary text-white border-transparent"
                    : "bg-muted/20 border-border/10 text-muted-foreground hover:bg-muted/40"
                )}
              >
                {genre}
              </button>
            );
          })}
        </div>

        {/* Custom genre Tag input */}
        <div className="flex gap-2 mt-2">
          <Input
            value={customGenre}
            onChange={e => setCustomGenre(e.target.value)}
            placeholder="Add custom genre..."
            className="h-8 text-[11px] rounded-lg bg-background/50 border-border/40 flex-1"
            onKeyDown={e => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAddCustomGenre();
              }
            }}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAddCustomGenre}
            className="h-8 rounded-lg text-xs font-bold border-border/40 px-3 shrink-0"
          >
            Add
          </Button>
        </div>
      </div>

      {/* Status Selector */}
      <div className="space-y-1.5">
        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Status</Label>
        <div className="grid grid-cols-3 gap-2">
          {[
            { value: 'to_watch', label: 'To Watch', activeClass: 'bg-slate-500/20 border-slate-500/50 text-slate-300' },
            { value: 'watching', label: 'Watching', activeClass: 'bg-primary/20 border-primary/50 text-primary' },
            { value: 'watched', label: 'Watched', activeClass: 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400' },
          ].map(opt => {
            const isSelected = status === opt.value;
            return (
              <Button
                key={opt.value}
                type="button"
                variant="outline"
                onClick={() => { haptics.light(); setStatus(opt.value as any); }}
                className={cn(
                  "h-10 rounded-xl text-[11px] font-bold transition-all border flex items-center justify-center gap-1",
                  isSelected 
                    ? opt.activeClass + " font-black" 
                    : "bg-muted/30 border-transparent text-muted-foreground hover:bg-muted/50"
                )}
              >
                {opt.label}
              </Button>
            );
          })}
        </div>
      </div>

      {/* Rating (only if Watched) */}
      {status === 'watched' && (
        <div className="space-y-1.5 animate-in slide-in-from-top-1 duration-200">
          <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Rating</Label>
          <div className="flex gap-1.5">
            {[1, 2, 3, 4, 5].map(stars => (
              <button
                key={stars}
                type="button"
                onClick={() => { haptics.light(); setRating(stars); }}
                className="p-1 hover:scale-110 transition-transform"
              >
                <Star
                  className={cn(
                    "h-6 w-6 transition-colors",
                    stars <= rating 
                      ? "text-amber-400 fill-amber-400" 
                      : "text-muted-foreground/30"
                  )}
                />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Notes / Review */}
      <div className="space-y-1.5">
        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Notes / Review</Label>
        <Textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="Add reviews or details..."
          className="bg-background/50 border-border/40 focus:border-primary/50 text-xs min-h-[80px] rounded-xl resize-none font-bold"
        />
      </div>

      {/* Swipe to save */}
      <div className="pt-2">
        <SwipeToAdd
          onConfirm={handleFormSubmit}
          isSubmitting={isProcessing}
          success={success}
          label={isEdit ? 'Swipe to Update Watchlist' : 'Swipe to Save Watchlist'}
        />
      </div>
    </div>
  );
}

export function MediaEntryForm({
  open,
  onOpenChange,
  onSubmit,
  initialData,
  isEdit = false,
}: MediaEntryFormProps) {
  const isMobile = useIsMobile();

  // Lock body scroll while open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  const formContent = (
    <FormBody 
      onSubmit={onSubmit} 
      initialData={initialData} 
      isEdit={isEdit}
      onDone={() => onOpenChange(false)}
    />
  );



  const overlay = (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          {/* Shared backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm pointer-events-auto"
            onClick={() => onOpenChange(false)}
          />

          {isMobile ? (
            /* ── Mobile: bottom sheet ── */
            <motion.div
              drag="y"
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={{ top: 0, bottom: 0.8 }}
              onDragEnd={(_, info) => {
                if (info.offset.y > 100) {
                  onOpenChange(false);
                }
              }}
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="relative w-full z-[9999] rounded-t-3xl border-t border-border/40 overflow-hidden pointer-events-auto"
              style={{ background: 'hsl(var(--background))', maxHeight: '92dvh', display: 'flex', flexDirection: 'column' }}
            >
              {/* Drag handle */}
              <div className="flex justify-center pt-3 pb-1 shrink-0">
                <div className="h-1 w-10 rounded-full bg-muted-foreground/30" />
              </div>
              {/* Header */}
              <div className="relative flex items-center justify-center px-5 py-3 shrink-0">
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 rounded-xl bg-gradient-primary flex items-center justify-center shadow-glow">
                    <Clapperboard className="h-3.5 w-3.5 text-white" />
                  </div>
                  <h2 className="text-sm font-bold leading-none">{isEdit ? 'Edit Watchlist' : 'New Watchlist'}</h2>
                </div>
                <button
                  onClick={() => onOpenChange(false)}
                  className="absolute right-5 h-8 w-8 rounded-xl bg-muted/50 flex items-center justify-center text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              {/* Scrollable body */}
              <div className="overflow-y-auto flex-1 px-5 pb-10" style={{ overscrollBehavior: 'contain' }}>
                {formContent}
              </div>
            </motion.div>
          ) : (
            /* ── Desktop: centred modal ── */
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-xl z-[9999] rounded-2xl border border-border/50 shadow-2xl overflow-hidden pointer-events-auto"
              style={{ background: 'hsl(var(--background))', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-border/30 shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-xl bg-gradient-primary flex items-center justify-center shadow-glow">
                    <Clapperboard className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold leading-none">{isEdit ? 'Edit Watchlist' : 'New Watchlist'}</h2>
                    <p className="text-[11px] text-muted-foreground mt-0.5">Fill in the details below</p>
                  </div>
                </div>
                <button
                  onClick={() => onOpenChange(false)}
                  className="h-8 w-8 rounded-xl bg-muted/50 flex items-center justify-center text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="overflow-y-auto flex-1 px-6 py-5">
                {formContent}
              </div>
            </motion.div>
          )}
        </div>
      )}
    </AnimatePresence>
  );

  return createPortal(overlay, document.body);
}
