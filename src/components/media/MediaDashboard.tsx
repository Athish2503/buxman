import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Clapperboard, Plus, Search, Film, Tv, Star, Edit2, Trash2, 
  Check, Play, User, Filter, X, ChevronRight, AlertCircle, Heart 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { mediaService } from '@/lib/media-service';
import { contactService } from '@/lib/contact-service';
import { MediaRecommendation } from '@/types/media';
import { cn } from '@/lib/utils';
import { haptics } from '@/lib/haptics';
import { audio } from '@/lib/audio';
import { toast } from 'sonner';
import confetti from 'canvas-confetti';
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
import { MediaEntryForm } from './MediaEntryForm';

const PRESET_GENRES = [
  'Action', 'Comedy', 'Drama', 'Sci-Fi', 'Fantasy', 
  'Horror', 'Thriller', 'Romance', 'Mystery', 
  'Animation', 'Documentary', 'Anime'
];

export function MediaDashboard() {
  const [mediaList, setMediaList] = useState<MediaRecommendation[]>(() => mediaService.getMedia());
  const [contacts, setContacts] = useState(() => contactService.getContacts());

  // Search & Filters
  const [search, setSearch] = useState('');
  const [activeType, setActiveType] = useState<'all' | 'movie' | 'series'>('all');
  const [activeStatus, setActiveStatus] = useState<'all' | 'to_watch' | 'watching' | 'watched'>('all');
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [selectedFriendId, setSelectedFriendId] = useState<string>('all');

  // Modal Dialogs
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MediaRecommendation | null>(null);

  // Settle / Rate modal
  const [isRateOpen, setIsRateOpen] = useState(false);
  const [ratingItem, setRatingItem] = useState<MediaRecommendation | null>(null);
  const [rateStars, setRateStars] = useState(5);
  const [rateNotes, setRateNotes] = useState('');

  // Delete confirm modal
  const [deletingItem, setDeletingItem] = useState<MediaRecommendation | null>(null);

  // Load Data
  const loadData = () => {
    setMediaList(mediaService.getMedia());
    setContacts(contactService.getContacts());
  };

  useEffect(() => {
    loadData();
    window.addEventListener('media-updated', loadData);
    window.addEventListener('expenses-updated', loadData); // contacts might update
    return () => {
      window.removeEventListener('media-updated', loadData);
      window.removeEventListener('expenses-updated', loadData);
    };
  }, []);

  // Filtered List
  const filteredList = useMemo(() => {
    return mediaList.filter(item => {
      // Search
      const matchesSearch = item.title.toLowerCase().includes(search.toLowerCase()) || 
        (item.notes && item.notes.toLowerCase().includes(search.toLowerCase()));
      
      // Type
      const matchesType = activeType === 'all' || item.type === activeType;

      // Status
      const matchesStatus = activeStatus === 'all' || item.status === activeStatus;

      // Genres (All selected genres must match)
      const matchesGenres = selectedGenres.length === 0 || 
        selectedGenres.every(g => item.genres.includes(g));

      // Recommender
      const matchesFriend = selectedFriendId === 'all' || 
        (selectedFriendId === 'self' && !item.recommendedBy) ||
        item.recommendedBy === selectedFriendId;

      return matchesSearch && matchesType && matchesStatus && matchesGenres && matchesFriend;
    });
  }, [mediaList, search, activeType, activeStatus, selectedGenres, selectedFriendId]);

  // Aggregate stats
  const stats = useMemo(() => {
    return {
      toWatch: mediaList.filter(m => m.status === 'to_watch').length,
      watching: mediaList.filter(m => m.status === 'watching').length,
      watched: mediaList.filter(m => m.status === 'watched').length,
    };
  }, [mediaList]);

  // All genres across the current list for filter suggestions
  const allExistingGenres = useMemo(() => {
    const set = new Set<string>(PRESET_GENRES);
    mediaList.forEach(item => item.genres.forEach(g => set.add(g)));
    return Array.from(set);
  }, [mediaList]);

  // Handlers
  const handleOpenAdd = () => {
    setEditingItem(null);
    setIsFormOpen(true);
    haptics.selection();
  };

  const handleOpenEdit = (item: MediaRecommendation) => {
    setEditingItem(item);
    setIsFormOpen(true);
    haptics.selection();
  };

  const handleSaveItem = (payload: Omit<MediaRecommendation, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (editingItem) {
      mediaService.updateMedia({
        ...editingItem,
        ...payload,
      });
    } else {
      mediaService.addMedia(payload);
    }
  };

  const handleDeleteItem = () => {
    if (!deletingItem) return;
    mediaService.deleteMedia(deletingItem.id);
    toast.success('Recommendation deleted');
    setDeletingItem(null);
    haptics.medium();
  };

  const handleStartWatching = (item: MediaRecommendation) => {
    haptics.medium();
    mediaService.updateMedia({
      ...item,
      status: 'watching'
    });
    toast.info(`Started watching "${item.title}"! 🍿`);
    audio.shimmer();
  };

  const handleOpenRate = (item: MediaRecommendation) => {
    setRatingItem(item);
    setRateStars(item.rating || 5);
    setRateNotes(item.notes || '');
    setIsRateOpen(true);
    haptics.selection();
  };

  const handleSaveRate = () => {
    if (!ratingItem) return;
    haptics.success();
    
    mediaService.updateMedia({
      ...ratingItem,
      status: 'watched',
      rating: rateStars,
      notes: rateNotes.trim() || ratingItem.notes
    });

    toast.success(`Completed "${ratingItem.title}"! 🎬`);
    setIsRateOpen(false);

    // Confetti burst
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 }
    });
    audio.shimmer();
  };

  const handleToggleFilterGenre = (genre: string) => {
    haptics.light();
    if (selectedGenres.includes(genre)) {
      setSelectedGenres(prev => prev.filter(g => g !== genre));
    } else {
      setSelectedGenres(prev => [...prev, genre]);
    }
  };

  const getFriendName = (id?: string) => {
    if (!id) return 'Self';
    const f = contacts.find(c => c.id === id);
    return f ? f.name : 'Unknown Friend';
  };

  return (
    <div className="space-y-6 pb-20 animate-in fade-in duration-500">
      
      {/* ── Title Header ───────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 px-1">
        <div>
          <h1 className="text-3xl font-black tracking-tight flex items-center gap-2">
            <Clapperboard className="h-8 w-8 text-primary" />
            <span>Watchlist</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-1">Track movie and series recommendations from your friends</p>
        </div>
        
        <Button
          onClick={handleOpenAdd}
          className="h-10 px-5 rounded-2xl text-xs font-bold gap-2 bg-primary text-white hover:bg-primary/90 shadow-lg shadow-primary/20 shrink-0 self-start sm:self-auto"
        >
          <Plus className="h-4 w-4" />
          <span>Add Recommendation</span>
        </Button>
      </div>

      {/* ── Bento Stats Cards ──────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-3">
        <div className="glass rounded-3xl p-4 border border-border/30 flex flex-col justify-between h-24">
          <div className="h-8 w-8 rounded-xl bg-muted/40 flex items-center justify-center text-muted-foreground shrink-0">
            <Tv className="h-4.5 w-4.5" />
          </div>
          <div>
            <p className="text-[9px] font-black uppercase tracking-wider text-muted-foreground">To Watch</p>
            <h3 className="text-xl font-display font-black text-foreground mt-0.5">{stats.toWatch}</h3>
          </div>
        </div>

        <div className="glass rounded-3xl p-4 border border-border/30 flex flex-col justify-between h-24 relative overflow-hidden">
          <div className="absolute right-0 top-0 h-10 w-10 bg-primary/10 rounded-full blur-xl animate-pulse" />
          <div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
            <Play className="h-4.5 w-4.5 fill-primary/25" />
          </div>
          <div>
            <p className="text-[9px] font-black uppercase tracking-wider text-primary">Watching</p>
            <h3 className="text-xl font-display font-black text-primary mt-0.5">{stats.watching}</h3>
          </div>
        </div>

        <div className="glass rounded-3xl p-4 border border-border/30 flex flex-col justify-between h-24">
          <div className="h-8 w-8 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 shrink-0">
            <Check className="h-4.5 w-4.5" />
          </div>
          <div>
            <p className="text-[9px] font-black uppercase tracking-wider text-emerald-400">Completed</p>
            <h3 className="text-xl font-display font-black text-emerald-400 mt-0.5">{stats.watched}</h3>
          </div>
        </div>
      </div>

      {/* ── Search & Filter Controls ────────────────────────────────── */}
      <div className="glass rounded-3xl p-4 sm:p-5 border border-border/30 space-y-4">
        
        <div className="flex flex-col md:flex-row gap-3">
          {/* Search bar */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search title, notes..."
              className="pl-10 h-10 rounded-xl bg-background/50 border-border/40 text-xs font-bold"
            />
          </div>

          <div className="flex flex-wrap sm:flex-nowrap gap-2.5">
            {/* Friend Filter */}
            <select
              value={selectedFriendId}
              onChange={e => setSelectedFriendId(e.target.value)}
              className="bg-background/50 border border-border/40 hover:bg-muted/60 transition-colors text-xs font-bold rounded-xl px-3 py-2.5 outline-none cursor-pointer text-foreground flex-1 sm:flex-initial"
            >
              <option value="all">All Friends</option>
              <option value="self">Self Logged</option>
              {contacts.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>

            {/* Media Type Tabs */}
            <div className="flex bg-muted/30 p-1 rounded-xl border border-border/10 shrink-0">
              {(['all', 'movie', 'series'] as const).map(type => (
                <button
                  key={type}
                  onClick={() => { haptics.light(); setActiveType(type); }}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all",
                    activeType === type 
                      ? "bg-card text-foreground shadow-sm" 
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Status Tabs */}
        <div className="flex flex-wrap gap-1.5 border-t border-border/10 pt-3">
          {(['all', 'to_watch', 'watching', 'watched'] as const).map(status => {
            const label = status === 'all' ? 'All Status' : status === 'to_watch' ? 'To Watch' : status === 'watching' ? 'Watching' : 'Watched';
            return (
              <button
                key={status}
                onClick={() => { haptics.light(); setActiveStatus(status); }}
                className={cn(
                  "px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all border",
                  activeStatus === status
                    ? "bg-primary/10 border-primary/20 text-primary"
                    : "bg-background/20 border-border/30 text-muted-foreground hover:text-foreground hover:bg-background/30"
                )}
              >
                {label}
              </button>
            );
          })}
        </div>

        {/* Genre filters (Horizontal tags) */}
        <div className="space-y-1.5 border-t border-border/10 pt-3">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-black uppercase tracking-wider text-muted-foreground">Filter by Genre</span>
            {selectedGenres.length > 0 && (
              <button 
                onClick={() => { haptics.medium(); setSelectedGenres([]); }}
                className="text-[9px] font-bold text-destructive hover:underline uppercase tracking-wide"
              >
                Clear Genres ({selectedGenres.length})
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {allExistingGenres.map(genre => {
              const isSelected = selectedGenres.includes(genre);
              return (
                <button
                  key={genre}
                  onClick={() => handleToggleFilterGenre(genre)}
                  className={cn(
                    "px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all border",
                    isSelected
                      ? "bg-primary text-white border-transparent"
                      : "bg-muted/20 border-border/10 text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                  )}
                >
                  {genre}
                </button>
              );
            })}
          </div>
        </div>

      </div>

      {/* ── Recommendations Grid ───────────────────────────────────── */}
      <AnimatePresence mode="popLayout">
        {filteredList.length === 0 ? (
          <motion.div 
            key="media-empty"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="py-16 flex flex-col items-center justify-center text-center space-y-4 glass rounded-[2.5rem] border border-border/30"
          >
            <div className="h-16 w-16 rounded-3xl bg-muted/30 flex items-center justify-center text-muted-foreground animate-pulse">
              <Film className="h-8 w-8" />
            </div>
            <div>
              <p className="font-bold text-base">No Recommendations Found</p>
              <p className="text-xs text-muted-foreground max-w-xs mt-1 px-4">
                {mediaList.length === 0 
                  ? "Your watchlist is empty. Ask friends for their favorite movies & series and log them here! 🎬" 
                  : "No items match your active search filter constraints. Try clearing filters."}
              </p>
            </div>
            {mediaList.length === 0 && (
              <Button
                onClick={handleOpenAdd}
                className="rounded-xl h-9 text-xs font-bold bg-primary text-white mt-2 px-4"
              >
                Log First Recommendation
              </Button>
            )}
          </motion.div>
        ) : (
          <motion.div 
            key="media-grid"
            layout
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
          >
            {filteredList.map(item => {
              const isMovie = item.type === 'movie';
              const friendName = getFriendName(item.recommendedBy);
              
              // Dynamic gradient background style based on category
              const borderGradient = isMovie 
                ? "hover:border-purple-500/40 from-purple-500/5" 
                : "hover:border-cyan-500/40 from-cyan-500/5";

              return (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  className={cn(
                    "glass rounded-2xl border border-border/20 p-4 flex flex-col justify-between gap-3 transition-all bg-gradient-to-br to-transparent shadow-none hover:bg-card/75 relative overflow-hidden group",
                    borderGradient
                  )}
                >
                  <div className="space-y-2 relative z-10">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="font-bold text-sm leading-snug text-foreground group-hover:text-primary transition-colors line-clamp-1">
                        {item.title}
                      </h4>

                      <span className={cn(
                        "text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded border shadow-sm shrink-0 flex items-center gap-1",
                        isMovie 
                          ? "bg-purple-500/10 border-purple-500/20 text-purple-400" 
                          : "bg-cyan-500/10 border-cyan-500/20 text-cyan-400"
                      )}>
                        {isMovie ? <Film className="h-2 w-2" /> : <Tv className="h-2 w-2" />}
                        {item.type}
                      </span>
                    </div>

                    {/* Genres */}
                    {item.genres.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {item.genres.map(g => (
                          <span 
                            key={g}
                            className="bg-muted/30 border border-border/5 text-muted-foreground rounded px-1.5 py-0.5 text-[8px] font-semibold"
                          >
                            {g}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Citations */}
                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground/80 pt-0.5">
                      <User className="h-3 w-3 text-muted-foreground/60 shrink-0" />
                      <span className="truncate">
                        {item.recommendedBy ? (
                          <>From <span className="text-foreground font-semibold">{friendName}</span></>
                        ) : (
                          <span className="text-foreground font-semibold">Self Logged</span>
                        )}
                      </span>
                    </div>

                    {/* Notes */}
                    {item.notes && (
                      <p className="text-[11px] text-muted-foreground/90 leading-relaxed italic line-clamp-2 pt-0.5">
                        "{item.notes}"
                      </p>
                    )}
                  </div>

                  {/* Card Footer */}
                  <div className="border-t border-border/10 pt-2.5 flex items-center justify-between gap-2 mt-auto relative z-10">
                    {/* Status Display & Toggle Action */}
                    <div>
                      {item.status === 'to_watch' && (
                        <Button
                          onClick={() => handleStartWatching(item)}
                          className="h-7 rounded-lg bg-primary/10 border border-primary/20 hover:bg-primary/20 text-primary text-[9px] font-black uppercase tracking-wider gap-1 px-2.5"
                        >
                          <Play className="h-2.5 w-2.5 fill-primary/25" />
                          <span>Watch</span>
                        </Button>
                      )}

                      {item.status === 'watching' && (
                        <Button
                          onClick={() => handleOpenRate(item)}
                          className="h-7 rounded-lg bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/20 text-amber-400 text-[9px] font-black uppercase tracking-wider gap-1 px-2.5 animate-pulse"
                        >
                          <Check className="h-2.5 w-2.5" />
                          <span>Complete</span>
                        </Button>
                      )}

                      {item.status === 'watched' && (
                        <div className="flex flex-col items-start">
                          <span className="text-[8px] font-black uppercase tracking-wider text-emerald-400 flex items-center gap-1">
                            <Check className="h-2.5 w-2.5" /> Watched
                          </span>
                          {item.rating && (
                            <div className="flex gap-0.5 mt-0.5">
                              {Array.from({ length: 5 }).map((_, i) => (
                                <Star 
                                  key={i} 
                                  className={cn(
                                    "h-2.5 w-2.5 shrink-0", 
                                    i < (item.rating || 0) 
                                      ? "text-amber-400 fill-amber-400" 
                                      : "text-muted-foreground/20"
                                  )} 
                                />
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Edit / Delete Buttons */}
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenEdit(item)}
                        className="h-7 w-7 rounded-lg hover:bg-muted/30 text-muted-foreground hover:text-foreground"
                      >
                        <Edit2 className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeletingItem(item)}
                        className="h-7 w-7 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>

                  {/* Aesthetic light streak backdrop on hover */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out pointer-events-none" />
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Dialog Form Modal (Add/Edit) ─────────────────────────── */}
      <MediaEntryForm
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        onSubmit={handleSaveItem}
        initialData={editingItem || undefined}
        isEdit={!!editingItem}
      />

      {/* ── Settle Rate & Review Modal (Mark Watched) ────────────── */}
      <AlertDialog open={isRateOpen} onOpenChange={setIsRateOpen}>
        <AlertDialogContent className="rounded-3xl border-border/40 glass max-w-[90vw] sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-bold flex items-center gap-2">
              <Star className="h-6 w-6 text-amber-400 fill-amber-400/20 animate-spin-slow" />
              <span>Rate & Review</span>
            </AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground text-xs">
              Give your final review for "{ratingItem?.title}" to complete this recommendation.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="py-2 space-y-4 text-left">
            {/* Stars */}
            <div className="space-y-1.5 text-center py-2 bg-black/10 border border-white/5 rounded-2xl">
              <label className="text-[9px] font-black uppercase tracking-wider text-muted-foreground block mb-2">How was it?</label>
              <div className="flex justify-center gap-2">
                {[1, 2, 3, 4, 5].map(stars => (
                  <button
                    key={stars}
                    type="button"
                    onClick={() => { haptics.light(); setRateStars(stars); }}
                    className="p-1 hover:scale-110 transition-transform"
                  >
                    <Star
                      className={cn(
                        "h-8 w-8 transition-colors",
                        stars <= rateStars 
                          ? "text-amber-400 fill-amber-400 drop-shadow-[0_0_5px_rgba(251,191,36,0.3)]" 
                          : "text-muted-foreground/30"
                      )}
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Notes / Final Thoughts</Label>
              <Textarea
                value={rateNotes}
                onChange={e => setRateNotes(e.target.value)}
                placeholder="Write your review here (optional)..."
                className="bg-background/50 border-border/40 focus:border-primary/50 text-xs min-h-[90px] rounded-xl resize-none font-bold"
              />
            </div>
          </div>

          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="rounded-xl border-white/10 hover:bg-white/5">Cancel</AlertDialogCancel>
            <Button
              onClick={handleSaveRate}
              className="rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white border-none text-xs font-bold px-4"
            >
              Complete Watch
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Confirm Delete Dialog ────────────────────────────────── */}
      <AlertDialog open={deletingItem !== null} onOpenChange={open => !open && setDeletingItem(null)}>
        <AlertDialogContent className="rounded-3xl border-border/40 glass max-w-[90vw] sm:max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg font-bold flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5.5 w-5.5" />
              <span>Delete Recommendation?</span>
            </AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground text-xs leading-relaxed text-left">
              Are you sure you want to remove <strong>"{deletingItem?.title}"</strong> from your watchlist? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="rounded-xl border-white/10 hover:bg-white/5">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteItem}
              className="rounded-xl bg-destructive hover:bg-destructive/90 text-white border-none text-xs font-bold px-4"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}
