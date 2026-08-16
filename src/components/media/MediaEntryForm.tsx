import { useState, useEffect, useRef, useCallback, forwardRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';
import { X, Plus, Film, Tv, Check, Star, User, Clapperboard, Search, Loader2, Pin, ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react';
import { useIsMobile } from '@/hooks/useIsMobile';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { mediaService } from '@/lib/media-service';
import { contactService } from '@/lib/contact-service';
import { MediaRecommendation, MediaPlatform } from '@/types/media';
import { haptics } from '@/lib/haptics';
import { audio } from '@/lib/audio';
import { cn, rewardBurst } from '@/lib/utils';
import { toast } from 'sonner';
import { omdbService, MediaSearchSuggestion } from '@/lib/omdb-service';
import { PLATFORM_LIST, PLATFORM_CONFIG } from './platformConfig';

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

const FormBody = forwardRef<HTMLDivElement, Omit<MediaEntryFormProps, 'open' | 'onOpenChange'> & { onDone?: () => void }>(
  function FormBody({ onSubmit, initialData, isEdit = false, onDone }, ref) {
    const [title, setTitle]         = useState(initialData?.title || '');
    const [type, setType]           = useState<'movie' | 'series'>(initialData?.type || 'movie');
    const [selectedFriendId, setSelectedFriendId] = useState(initialData?.recommendedBy || '');
    const [genres, setGenres]       = useState<string[]>(initialData?.genres || []);
    const [customGenre, setCustomGenre] = useState('');
    const [status, setStatus]       = useState<'to_watch' | 'watching' | 'watched'>(initialData?.status || 'to_watch');
  const [rating, setRating]       = useState<number>(initialData?.rating || 5);
  const [notes, setNotes]         = useState(initialData?.notes || '');
  const [platform, setPlatform]   = useState<MediaPlatform | ''>(initialData?.platform || '');
  const [posterUrl, setPosterUrl] = useState(initialData?.posterUrl || '');
  const [releaseYear, setReleaseYear] = useState(initialData?.releaseYear || '');
  const [imdbId, setImdbId]       = useState(initialData?.imdbId || '');
  const [imdbRating, setImdbRating] = useState(initialData?.imdbRating || '');
  const [plot, setPlot]           = useState(initialData?.plot || '');
  const [director, setDirector]   = useState(initialData?.director || '');
  const [actors, setActors]       = useState(initialData?.actors || '');
  const [runtime, setRuntime]     = useState(initialData?.runtime || '');
  const [rated, setRated]         = useState(initialData?.rated || '');
  const [awards, setAwards]       = useState(initialData?.awards || '');

  // OMDb search
  const [suggestions, setSuggestions]     = useState<MediaSearchSuggestion[]>([]);
  const [isSearching, setIsSearching]     = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [omdbConfigured]                  = useState(() => omdbService.isConfigured());
  const searchDebounce                    = useRef<ReturnType<typeof setTimeout> | null>(null);
  const titleInputRef                     = useRef<HTMLInputElement>(null);
  const suggestionsRef                    = useRef<HTMLDivElement>(null);

  // Friend input inline state
  const [isAddingFriend, setIsAddingFriend] = useState(false);
  const [newFriendName, setNewFriendName]   = useState('');
  const [contacts, setContacts]             = useState(() => contactService.getContacts());

  const [isProcessing, setIsProcessing] = useState(false);
  const [success, setSuccess]           = useState(false);
  const [showFullDetails, setShowFullDetails] = useState(false);

  // ── OMDb debounced search ────────────────────────────────────────────
  const triggerSearch = useCallback((query: string) => {
    if (searchDebounce.current) clearTimeout(searchDebounce.current);
    if (!omdbConfigured || !query.trim() || query.trim().length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    searchDebounce.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await omdbService.search(query, undefined);
        setSuggestions(results);
        setShowSuggestions(results.length > 0);
      } finally {
        setIsSearching(false);
      }
    }, 480);
  }, [omdbConfigured]);

  const handleTitleChange = (val: string) => {
    setTitle(val);
    triggerSearch(val);
  };

    const handlePickSuggestion = async (s: MediaSearchSuggestion) => {
      haptics.medium();
      setTitle(s.title);
      setType(s.type);
      setPosterUrl(s.posterUrl || '');
      setReleaseYear(s.year || '');
      setImdbId(s.imdbId);
      setShowSuggestions(false);

      // Fetch full detail (genres, plot, director, actors, rating, runtime, platform)
      const detail = await omdbService.getDetail(s.imdbId);
      if (detail) {
        if (detail.genres && detail.genres.length > 0) setGenres(detail.genres);
        if (detail.posterUrl) setPosterUrl(detail.posterUrl);
        if (detail.year) setReleaseYear(detail.year);
        if (detail.imdbRating) setImdbRating(detail.imdbRating);
        if (detail.plot) setPlot(detail.plot);
        if (detail.director) setDirector(detail.director);
        if (detail.actors) setActors(detail.actors);
        if (detail.runtime) setRuntime(detail.runtime);
        if (detail.rated) setRated(detail.rated);
        if (detail.awards) setAwards(detail.awards);
        if (detail.platform) setPlatform(detail.platform);
      }
    };

  // Close suggestions on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        suggestionsRef.current && !suggestionsRef.current.contains(e.target as Node) &&
        titleInputRef.current && !titleInputRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // ── Friends ──────────────────────────────────────────────────────────
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

  // ── Genres ───────────────────────────────────────────────────────────
  const handleToggleGenre = (genre: string) => {
    haptics.light();
    setGenres(prev => prev.includes(genre) ? prev.filter(g => g !== genre) : [...prev, genre]);
  };

  const handleAddCustomGenre = () => {
    const trimmed = customGenre.trim();
    if (trimmed && !genres.includes(trimmed)) {
      setGenres(prev => [...prev, trimmed]);
      setCustomGenre('');
      haptics.medium();
    }
  };

  // Clean up search debounce on unmount
  useEffect(() => {
    return () => {
      if (searchDebounce.current) clearTimeout(searchDebounce.current);
    };
  }, []);

  // ── Duplicate Check ──────────────────────────────────────────────────
  const existingMedia = mediaService.getMedia();
  const cleanTitle = title.trim().toLowerCase();
  const cleanImdbId = imdbId?.trim().toLowerCase();
  const duplicateItem = cleanTitle.length > 0
    ? existingMedia.find(m => {
        if (isEdit && initialData && m.id === initialData.id) return false;
        const titleMatches = m.title.trim().toLowerCase() === cleanTitle;
        const imdbMatches = !!(cleanImdbId && m.imdbId && m.imdbId.trim().toLowerCase() === cleanImdbId);
        return titleMatches || imdbMatches;
      })
    : undefined;
  const isExactDuplicate = !!(duplicateItem && cleanImdbId && duplicateItem.imdbId?.trim().toLowerCase() === cleanImdbId);
  const isDuplicate = isExactDuplicate;

  // ── Submit ───────────────────────────────────────────────────────────
  const handleFormSubmit = async () => {
    if (isProcessing) return;
    if (!title.trim()) { toast.error('Title is required'); return; }

    if (isDuplicate) {
      haptics.medium();
      toast.error(`"${duplicateItem?.title || title.trim()}" is already in your watchlist!`);
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
        platform: platform || undefined,
        posterUrl: posterUrl || undefined,
        releaseYear: releaseYear || undefined,
        imdbId: imdbId || undefined,
        imdbRating: imdbRating || undefined,
        plot: plot || undefined,
        director: director || undefined,
        actors: actors || undefined,
        runtime: runtime || undefined,
        rated: rated || undefined,
        awards: awards || undefined,
      };

      setSuccess(true);
      haptics.success();
      audio.success();
      toast.success(isEdit ? 'Recommendation updated' : 'Recommendation added to Watchlist');

      if (!isEdit) {
        rewardBurst();
        setTitle(''); setType('movie'); setSelectedFriendId('');
        setGenres([]); setNotes(''); setStatus('to_watch');
        setPlatform(''); setPosterUrl(''); setReleaseYear('');
        setImdbId(''); setImdbRating(''); setPlot('');
        setDirector(''); setActors(''); setRuntime(''); setRated(''); setAwards('');
      }

      onSubmit(payload);
      setSuccess(false);
      onDone?.();
    } catch (error) {
      console.error(error);
      toast.error('Failed to save recommendation');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div ref={ref} className="flex flex-col gap-5 py-1">

      {/* ── Title with OMDb autocomplete ─────────────────────────────── */}
      <div className="space-y-1.5">
        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
          Title
          {omdbConfigured && (
            <span className="text-[8px] font-bold text-amber-400 border border-amber-400/30 bg-amber-400/10 px-1.5 py-0.5 rounded-full">
              OMDb Search Active
            </span>
          )}
        </Label>
        <div className="relative">
          <div className="relative">
            {omdbConfigured && (
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            )}
            {isSearching && (
              <Loader2 className="absolute right-3 top-2.5 h-3.5 w-3.5 text-muted-foreground animate-spin pointer-events-none" />
            )}
            <Input
              ref={titleInputRef}
              value={title}
              onChange={e => handleTitleChange(e.target.value)}
              onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
              placeholder={omdbConfigured ? 'Search movie or series title...' : 'e.g. Interstellar, Severance'}
              className={cn(
                'h-9 text-xs rounded-xl bg-background/50 border-border/40 font-bold text-foreground transition-colors',
                omdbConfigured && 'pl-9',
                isDuplicate && 'border-amber-500/60 focus:border-amber-500 bg-amber-500/5'
              )}
            />
          </div>

          {/* Inline Duplicate Alert */}
          {isDuplicate && (
            <motion.div
              initial={{ opacity: 0, y: -2 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-1.5 px-3 py-2 mt-1.5 text-xs font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-xl"
            >
              <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-400" />
              <span>"{duplicateItem?.title}" is already in your watchlist!</span>
            </motion.div>
          )}

          {/* Suggestions dropdown */}
          <AnimatePresence>
            {showSuggestions && suggestions.length > 0 && (
              <motion.div
                ref={suggestionsRef}
                initial={{ opacity: 0, y: -4, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -4, scale: 0.98 }}
                transition={{ duration: 0.15 }}
                className="absolute top-full left-0 right-0 mt-1.5 z-[9999] glass rounded-2xl border border-border/40 shadow-2xl overflow-hidden"
                style={{ background: 'hsl(var(--background))', maxHeight: '260px', overflowY: 'auto' }}
              >
                {suggestions.map((s, i) => {
                  const isSugDuplicate = existingMedia.some(m => {
                    if (isEdit && initialData && m.id === initialData.id) return false;
                    return m.title.trim().toLowerCase() === s.title.trim().toLowerCase() ||
                      (s.imdbId && m.imdbId && m.imdbId.trim().toLowerCase() === s.imdbId.trim().toLowerCase());
                  });

                  return (
                    <button
                      key={s.imdbId}
                      type="button"
                      onClick={() => handlePickSuggestion(s)}
                      className={cn(
                        'w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-muted/30',
                        i !== 0 && 'border-t border-border/10',
                        isSugDuplicate && 'bg-amber-500/5'
                      )}
                    >
                      {/* Poster thumb with onError fallback */}
                      <div className="h-10 w-7 rounded-md overflow-hidden bg-muted/30 shrink-0 flex items-center justify-center">
                        {s.posterUrl ? (
                          <img
                            src={s.posterUrl}
                            alt={s.title}
                            referrerPolicy="no-referrer"
                            className="h-full w-full object-cover"
                            onError={e => {
                              (e.currentTarget as HTMLImageElement).style.display = 'none';
                            }}
                          />
                        ) : (
                          <Film className="h-3.5 w-3.5 text-muted-foreground/50" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-xs font-bold text-foreground truncate">{s.title}</p>
                          {isSugDuplicate && (
                            <span className="text-[8px] font-bold text-amber-400 bg-amber-400/10 border border-amber-400/20 px-1.5 py-0.5 rounded shrink-0">
                              In Watchlist
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-muted-foreground">
                          {s.year} · {s.type === 'movie' ? 'Movie' : 'Series'}
                        </p>
                      </div>
                      <span className={cn(
                        'text-[8px] font-black uppercase px-1.5 py-0.5 rounded border shrink-0',
                        s.type === 'movie'
                          ? 'border-indigo-400/30 text-indigo-400 bg-indigo-400/10'
                          : 'border-purple-400/30 text-purple-400 bg-purple-400/10'
                      )}>
                        {s.type}
                      </span>
                    </button>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Poster & Rich OMDb Preview Card if auto-filled */}
        {(posterUrl || plot || imdbRating) && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-3.5 rounded-2xl bg-muted/20 border border-amber-400/20 space-y-2.5 relative"
          >
            <div className="flex items-start gap-3">
              {posterUrl ? (
                <img
                  src={posterUrl}
                  alt="Poster"
                  referrerPolicy="no-referrer"
                  className="h-24 w-16 rounded-xl object-cover shadow-md border border-white/10 shrink-0"
                  onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                />
              ) : (
                <div className="h-24 w-16 rounded-xl bg-muted/40 flex items-center justify-center text-muted-foreground shrink-0 border border-border/20">
                  <Film className="h-6 w-6" />
                </div>
              )}
              <div className="flex-1 min-w-0 pr-6">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[9px] font-black uppercase tracking-wider text-amber-400 border border-amber-400/30 bg-amber-400/10 px-1.5 py-0.5 rounded-full">
                    OMDb Details
                  </span>
                  {imdbRating && (
                    <span className="text-[10px] font-black text-amber-400 flex items-center gap-1 bg-amber-400/10 px-1.5 py-0.5 rounded-full">
                      <Star className="h-3 w-3 fill-amber-400" /> {imdbRating}
                    </span>
                  )}
                  {runtime && <span className="text-[10px] font-bold text-muted-foreground">{runtime}</span>}
                  {rated && <span className="text-[9px] font-bold text-amber-400 border border-amber-400/20 px-1 rounded">{rated}</span>}
                </div>
                <h4 className="text-xs font-black text-foreground mt-1 line-clamp-1">{title} {releaseYear ? `(${releaseYear})` : ''}</h4>
                {director && <p className="text-[10px] font-bold text-muted-foreground truncate mt-0.5">Dir: {director}</p>}
                {actors && <p className="text-[10px] text-muted-foreground truncate">Cast: {actors}</p>}
              </div>
              <button
                type="button"
                onClick={() => {
                  setPosterUrl(''); setReleaseYear(''); setImdbId('');
                  setImdbRating(''); setPlot(''); setDirector(''); setActors('');
                  setRuntime(''); setRated(''); setAwards('');
                }}
                className="absolute top-3 right-3 h-6 w-6 rounded-full bg-muted/40 flex items-center justify-center text-muted-foreground hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            {/* Scrollable Synopsis (No truncation!) */}
            {plot && (
              <div className="space-y-1">
                <span className="text-[9px] font-black uppercase tracking-wider text-muted-foreground block">Plot Synopsis</span>
                <div className="text-[11px] text-foreground/90 leading-relaxed italic bg-background/60 p-2.5 rounded-xl border border-border/20 max-h-36 overflow-y-auto select-text" style={{ overscrollBehavior: 'contain' }}>
                  "{plot}"
                </div>
              </div>
            )}

            {/* Toggle expand full cast / awards details */}
            {(director || actors || awards) && (
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => setShowFullDetails(o => !o)}
                  className="text-[10px] font-bold text-amber-400 flex items-center gap-1 hover:underline"
                >
                  <span>{showFullDetails ? 'Hide Extra Details' : 'View Full Details & Cast'}</span>
                  {showFullDetails ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                </button>

                {showFullDetails && (
                  <div className="mt-2 space-y-1.5 text-[10px] text-muted-foreground bg-background/40 p-2.5 rounded-xl border border-border/10 animate-in fade-in duration-200">
                    {director && <p><span className="font-bold text-foreground">Director:</span> {director}</p>}
                    {actors && <p><span className="font-bold text-foreground">Cast:</span> {actors}</p>}
                    {awards && <p className="text-amber-300"><span className="font-bold text-foreground">Awards:</span> {awards}</p>}
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}
      </div>

      {/* ── Media Type Toggle ─────────────────────────────────────────── */}
      <div className="space-y-1.5">
        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Media Type</Label>
        <div className="grid grid-cols-2 gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => { haptics.light(); setType('movie'); }}
            className={cn(
              'h-10 rounded-xl text-xs font-bold transition-all border border-transparent flex items-center justify-center gap-1.5',
              type === 'movie' ? 'bg-purple-500 hover:bg-purple-600 text-white font-black' : 'bg-muted/40 hover:bg-muted/60 text-muted-foreground'
            )}
          >
            <Film className="h-4 w-4" /> Movie
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => { haptics.light(); setType('series'); }}
            className={cn(
              'h-10 rounded-xl text-xs font-bold transition-all border border-transparent flex items-center justify-center gap-1.5',
              type === 'series' ? 'bg-cyan-500 hover:bg-cyan-600 text-white font-black' : 'bg-muted/40 hover:bg-muted/60 text-muted-foreground'
            )}
          >
            <Tv className="h-4 w-4" /> Series
          </Button>
        </div>
      </div>

      {/* ── Platform Selector ─────────────────────────────────────────── */}
      <div className="space-y-1.5">
        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground block">
          Platform <span className="font-normal text-muted-foreground/60">(optional)</span>
        </Label>
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1 pt-0.5 -mx-1 px-1">
          {/* "None" chip */}
          <button
            type="button"
            onClick={() => { haptics.light(); setPlatform(''); }}
            className={cn(
              'shrink-0 px-3 py-1.5 rounded-full border text-[10px] font-bold transition-all whitespace-nowrap',
              platform === ''
                ? 'bg-muted/50 border-border/60 text-foreground'
                : 'bg-transparent border-border/20 text-muted-foreground hover:bg-muted/20'
            )}
          >
            None
          </button>
          {PLATFORM_LIST.map(p => {
            const isSelected = platform === p.key;
            const Icon = p.icon;
            return (
              <button
                key={p.key}
                type="button"
                onClick={() => { haptics.light(); setPlatform(isSelected ? '' : p.key); }}
                className={cn(
                  'shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[10px] font-bold transition-all whitespace-nowrap',
                  isSelected
                    ? `${p.color} ${p.textColor} ${p.borderColor}`
                    : 'bg-transparent border-border/20 text-muted-foreground hover:bg-muted/20'
                )}
              >
                <Icon className="h-3.5 w-3.5 shrink-0" />
                <span>{p.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Recommended By Friend Selector ────────────────────────────── */}
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
                      if (e.key === 'Enter') { e.preventDefault(); handleAddFriend(); }
                      else if (e.key === 'Escape') setIsAddingFriend(false);
                    }}
                  />
                  <button type="button" className="h-7 w-7 rounded-full bg-primary/20 text-primary flex items-center justify-center hover:bg-primary/30" onClick={handleAddFriend}>
                    <Check className="h-3.5 w-3.5" />
                  </button>
                  <button type="button" className="h-7 w-7 rounded-full flex items-center justify-center text-muted-foreground hover:bg-muted/50" onClick={() => setIsAddingFriend(false)}>
                    <X className="h-3.5 w-3.5" />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Self / No one chip */}
            <button
              type="button"
              onClick={() => { haptics.light(); setSelectedFriendId(''); }}
              className={cn(
                'flex-shrink-0 relative flex items-center gap-2 pl-1.5 pr-3 py-1 rounded-full border transition-all duration-300 active:scale-95',
                selectedFriendId === ''
                  ? 'bg-primary/10 border-primary/40 text-primary'
                  : 'bg-muted/20 border-transparent text-muted-foreground hover:bg-muted/30'
              )}
            >
              <div className={cn(
                'h-6 w-6 rounded-full flex items-center justify-center overflow-hidden border transition-colors',
                selectedFriendId === '' ? 'border-primary/40 bg-primary/20 text-primary' : 'border-background bg-muted/50 text-muted-foreground'
              )}>
                <User className="h-3 w-3" />
              </div>
              <span className="text-[11px] font-bold whitespace-nowrap">Self / No one</span>
            </button>

            {contacts.length > 0 && <div className="w-[1px] h-6 bg-border/40 flex-shrink-0 mx-1" />}

            {/* Friend chips */}
            {contacts.map(c => {
              const isSelected = selectedFriendId === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => { haptics.light(); setSelectedFriendId(isSelected ? '' : c.id); }}
                  className={cn(
                    'flex-shrink-0 relative flex items-center gap-2 pl-1.5 pr-3 py-1 rounded-full border transition-all duration-300 active:scale-95',
                    isSelected ? 'bg-primary/10 border-primary/40 text-primary' : 'bg-muted/20 border-transparent text-muted-foreground hover:bg-muted/30'
                  )}
                >
                  <div className={cn('h-6 w-6 rounded-full flex items-center justify-center overflow-hidden border transition-colors', isSelected ? 'border-primary/40' : 'border-background')}>
                    {c.avatar ? (
                      <img src={c.avatar} alt={c.name} className="h-full w-full object-cover" />
                    ) : (
                      <div className={cn('h-full w-full flex items-center justify-center', isSelected ? 'bg-primary/20 text-primary' : 'bg-muted/50')}>
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

      {/* ── Genres ────────────────────────────────────────────────────── */}
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
                  'px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all',
                  isSelected ? 'bg-primary text-white border-transparent' : 'bg-muted/20 border-border/10 text-muted-foreground hover:bg-muted/40'
                )}
              >
                {genre}
              </button>
            );
          })}
          {/* Custom genres from auto-fill */}
          {genres.filter(g => !PRESET_GENRES.includes(g)).map(genre => (
            <button
              key={genre}
              type="button"
              onClick={() => handleToggleGenre(genre)}
              className="px-2.5 py-1 rounded-lg text-[10px] font-bold border bg-primary text-white border-transparent"
            >
              {genre}
            </button>
          ))}
        </div>
        <div className="flex gap-2 mt-2">
          <Input
            value={customGenre}
            onChange={e => setCustomGenre(e.target.value)}
            placeholder="Add custom genre..."
            className="h-8 text-[11px] rounded-lg bg-background/50 border-border/40 flex-1"
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddCustomGenre(); } }}
          />
          <Button type="button" variant="outline" size="sm" onClick={handleAddCustomGenre} className="h-8 rounded-lg text-xs font-bold border-border/40 px-3 shrink-0">
            Add
          </Button>
        </div>
      </div>

      {/* ── Status Selector ───────────────────────────────────────────── */}
      <div className="space-y-1.5">
        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Status</Label>
        <div className="grid grid-cols-3 gap-2">
          {[
            { value: 'to_watch', label: 'To Watch', activeClass: 'bg-slate-500/20 border-slate-500/50 text-slate-300' },
            { value: 'watching', label: 'Watching', activeClass: 'bg-primary/20 border-primary/50 text-primary' },
            { value: 'watched',  label: 'Watched',  activeClass: 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400' },
          ].map(opt => {
            const isSelected = status === opt.value;
            return (
              <Button
                key={opt.value}
                type="button"
                variant="outline"
                onClick={() => { haptics.light(); setStatus(opt.value as typeof status); }}
                className={cn(
                  'h-10 rounded-xl text-[11px] font-bold transition-all border flex items-center justify-center gap-1',
                  isSelected ? opt.activeClass + ' font-black' : 'bg-muted/30 border-transparent text-muted-foreground hover:bg-muted/50'
                )}
              >
                {opt.label}
              </Button>
            );
          })}
        </div>
      </div>

      {/* ── Rating (only if Watched) ──────────────────────────────────── */}
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
                <Star className={cn('h-6 w-6 transition-colors', stars <= rating ? 'text-amber-400 fill-amber-400' : 'text-muted-foreground/30')} />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Notes / Review ────────────────────────────────────────────── */}
      <div className="space-y-1.5">
        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Notes / Review</Label>
        <Textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="Add reviews or details..."
          className="bg-background/50 border-border/40 focus:border-primary/50 text-xs min-h-[80px] rounded-xl resize-none font-bold"
        />
      </div>

      {/* ── Save Action Button ────────────────────────────────────────── */}
      <div className="pt-2">
        <Button
          type="button"
          disabled={isProcessing || isDuplicate}
          onClick={handleFormSubmit}
          className={cn(
            'w-full h-12 rounded-2xl font-bold text-sm shadow-lg flex items-center justify-center gap-2 transition-all',
            isDuplicate
              ? 'bg-muted text-muted-foreground border border-amber-500/30 cursor-not-allowed shadow-none'
              : 'bg-gradient-primary text-white shadow-primary/25 hover:opacity-95 active:scale-[0.98]'
          )}
        >
          {isProcessing ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin text-white" />
              <span>{isEdit ? 'Updating Watchlist...' : 'Saving Watchlist...'}</span>
            </>
          ) : isDuplicate ? (
            <>
              <AlertTriangle className="h-4 w-4 text-amber-400" />
              <span>Already in Watchlist</span>
            </>
          ) : success ? (
            <>
              <Check className="h-5 w-5 text-white" />
              <span>{isEdit ? 'Updated!' : 'Saved to Watchlist!'}</span>
            </>
          ) : (
            <>
              <Clapperboard className="h-4 w-4 text-white" />
              <span>{isEdit ? 'Update Recommendation' : 'Save Recommendation'}</span>
            </>
          )}
        </Button>
      </div>
    </div>
  );
});

export function MediaEntryForm({
  open,
  onOpenChange,
  onSubmit,
  initialData,
  isEdit = false,
}: MediaEntryFormProps) {
  const isMobile = useIsMobile();

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  const formContent = (
    <FormBody
      key={initialData?.id || (open ? 'open' : 'closed')}
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
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm pointer-events-auto"
            onClick={() => onOpenChange(false)}
          />

          {isMobile ? (
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="relative w-full z-[9999] rounded-t-3xl border-t border-border/40 overflow-hidden pointer-events-auto"
              style={{ background: 'hsl(var(--background))', maxHeight: '92dvh', display: 'flex', flexDirection: 'column' }}
            >
              <div className="flex justify-center pt-3 pb-1 shrink-0">
                <div className="h-1 w-10 rounded-full bg-muted-foreground/30" />
              </div>
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
              <div className="overflow-y-auto flex-1 px-5 pb-10" style={{ overscrollBehavior: 'contain' }}>
                {formContent}
              </div>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-xl z-[9999] rounded-2xl border border-border/50 shadow-2xl overflow-hidden pointer-events-auto"
              style={{ background: 'hsl(var(--background))', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}
            >
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
