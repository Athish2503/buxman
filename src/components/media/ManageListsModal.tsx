import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';
import { 
  X, Plus, Bookmark, FolderHeart, Check, Trash2, Edit2, 
  Sparkles, Layers, ListPlus, Film, Tv
} from 'lucide-react';
import { useIsMobile } from '@/hooks/useIsMobile';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { mediaService } from '@/lib/media-service';
import { MediaRecommendation, CustomMediaList } from '@/types/media';
import { haptics } from '@/lib/haptics';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const COLOR_PRESETS = [
  { key: 'purple', label: 'Purple', bg: 'bg-purple-500/20 text-purple-400 border-purple-500/40' },
  { key: 'cyan', label: 'Cyan', bg: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40' },
  { key: 'amber', label: 'Amber', bg: 'bg-amber-500/20 text-amber-400 border-amber-500/40' },
  { key: 'emerald', label: 'Emerald', bg: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40' },
  { key: 'rose', label: 'Rose', bg: 'bg-rose-500/20 text-rose-400 border-rose-500/40' },
  { key: 'indigo', label: 'Indigo', bg: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/40' },
];

const EMOJI_PRESETS = ['🍿', '🚀', '🔥', '⭐', '🎬', '💎', '🌙', '🎉', '🧠', '❤️'];

export interface ManageListsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetItem?: MediaRecommendation | null; // If provided, manage list assignment for this item
  initialCreate?: boolean;
  onSelectList?: (list: CustomMediaList) => void;
  onListsChanged?: () => void;
}

export function ManageListsModal({
  open,
  onOpenChange,
  targetItem,
  initialCreate = false,
  onSelectList,
  onListsChanged,
}: ManageListsModalProps) {
  const isMobile = useIsMobile();
  const [lists, setLists] = useState<CustomMediaList[]>(() => mediaService.getCustomLists());
  const [isCreating, setIsCreating] = useState(initialCreate);
  const [newListName, setNewListName] = useState('');
  const [newListDesc, setNewListDesc] = useState('');
  const [selectedColor, setSelectedColor] = useState('purple');
  const [selectedEmoji, setSelectedEmoji] = useState('🍿');

  const refreshLists = () => {
    setLists(mediaService.getCustomLists());
    onListsChanged?.();
  };

  useEffect(() => {
    if (open) {
      refreshLists();
      setIsCreating(initialCreate);
    }
  }, [open, initialCreate]);

  if (!open) return null;

  const handleCreateList = () => {
    if (!newListName.trim()) {
      toast.error('List name is required');
      return;
    }

    haptics.success();
    const created = mediaService.createCustomList({
      name: newListName.trim(),
      description: newListDesc.trim() || undefined,
      color: selectedColor,
      emoji: selectedEmoji,
      itemIds: targetItem ? [targetItem.id] : [],
    });

    toast.success(`Created list "${created.name}"`);
    setNewListName('');
    setNewListDesc('');
    setIsCreating(false);
    refreshLists();
  };

  const handleToggleItemInList = (list: CustomMediaList) => {
    if (!targetItem) return;
    haptics.medium();
    const isAdded = mediaService.toggleItemInList(list.id, targetItem.id);
    if (isAdded) {
      toast.success(`Added "${targetItem.title}" to ${list.name}`);
    } else {
      toast.info(`Removed from ${list.name}`);
    }
    refreshLists();
  };

  const handleDeleteList = (list: CustomMediaList) => {
    haptics.medium();
    mediaService.deleteCustomList(list.id);
    toast.success(`List "${list.name}" deleted`);
    refreshLists();
  };

  const modalBody = (
    <div className="flex flex-col max-h-[85vh] sm:max-h-[90vh] overflow-hidden p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-border/20">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-2xl bg-primary/20 text-primary flex items-center justify-center border border-primary/30 shrink-0">
            <FolderHeart className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-display font-black text-base text-foreground leading-tight">
              {targetItem ? 'Add to Curated List' : 'My Curated Lists'}
            </h3>
            <p className="text-[11px] font-semibold text-muted-foreground">
              {targetItem ? `Manage collections for "${targetItem.title}"` : 'Organize your movies & series into custom lists'}
            </p>
          </div>
        </div>

        <button
          onClick={() => onOpenChange(false)}
          className="h-8 w-8 rounded-full bg-muted/30 hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-1 scrollbar-thin">
        {/* Create List Toggle or Form */}
        {!isCreating ? (
          <Button
            type="button"
            variant="outline"
            onClick={() => { haptics.light(); setIsCreating(true); }}
            className="w-full h-11 rounded-2xl border-dashed border-primary/40 bg-primary/5 hover:bg-primary/10 text-primary font-bold text-xs flex items-center justify-center gap-2"
          >
            <Plus className="h-4 w-4" />
            <span>Create New Curated List</span>
          </Button>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 rounded-2xl bg-muted/20 border border-primary/30 space-y-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-primary flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5" /> Create Custom List
              </span>
              <button
                type="button"
                onClick={() => setIsCreating(false)}
                className="text-muted-foreground hover:text-foreground text-xs"
              >
                Cancel
              </button>
            </div>

            <div className="space-y-1">
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">List Name</Label>
              <Input
                value={newListName}
                onChange={e => setNewListName(e.target.value)}
                placeholder="e.g. Weekend Binge, Sci-Fi Classics..."
                className="h-9 text-xs rounded-xl bg-background/50 border-border/40 font-bold"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Description (Optional)</Label>
              <Input
                value={newListDesc}
                onChange={e => setNewListDesc(e.target.value)}
                placeholder="e.g. My favorite sci-fi thrillers to watch"
                className="h-9 text-xs rounded-xl bg-background/50 border-border/40 font-bold"
              />
            </div>

            {/* Emoji & Color selector */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground block mb-1">Emoji Icon</Label>
                <div className="flex flex-wrap gap-1">
                  {EMOJI_PRESETS.map(e => (
                    <button
                      key={e}
                      type="button"
                      onClick={() => setSelectedEmoji(e)}
                      className={cn(
                        "h-7 w-7 rounded-lg text-sm flex items-center justify-center transition-all border",
                        selectedEmoji === e ? "bg-primary/20 border-primary" : "bg-muted/30 border-transparent hover:bg-muted/60"
                      )}
                    >
                      {e}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground block mb-1">Theme Color</Label>
                <div className="flex flex-wrap gap-1.5">
                  {COLOR_PRESETS.map(c => (
                    <button
                      key={c.key}
                      type="button"
                      onClick={() => setSelectedColor(c.key)}
                      className={cn(
                        "h-6 w-6 rounded-full border transition-all flex items-center justify-center",
                        c.bg,
                        selectedColor === c.key ? "ring-2 ring-primary scale-110" : "opacity-70 hover:opacity-100"
                      )}
                    />
                  ))}
                </div>
              </div>
            </div>

            <Button
              type="button"
              onClick={handleCreateList}
              className="w-full h-9 rounded-xl bg-primary text-white font-bold text-xs mt-2"
            >
              Save List
            </Button>
          </motion.div>
        )}

        {/* Existing Lists List */}
        <div className="space-y-2 pt-2">
          {lists.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              <Layers className="h-8 w-8 mx-auto opacity-30 mb-2" />
              <p className="text-xs font-bold opacity-70">No custom lists created yet</p>
              <p className="text-[11px] opacity-50 mt-0.5">Create your first collection above to organize your watchlist!</p>
            </div>
          ) : (
            lists.map(list => {
              const inList = targetItem ? list.itemIds.includes(targetItem.id) : false;
              const colorInfo = COLOR_PRESETS.find(c => c.key === list.color) || COLOR_PRESETS[0];

              // Poster stack previews
              const allMedia = mediaService.getMedia();
              const listMediaItems = allMedia.filter(m => list.itemIds.includes(m.id));
              const posters = listMediaItems.map(m => m.posterUrl).filter(Boolean).slice(0, 3);

              return (
                <div
                  key={list.id}
                  onClick={() => {
                    if (targetItem) {
                      handleToggleItemInList(list);
                    } else if (onSelectList) {
                      haptics.selection();
                      onSelectList(list);
                      onOpenChange(false);
                    }
                  }}
                  className={cn(
                    "glass rounded-2xl p-3 border transition-all flex items-center justify-between gap-3 group relative overflow-hidden cursor-pointer hover:border-primary/40 active:scale-[0.99]",
                    inList ? `${colorInfo.bg} shadow-sm` : "border-border/20 hover:bg-card/75"
                  )}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    {/* Checkbox or Poster Stack or Emoji Icon */}
                    {targetItem ? (
                      <div className={cn(
                        "h-6 w-6 rounded-lg flex items-center justify-center border transition-all shrink-0",
                        inList ? "bg-primary border-primary text-white" : "border-border/40 bg-muted/20"
                      )}>
                        {inList && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                      </div>
                    ) : posters.length > 0 ? (
                      <div className="flex items-center -space-x-2.5 shrink-0">
                        {posters.map((url, idx) => (
                          <img
                            key={idx}
                            src={url}
                            alt=""
                            className="h-9 w-6 rounded object-cover border border-background shadow-sm"
                            onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                          />
                        ))}
                      </div>
                    ) : (
                      <div className={cn("h-8 w-8 rounded-xl flex items-center justify-center text-base border shrink-0", colorInfo.bg)}>
                        {list.emoji || '🍿'}
                      </div>
                    )}

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-base leading-none">{list.emoji || '🍿'}</span>
                        <h4 className="font-bold text-xs text-foreground truncate">{list.name}</h4>
                        <span className="text-[9px] font-black uppercase px-1.5 py-0.2 rounded-full bg-muted/40 text-muted-foreground border border-border/10 shrink-0">
                          {list.itemIds.length} {list.itemIds.length === 1 ? 'item' : 'items'}
                        </span>
                      </div>
                      {list.description && (
                        <p className="text-[10px] text-muted-foreground truncate mt-0.5">{list.description}</p>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    {!targetItem && onSelectList && (
                      <span className="text-[10px] font-bold text-primary group-hover:underline pr-1">
                        View List →
                      </span>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => { e.stopPropagation(); handleDeleteList(list); }}
                      className="h-7 w-7 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Delete List"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );

  if (isMobile) {
    return createPortal(
      <AnimatePresence>
        <div className="fixed inset-0 z-[9999] flex items-end justify-center">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => onOpenChange(false)}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm"
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative w-full max-w-lg glass-dark border-t border-border/40 rounded-t-[2.5rem] shadow-2xl overflow-hidden z-10"
            style={{ background: 'hsl(var(--background))' }}
          >
            <div className="w-12 h-1 bg-muted-foreground/30 rounded-full mx-auto mt-3 mb-1" />
            {modalBody}
          </motion.div>
        </div>
      </AnimatePresence>,
      document.body
    );
  }

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => onOpenChange(false)}
          className="fixed inset-0 bg-black/70 backdrop-blur-sm"
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="relative w-full max-w-md glass rounded-[2.5rem] border border-border/40 shadow-2xl overflow-hidden z-10"
          style={{ background: 'hsl(var(--background))' }}
        >
          {modalBody}
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
}
