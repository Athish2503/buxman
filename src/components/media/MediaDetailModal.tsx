import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';
import { 
  X, Star, Film, Tv, Clock, User, Pin, PinOff, Edit2, Trash2, 
  Play, Check, Award, ShieldAlert, Sparkles, Share2, FolderHeart
} from 'lucide-react';
import { useIsMobile } from '@/hooks/useIsMobile';
import { Button } from '@/components/ui/button';
import { MediaRecommendation } from '@/types/media';
import { PLATFORM_CONFIG } from './platformConfig';
import { cn } from '@/lib/utils';
import { haptics } from '@/lib/haptics';

export interface MediaDetailModalProps {
  item: MediaRecommendation | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: (item: MediaRecommendation) => void;
  onDelete: (item: MediaRecommendation) => void;
  onTogglePin: (item: MediaRecommendation) => void;
  onStartWatching: (item: MediaRecommendation) => void;
  onRate: (item: MediaRecommendation) => void;
  onManageLists?: (item: MediaRecommendation) => void;
  contactName?: string;
}

export function MediaDetailModal({
  item,
  open,
  onOpenChange,
  onEdit,
  onDelete,
  onTogglePin,
  onStartWatching,
  onRate,
  onManageLists,
  contactName = 'Self',
}: MediaDetailModalProps) {
  const isMobile = useIsMobile();

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  if (!item) return null;

  const platformInfo = item.platform ? PLATFORM_CONFIG[item.platform] : null;
  const isMovie = item.type === 'movie';

  const modalBody = (
    <div className="flex flex-col max-h-[85vh] sm:max-h-[90vh] overflow-hidden">
      {/* ── Poster / Hero Section ──────────────────────────────────────── */}
      <div className="relative w-full h-56 sm:h-72 overflow-hidden bg-black shrink-0">
        {item.posterUrl ? (
          <>
            <img
              src={item.posterUrl}
              alt={item.title}
              referrerPolicy="no-referrer"
              className="absolute inset-0 w-full h-full object-cover blur-md scale-110 opacity-40"
              onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
            <div className="relative z-10 h-full flex items-end p-4 sm:p-6 gap-4">
              <img
                src={item.posterUrl}
                alt={item.title}
                referrerPolicy="no-referrer"
                className="h-36 sm:h-48 w-24 sm:w-32 rounded-xl object-cover shadow-2xl border-2 border-white/10 shrink-0"
                onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
              />
              <div className="flex-1 min-w-0 pb-1">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className={cn(
                    "text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md border",
                    isMovie ? "bg-purple-500/20 text-purple-300 border-purple-500/30" : "bg-cyan-500/20 text-cyan-300 border-cyan-500/30"
                  )}>
                    {isMovie ? <Film className="h-2.5 w-2.5 inline mr-1" /> : <Tv className="h-2.5 w-2.5 inline mr-1" />}
                    {item.type}
                  </span>
                  {item.releaseYear && (
                    <span className="text-[10px] font-bold text-muted-foreground bg-muted/40 px-2 py-0.5 rounded-md border border-border/20">
                      {item.releaseYear}
                    </span>
                  )}
                  {item.rated && (
                    <span className="text-[10px] font-bold text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded-md border border-amber-400/20">
                      {item.rated}
                    </span>
                  )}
                </div>

                <h2 className="text-lg sm:text-2xl font-black text-white leading-tight line-clamp-2">
                  {item.title}
                </h2>

                {/* IMDb Rating & Runtime */}
                <div className="flex items-center gap-3 mt-2 text-xs font-bold text-muted-foreground flex-wrap">
                  {item.imdbRating && (
                    <div className="flex items-center gap-1 text-amber-400 bg-amber-400/10 border border-amber-400/20 px-2 py-0.5 rounded-lg">
                      <Star className="h-3.5 w-3.5 fill-amber-400" />
                      <span className="font-black text-amber-300">{item.imdbRating}</span>
                      <span className="text-[9px] text-amber-400/60 font-normal">/10 IMDb</span>
                    </div>
                  )}
                  {item.runtime && (
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span>{item.runtime}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-900/40 via-background to-cyan-900/40 p-6">
            <div className="text-center">
              <div className="h-16 w-16 rounded-2xl bg-primary/20 border border-primary/30 flex items-center justify-center mx-auto mb-3 text-primary">
                {isMovie ? <Film className="h-8 w-8" /> : <Tv className="h-8 w-8" />}
              </div>
              <h2 className="text-xl font-black text-foreground">{item.title}</h2>
              {item.releaseYear && <p className="text-xs text-muted-foreground mt-1">{item.releaseYear}</p>}
            </div>
          </div>
        )}

        {/* Close Button */}
        <button
          onClick={() => { haptics.light(); onOpenChange(false); }}
          className="absolute top-4 right-4 z-20 h-8 w-8 rounded-full bg-black/60 backdrop-blur-md border border-white/10 flex items-center justify-center text-white/80 hover:text-white transition-all hover:scale-105"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* ── Scrollable Details Content ─────────────────────────────────── */}
      <div className="overflow-y-auto flex-1 p-5 sm:p-6 space-y-5" style={{ overscrollBehavior: 'contain' }}>
        
        {/* Status & Quick Action Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-2xl bg-muted/20 border border-border/30">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Status:</span>
            <span className={cn(
              "px-2.5 py-1 rounded-xl text-xs font-black uppercase tracking-wider border",
              item.status === 'to_watch' && "bg-slate-500/10 text-slate-300 border-slate-500/30",
              item.status === 'watching' && "bg-primary/20 text-primary border-primary/30 animate-pulse",
              item.status === 'watched' && "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
            )}>
              {item.status === 'to_watch' ? 'To Watch' : item.status === 'watching' ? 'Watching Now 🍿' : 'Watched'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {item.status === 'to_watch' && (
              <Button
                size="sm"
                onClick={() => { onStartWatching(item); onOpenChange(false); }}
                className="h-8 text-xs font-bold gap-1.5 rounded-xl bg-primary text-white hover:bg-primary/90"
              >
                <Play className="h-3.5 w-3.5 fill-white" />
                <span>Start Watching</span>
              </Button>
            )}
            {item.status === 'watching' && (
              <Button
                size="sm"
                onClick={() => { onRate(item); onOpenChange(false); }}
                className="h-8 text-xs font-bold gap-1.5 rounded-xl bg-emerald-500 text-white hover:bg-emerald-600"
              >
                <Check className="h-3.5 w-3.5" strokeWidth={3} />
                <span>Mark Watched</span>
              </Button>
            )}
          </div>
        </div>

        {/* Plot Synopsis (OMDb) */}
        {item.plot && (
          <div className="space-y-1.5">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
              <Sparkles className="h-3 w-3 text-amber-400" />
              Synopsis
            </h3>
            <p className="text-xs sm:text-sm text-foreground/90 leading-relaxed bg-background/50 p-3.5 rounded-2xl border border-border/30">
              {item.plot}
            </p>
          </div>
        )}

        {/* Director & Cast (OMDb) */}
        {(item.director || item.actors) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {item.director && (
              <div className="bg-background/40 p-3 rounded-2xl border border-border/20">
                <span className="text-[9px] font-black uppercase tracking-wider text-muted-foreground block">Director</span>
                <p className="text-xs font-bold text-foreground mt-0.5">{item.director}</p>
              </div>
            )}
            {item.actors && (
              <div className="bg-background/40 p-3 rounded-2xl border border-border/20">
                <span className="text-[9px] font-black uppercase tracking-wider text-muted-foreground block">Cast</span>
                <p className="text-xs font-bold text-foreground mt-0.5">{item.actors}</p>
              </div>
            )}
          </div>
        )}

        {/* Awards (OMDb) */}
        {item.awards && (
          <div className="flex items-center gap-2 p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-bold">
            <Award className="h-4 w-4 shrink-0 text-amber-400" />
            <span>{item.awards}</span>
          </div>
        )}

        {/* Platform & Friend Details */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-background/40 p-3 rounded-2xl border border-border/20">
            <span className="text-[9px] font-black uppercase tracking-wider text-muted-foreground block">Platform</span>
            {platformInfo ? (
              <div className="flex items-center gap-1.5 mt-1">
                <platformInfo.icon className="h-4 w-4 shrink-0" />
                <span className={cn("text-xs font-bold", platformInfo.textColor)}>{platformInfo.label}</span>
              </div>
            ) : (
              <span className="text-xs text-muted-foreground mt-0.5 block">Not specified</span>
            )}
          </div>

          <div className="bg-background/40 p-3 rounded-2xl border border-border/20">
            <span className="text-[9px] font-black uppercase tracking-wider text-muted-foreground block">Recommended By</span>
            <div className="flex items-center gap-1.5 mt-1">
              <User className="h-3.5 w-3.5 text-primary" />
              <span className="text-xs font-bold text-foreground truncate">{contactName}</span>
            </div>
          </div>
        </div>

        {/* Genres */}
        {item.genres.length > 0 && (
          <div className="space-y-1.5">
            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground block">Genres</span>
            <div className="flex flex-wrap gap-1.5">
              {item.genres.map(g => (
                <span key={g} className="px-2.5 py-1 rounded-xl text-[10px] font-bold bg-muted/40 text-foreground border border-border/20">
                  {g}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* User Rating & Notes */}
        {item.status === 'watched' && (
          <div className="space-y-3 p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/20">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Your Rating</span>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map(star => (
                  <Star
                    key={star}
                    className={cn(
                      "h-4 w-4",
                      star <= (item.rating || 0) ? "text-amber-400 fill-amber-400" : "text-muted-foreground/30"
                    )}
                  />
                ))}
              </div>
            </div>
            {item.notes && (
              <div>
                <span className="text-[9px] font-black uppercase tracking-wider text-muted-foreground block mb-1">Review Notes</span>
                <p className="text-xs text-foreground/90 italic bg-background/50 p-2.5 rounded-xl border border-border/20">
                  "{item.notes}"
                </p>
              </div>
            )}
          </div>
        )}

        {/* General Notes if not watched */}
        {item.status !== 'watched' && item.notes && (
          <div className="space-y-1">
            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground block">Notes</span>
            <p className="text-xs text-foreground/90 bg-background/50 p-3 rounded-2xl border border-border/20">
              {item.notes}
            </p>
          </div>
        )}

        {/* Footer Controls (Pin, Lists, Edit, Delete) */}
        <div className="pt-2 flex items-center justify-between border-t border-border/20">
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onTogglePin(item)}
              className="h-9 px-2.5 text-xs font-bold gap-1.5 rounded-xl text-muted-foreground hover:text-foreground"
            >
              {item.pinned ? <PinOff className="h-4 w-4 text-amber-400" /> : <Pin className="h-4 w-4" />}
              <span>{item.pinned ? 'Unpin' : 'Pin'}</span>
            </Button>

            {onManageLists && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onManageLists(item)}
                className="h-9 px-2.5 text-xs font-bold gap-1.5 rounded-xl text-muted-foreground hover:text-foreground"
              >
                <FolderHeart className="h-4 w-4 text-primary" />
                <span>Lists</span>
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => { onEdit(item); onOpenChange(false); }}
              className="h-9 px-3 text-xs font-bold gap-1.5 rounded-xl border-border/40"
            >
              <Edit2 className="h-3.5 w-3.5" />
              <span>Edit</span>
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => { onDelete(item); onOpenChange(false); }}
              className="h-9 px-3 text-xs font-bold gap-1.5 rounded-xl"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Delete</span>
            </Button>
          </div>
        </div>

      </div>
    </div>
  );

  const overlay = (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-md pointer-events-auto"
            onClick={() => onOpenChange(false)}
          />

          {isMobile ? (
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="relative w-full z-[9999] rounded-t-3xl border-t border-border/40 overflow-hidden pointer-events-auto"
              style={{ background: 'hsl(var(--background))' }}
            >
              <div className="flex justify-center pt-3 pb-1 shrink-0 bg-black/40">
                <div className="h-1 w-10 rounded-full bg-muted-foreground/30" />
              </div>
              {modalBody}
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-xl z-[9999] rounded-3xl border border-border/50 shadow-2xl overflow-hidden pointer-events-auto"
              style={{ background: 'hsl(var(--background))' }}
            >
              {modalBody}
            </motion.div>
          )}
        </div>
      )}
    </AnimatePresence>
  );

  return createPortal(overlay, document.body);
}
