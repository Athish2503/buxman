import { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Clapperboard, Plus, Search, Film, Tv, Star, Edit2, Trash2, 
  Check, Play, User, X, AlertCircle, Heart, Pin, PinOff,
  Shuffle, Download, Loader2, ChevronDown, SlidersHorizontal, Info,
  LayoutGrid, Columns, ArrowRight, ArrowLeft, RotateCcw, PlusCircle,
  FolderHeart, Bookmark, Layers
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { mediaService } from '@/lib/media-service';
import { contactService } from '@/lib/contact-service';
import { MediaRecommendation, CustomMediaList } from '@/types/media';
import { PLATFORM_CONFIG, PLATFORM_LIST } from './platformConfig';
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
import { MediaDetailModal } from './MediaDetailModal';
import { ManageListsModal } from './ManageListsModal';
import { generateWatchlistPDF } from '@/lib/media-pdf';

const PRESET_GENRES = [
  'Action', 'Comedy', 'Drama', 'Sci-Fi', 'Fantasy', 
  'Horror', 'Thriller', 'Romance', 'Mystery', 
  'Animation', 'Documentary', 'Anime'
];

export function MediaDashboard() {
  const [mediaList, setMediaList]   = useState<MediaRecommendation[]>(() => mediaService.getMedia());
  const [contacts, setContacts]     = useState(() => contactService.getContacts());

  // View Mode & Kanban
  const [viewMode, setViewMode]                 = useState<'grid' | 'kanban'>('grid');
  const [activeKanbanTab, setActiveKanbanTab]   = useState<'to_watch' | 'watching' | 'watched'>('to_watch');
  const [draggedItemId, setDraggedItemId]       = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn]     = useState<string | null>(null);

  // Search & Filters
  const [search, setSearch]             = useState('');
  const [activeType, setActiveType]     = useState<'all' | 'movie' | 'series'>('all');
  const [activeStatus, setActiveStatus] = useState<'all' | 'to_watch' | 'watching' | 'watched'>('all');
  const [selectedGenres, setSelectedGenres]     = useState<string[]>([]);
  const [selectedFriendId, setSelectedFriendId] = useState<string>('all');
  const [selectedPlatform, setSelectedPlatform] = useState<string>('all');
  const [selectedListId, setSelectedListId]     = useState<string>('all');
  const [filtersOpen, setFiltersOpen]           = useState(true);

  // Custom Lists State
  const [customLists, setCustomLists]           = useState<CustomMediaList[]>(() => mediaService.getCustomLists());
  const [isManageListsOpen, setIsManageListsOpen] = useState(false);
  const [manageListsItem, setManageListsItem]   = useState<MediaRecommendation | null>(null);
  const [initialCreateList, setInitialCreateList] = useState(false);

  const handleOpenManageLists = (item?: MediaRecommendation, createMode = false) => {
    setManageListsItem(item || null);
    setInitialCreateList(createMode);
    setIsManageListsOpen(true);
    haptics.selection();
  };

  // Modal Dialogs
  const [isFormOpen, setIsFormOpen]   = useState(false);
  const [editingItem, setEditingItem] = useState<MediaRecommendation | null>(null);

  // Detail Modal
  const [selectedDetailItem, setSelectedDetailItem] = useState<MediaRecommendation | null>(null);
  const [isDetailOpen, setIsDetailOpen]             = useState(false);

  // Rate modal
  const [isRateOpen, setIsRateOpen]   = useState(false);
  const [ratingItem, setRatingItem]   = useState<MediaRecommendation | null>(null);
  const [rateStars, setRateStars]     = useState(5);
  const [rateNotes, setRateNotes]     = useState('');

  // Delete confirm modal
  const [deletingItem, setDeletingItem] = useState<MediaRecommendation | null>(null);

  // Surprise Me modal
  const [surpriseItem, setSurpriseItem]   = useState<MediaRecommendation | null>(null);
  const [isSurpriseOpen, setIsSurpriseOpen] = useState(false);
  const [isShuffling, setIsShuffling]     = useState(false);

  const handlePickDifferent = () => {
    if (!surpriseItem) return;
    const pool = mediaList.filter(m => m.status === 'to_watch' && m.id !== surpriseItem.id);
    if (pool.length === 0) {
      toast.info('No other unwatched recommendations!');
      return;
    }
    haptics.medium();
    audio.tick();
    setIsShuffling(true);
    setTimeout(() => {
      const next = pool[Math.floor(Math.random() * pool.length)];
      setSurpriseItem(next);
      setIsShuffling(false);
    }, 200);
  };

  // PDF export
  const [isExporting, setIsExporting] = useState(false);

  const loadData = () => {
    setMediaList(mediaService.getMedia());
    setContacts(contactService.getContacts());
    setCustomLists(mediaService.getCustomLists());
  };

  useEffect(() => {
    loadData();
    window.addEventListener('media-updated', loadData);
    window.addEventListener('media-lists-updated', loadData);
    window.addEventListener('expenses-updated', loadData);
    return () => {
      window.removeEventListener('media-updated', loadData);
      window.removeEventListener('media-lists-updated', loadData);
      window.removeEventListener('expenses-updated', loadData);
    };
  }, []);

  // Contact map for PDF
  const contactMap = useMemo(() => {
    const m: Record<string, string> = {};
    contacts.forEach(c => { m[c.id] = c.name; });
    return m;
  }, [contacts]);

  // Filtered + sorted list (pinned first)
  const filteredList = useMemo(() => {
    return mediaList
      .filter(item => {
        const matchesSearch = item.title.toLowerCase().includes(search.toLowerCase()) || 
          (item.notes && item.notes.toLowerCase().includes(search.toLowerCase()));
        const matchesType     = activeType === 'all' || item.type === activeType;
        const matchesStatus   = activeStatus === 'all' || item.status === activeStatus;
        const matchesGenres   = selectedGenres.length === 0 || selectedGenres.every(g => item.genres.includes(g));
        const matchesFriend   = selectedFriendId === 'all' ||
          (selectedFriendId === 'self' && !item.recommendedBy) ||
          item.recommendedBy === selectedFriendId;
        const matchesPlatform = selectedPlatform === 'all' ||
          (selectedPlatform === 'none' && !item.platform) ||
          item.platform === selectedPlatform;
        const matchesList     = selectedListId === 'all' || (() => {
          const list = customLists.find(l => l.id === selectedListId);
          return list ? list.itemIds.includes(item.id) : false;
        })();

        return matchesSearch && matchesType && matchesStatus && matchesGenres && matchesFriend && matchesPlatform && matchesList;
      })
      .sort((a, b) => {
        // Pinned always first
        if (a.pinned && !b.pinned) return -1;
        if (!a.pinned && b.pinned) return 1;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
  }, [mediaList, search, activeType, activeStatus, selectedGenres, selectedFriendId, selectedPlatform, selectedListId, customLists]);

  const stats = useMemo(() => ({
    toWatch:  mediaList.filter(m => m.status === 'to_watch').length,
    watching: mediaList.filter(m => m.status === 'watching').length,
    watched:  mediaList.filter(m => m.status === 'watched').length,
  }), [mediaList]);

  const allExistingGenres = useMemo(() => {
    const set = new Set<string>(PRESET_GENRES);
    mediaList.forEach(item => item.genres.forEach(g => set.add(g)));
    return Array.from(set);
  }, [mediaList]);

  // Handlers
  const handleOpenDetail = (item: MediaRecommendation) => {
    setSelectedDetailItem(item);
    setIsDetailOpen(true);
    haptics.selection();
  };
  const handleOpenAdd = () => { setEditingItem(null); setIsFormOpen(true); haptics.selection(); };
  const handleOpenEdit = (item: MediaRecommendation) => { setEditingItem(item); setIsFormOpen(true); haptics.selection(); };
  const handleSaveItem = (payload: Omit<MediaRecommendation, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (editingItem) {
      mediaService.updateMedia({ ...editingItem, ...payload });
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
    mediaService.updateMedia({ ...item, status: 'watching' });
    toast.info(`Started watching "${item.title}"! 🍿`);
    audio.shimmer();
  };
  const handleMoveStatus = (item: MediaRecommendation, targetStatus: 'to_watch' | 'watching' | 'watched') => {
    if (item.status === targetStatus) return;
    if (targetStatus === 'watched') {
      handleOpenRate(item);
      return;
    }
    haptics.medium();
    audio.tick();
    mediaService.updateMedia({ ...item, status: targetStatus });
    const targetLabel = targetStatus === 'to_watch' ? 'To Watch' : 'Watching';
    toast.success(`Moved "${item.title}" to ${targetLabel}`);
  };
  const handleOpenAddWithStatus = (status: 'to_watch' | 'watching' | 'watched') => {
    setEditingItem({ status } as MediaRecommendation);
    setIsFormOpen(true);
    haptics.selection();
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
    mediaService.updateMedia({ ...ratingItem, status: 'watched', rating: rateStars, notes: rateNotes.trim() || ratingItem.notes });
    toast.success(`Completed "${ratingItem.title}"! 🎬`);
    setIsRateOpen(false);
    confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
    audio.shimmer();
  };

  // ── Toggle Pin ──────────────────────────────────────────────────────
  const handleTogglePin = (item: MediaRecommendation) => {
    haptics.medium();
    mediaService.updateMedia({ ...item, pinned: !item.pinned });
    toast.success(item.pinned ? `Unpinned "${item.title}"` : `Pinned "${item.title}" to top 📌`);
  };

  // ── Surprise Me ────────────────────────────────────────────────────
  const handleSurpriseMe = () => {
    const pool = mediaList.filter(m => m.status === 'to_watch');
    if (pool.length === 0) {
      toast.info("Your To Watch list is empty! Add some recommendations first 🎬");
      return;
    }
    const pick = pool[Math.floor(Math.random() * pool.length)];
    haptics.success();
    audio.shimmer();
    setSurpriseItem(pick);
    setIsSurpriseOpen(true);
  };

  // ── PDF Export ─────────────────────────────────────────────────────
  const handleExportPDF = async () => {
    if (isExporting) return;
    setIsExporting(true);
    try {
      await generateWatchlistPDF(mediaList, contactMap);
      toast.success('Watchlist exported as PDF 🎬');
    } catch (e) {
      console.error(e);
      toast.error('Failed to export PDF');
    } finally {
      setIsExporting(false);
    }
  };

  // ── Genre filter ───────────────────────────────────────────────────
  const handleToggleFilterGenre = (genre: string) => {
    haptics.light();
    setSelectedGenres(prev => prev.includes(genre) ? prev.filter(g => g !== genre) : [...prev, genre]);
  };

  const getFriendName = (id?: string) => {
    if (!id) return 'Self';
    const f = contacts.find(c => c.id === id);
    return f ? f.name : 'Unknown Friend';
  };

  return (
    <div className="space-y-6 pb-20 animate-in fade-in duration-500">
      
      {/* ── Title Header ──────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-1">
        <div>
          <h1 className="text-3xl font-black tracking-tight flex items-center gap-2">
            <Clapperboard className="h-8 w-8 text-primary" />
            <span>Watchlist</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-1">Track movie and series recommendations from your friends</p>
        </div>
        
        <div className="flex flex-wrap gap-2 self-start sm:self-auto">
          {/* Curated Lists */}
          <Button
            onClick={() => handleOpenManageLists(undefined, false)}
            className="h-9 px-3 rounded-2xl text-xs font-bold gap-1.5 bg-purple-500/15 text-purple-300 border border-purple-500/20 hover:bg-purple-500/25 shadow-none shrink-0"
          >
            <FolderHeart className="h-3.5 w-3.5" />
            <span>My Lists</span>
            {customLists.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-purple-500/30 text-purple-200 text-[10px] font-black">
                {customLists.length}
              </span>
            )}
          </Button>

          {/* Create List */}
          <Button
            onClick={() => handleOpenManageLists(undefined, true)}
            className="h-9 px-3 rounded-2xl text-xs font-bold gap-1.5 bg-purple-500/10 text-purple-300 border border-purple-500/20 hover:bg-purple-500/20 shadow-none shrink-0"
          >
            <Plus className="h-3.5 w-3.5" />
            <span className="hidden xs:inline">New List</span>
          </Button>

          {/* Surprise Me */}
          <Button
            onClick={handleSurpriseMe}
            className="h-9 px-3 rounded-2xl text-xs font-bold gap-1.5 bg-amber-500/15 text-amber-400 border border-amber-500/20 hover:bg-amber-500/25 shadow-none shrink-0"
          >
            <Shuffle className="h-3.5 w-3.5" />
            <span className="hidden md:inline">Surprise Me</span>
          </Button>

          {/* Export PDF */}
          <Button
            onClick={handleExportPDF}
            disabled={isExporting || mediaList.length === 0}
            className="h-9 px-3 rounded-2xl text-xs font-bold gap-1.5 bg-muted/30 text-muted-foreground border border-border/30 hover:bg-muted/50 shadow-none shrink-0"
          >
            {isExporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
            <span className="hidden md:inline">PDF</span>
          </Button>

          {/* Add */}
          <Button
            onClick={handleOpenAdd}
            className="h-9 px-4 rounded-2xl text-xs font-bold gap-2 bg-primary text-white hover:bg-primary/90 shadow-lg shadow-primary/20 shrink-0"
          >
            <Plus className="h-4 w-4" />
            <span>Add</span>
          </Button>
        </div>
      </div>

      {/* ── Bento Stats ───────────────────────────────────────────────── */}
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

      {/* ── Search & Filter Controls ──────────────────────────────────── */}
      {(() => {
        const activeFilterCount =
          (activeStatus !== 'all' ? 1 : 0) +
          (selectedPlatform !== 'all' ? 1 : 0) +
          (selectedListId !== 'all' ? 1 : 0) +
          selectedGenres.length +
          (activeType !== 'all' ? 1 : 0) +
          (selectedFriendId !== 'all' ? 1 : 0);

        return (
          <div className="glass rounded-3xl border border-border/30 overflow-hidden">

            {/* ── Top row: search + friend + type + filter toggle ── */}
            <div className="flex flex-col md:flex-row gap-3 p-4 sm:p-5">
              {/* Search bar */}
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search title, notes..."
                  className="pl-10 pr-9 h-10 rounded-xl bg-background/50 border-border/40 text-xs font-bold"
                />
                <AnimatePresence>
                  {search && (
                    <motion.button
                      initial={{ opacity: 0, scale: 0.6 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.6 }}
                      transition={{ duration: 0.15 }}
                      onClick={() => { haptics.light(); setSearch(''); }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 rounded-full bg-muted/60 hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <X className="h-3 w-3" />
                    </motion.button>
                  )}
                </AnimatePresence>
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
                        activeType === type ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {type}
                    </button>
                  ))}
                </div>

                {/* View Mode (Grid vs Kanban) */}
                <div className="flex bg-muted/30 p-1 rounded-xl border border-border/10 shrink-0">
                  <button
                    onClick={() => { haptics.light(); setViewMode('grid'); }}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all",
                      viewMode === 'grid' ? "bg-card text-foreground shadow-sm font-bold" : "text-muted-foreground hover:text-foreground"
                    )}
                    title="Grid View"
                  >
                    <LayoutGrid className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Grid</span>
                  </button>
                  <button
                    onClick={() => { haptics.light(); setViewMode('kanban'); }}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all",
                      viewMode === 'kanban' ? "bg-primary text-white shadow-sm font-bold" : "text-muted-foreground hover:text-foreground"
                    )}
                    title="Kanban View"
                  >
                    <Columns className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Kanban</span>
                  </button>
                </div>

                {/* Filter Toggle Button */}
                <button
                  onClick={() => { haptics.light(); setFiltersOpen(o => !o); }}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider border transition-all shrink-0",
                    filtersOpen
                      ? "bg-primary/10 border-primary/20 text-primary"
                      : "bg-background/20 border-border/30 text-muted-foreground hover:text-foreground hover:bg-muted/30"
                  )}
                >
                  <SlidersHorizontal className="h-3 w-3" />
                  <span className="hidden sm:inline">Filters</span>
                  {activeFilterCount > 0 && (
                    <span className="h-4 min-w-[16px] px-1 rounded-full bg-primary text-white text-[9px] font-black flex items-center justify-center">
                      {activeFilterCount}
                    </span>
                  )}
                  <motion.span
                    animate={{ rotate: filtersOpen ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                    className="inline-flex"
                  >
                    <ChevronDown className="h-3 w-3" />
                  </motion.span>
                </button>
              </div>
            </div>

            {/* ── Collapsible filter body ── */}
            <AnimatePresence initial={false}>
              {filtersOpen && (
                <motion.div
                  key="filter-body"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
                  className="overflow-hidden"
                >
                  <div className="px-4 sm:px-5 pb-4 sm:pb-5 space-y-4 border-t border-border/10">

                    {/* Status Tabs */}
                    <div className="flex flex-wrap gap-1.5 pt-3">
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

                    {/* Custom Lists Filter */}
                    <div className="flex flex-wrap items-center gap-1.5 border-t border-border/10 pt-3">
                      <button
                        onClick={() => { haptics.light(); setSelectedListId('all'); }}
                        className={cn(
                          "px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all border flex items-center gap-1",
                          selectedListId === 'all'
                            ? "bg-primary/10 border-primary/20 text-primary"
                            : "bg-background/20 border-border/30 text-muted-foreground hover:text-foreground"
                        )}
                      >
                        <Layers className="h-3 w-3" />
                        <span>All Lists</span>
                      </button>

                      {customLists.map(list => (
                        <button
                          key={list.id}
                          onClick={() => { haptics.light(); setSelectedListId(selectedListId === list.id ? 'all' : list.id); }}
                          className={cn(
                            "px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all border flex items-center gap-1",
                            selectedListId === list.id
                              ? "bg-purple-500/20 text-purple-300 border-purple-500/40 shadow-sm"
                              : "bg-background/20 border-border/30 text-muted-foreground hover:text-foreground"
                          )}
                        >
                          <span>{list.emoji || '🍿'}</span>
                          <span>{list.name}</span>
                          <span className="text-[9px] opacity-60 font-mono">({list.itemIds.length})</span>
                        </button>
                      ))}

                      <button
                        onClick={() => handleOpenManageLists()}
                        className="px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all border border-dashed border-primary/40 bg-primary/5 text-primary hover:bg-primary/10 flex items-center gap-1 sm:ml-auto"
                      >
                        <Plus className="h-3 w-3" />
                        <span>Curate Lists</span>
                      </button>
                    </div>

                    {/* Platform filter */}
                    <div className="flex flex-wrap gap-1.5 border-t border-border/10 pt-3">
                      <button
                        onClick={() => { haptics.light(); setSelectedPlatform('all'); }}
                        className={cn(
                          "px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all border",
                          selectedPlatform === 'all'
                            ? "bg-primary/10 border-primary/20 text-primary"
                            : "bg-background/20 border-border/30 text-muted-foreground hover:text-foreground"
                        )}
                      >
                        All Platforms
                      </button>
                      {PLATFORM_LIST.map(p => (
                        <button
                          key={p.key}
                          onClick={() => { haptics.light(); setSelectedPlatform(selectedPlatform === p.key ? 'all' : p.key); }}
                          className={cn(
                            "px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all border flex items-center gap-1",
                            selectedPlatform === p.key
                              ? `${p.color} ${p.textColor} ${p.borderColor}`
                              : "bg-background/20 border-border/30 text-muted-foreground hover:text-foreground"
                          )}
                        >
                          <span>{p.emoji}</span>
                          <span>{p.label}</span>
                        </button>
                      ))}
                    </div>

                    {/* Genre filters */}
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

                    {/* Clear all filters */}
                    {activeFilterCount > 0 && (
                      <div className="pt-1">
                        <button
                          onClick={() => {
                            haptics.medium();
                            setActiveStatus('all');
                            setSelectedPlatform('all');
                            setSelectedListId('all');
                            setSelectedGenres([]);
                            setActiveType('all');
                            setSelectedFriendId('all');
                            setSearch('');
                          }}
                          className="text-[10px] font-bold text-destructive/80 hover:text-destructive uppercase tracking-wider hover:underline transition-colors"
                        >
                          ✕ Clear all filters ({activeFilterCount})
                        </button>
                      </div>
                    )}

                  </div>
                </motion.div>
              )}
            </AnimatePresence>

          </div>
        );
      })()}

      {/* ── Recommendations Grid / Kanban View ────────────────────────── */}
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
              <Button onClick={handleOpenAdd} className="rounded-xl h-9 text-xs font-bold bg-primary text-white mt-2 px-4">
                Log First Recommendation
              </Button>
            )}
          </motion.div>
        ) : viewMode === 'kanban' ? (
          <motion.div
            key="media-kanban"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            {/* Mobile Tab Selector (Visible on mobile screens) */}
            <div className="flex md:hidden bg-muted/20 p-1 rounded-2xl border border-border/20 overflow-x-auto gap-1">
              {[
                { id: 'to_watch' as const, label: 'To Watch', count: filteredList.filter(m => m.status === 'to_watch').length, color: 'text-amber-400 bg-amber-500/20 border-amber-500/30' },
                { id: 'watching' as const, label: 'Watching', count: filteredList.filter(m => m.status === 'watching').length, color: 'text-primary bg-primary/20 border-primary/30' },
                { id: 'watched' as const, label: 'Watched', count: filteredList.filter(m => m.status === 'watched').length, color: 'text-emerald-400 bg-emerald-500/20 border-emerald-500/30' },
              ].map(tab => {
                const isSelected = activeKanbanTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => {
                      haptics.light();
                      setActiveKanbanTab(tab.id);
                    }}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold transition-all border whitespace-nowrap",
                      isSelected
                        ? `${tab.color} shadow-sm font-black`
                        : "bg-transparent border-transparent text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <span>{tab.label}</span>
                    <span className={cn(
                      "px-1.5 py-0.5 rounded-full text-[10px] font-black",
                      isSelected ? "bg-white/20" : "bg-muted/40"
                    )}>
                      {tab.count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Kanban Columns (Responsive horizontal scroll container on mobile, 3-column grid on desktop) */}
            <div className="flex md:grid md:grid-cols-3 gap-4 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-none">
              {[
                {
                  id: 'to_watch' as const,
                  title: 'To Watch',
                  icon: Film,
                  badgeColor: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
                  columnBg: 'from-amber-500/5 via-transparent to-transparent',
                  accentColor: 'border-amber-500/30',
                  items: filteredList.filter(m => m.status === 'to_watch'),
                },
                {
                  id: 'watching' as const,
                  title: 'Watching',
                  icon: Play,
                  badgeColor: 'bg-primary/20 text-primary border-primary/30',
                  columnBg: 'from-primary/5 via-transparent to-transparent',
                  accentColor: 'border-primary/30',
                  items: filteredList.filter(m => m.status === 'watching'),
                },
                {
                  id: 'watched' as const,
                  title: 'Watched',
                  icon: Check,
                  badgeColor: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
                  columnBg: 'from-emerald-500/5 via-transparent to-transparent',
                  accentColor: 'border-emerald-500/30',
                  items: filteredList.filter(m => m.status === 'watched'),
                },
              ].map(col => {
                const isMobileActive = activeKanbanTab === col.id;
                const isDragOver = dragOverColumn === col.id;

                return (
                  <div
                    key={col.id}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setDragOverColumn(col.id);
                    }}
                    onDragLeave={() => setDragOverColumn(null)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setDragOverColumn(null);
                      const id = e.dataTransfer.getData('text/plain');
                      if (id) {
                        const targetItem = mediaList.find(m => m.id === id);
                        if (targetItem) {
                          handleMoveStatus(targetItem, col.id);
                        }
                      }
                    }}
                    className={cn(
                      "w-[85vw] sm:w-[340px] shrink-0 snap-center md:w-auto md:shrink md:snap-align-none",
                      "flex flex-col gap-3 glass rounded-3xl p-3.5 sm:p-4 border transition-all bg-gradient-to-b min-h-[480px]",
                      col.columnBg,
                      isDragOver ? "ring-2 ring-primary border-primary bg-primary/10" : col.accentColor,
                      "hidden md:flex",
                      isMobileActive && "!flex"
                    )}
                  >
                    {/* Column Header */}
                    <div className="flex items-center justify-between pb-2 border-b border-border/10">
                      <div className="flex items-center gap-2">
                        <div className={cn("h-7 w-7 rounded-xl flex items-center justify-center border shrink-0", col.badgeColor)}>
                          <col.icon className="h-3.5 w-3.5" />
                        </div>
                        <h4 className="font-display font-black text-sm text-foreground">{col.title}</h4>
                        <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-black border", col.badgeColor)}>
                          {col.items.length}
                        </span>
                      </div>

                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenAddWithStatus(col.id)}
                        className="h-7 w-7 rounded-xl hover:bg-muted/40 text-muted-foreground hover:text-foreground"
                        title={`Add new ${col.title} item`}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>

                    {/* Column Items */}
                    <div className="flex-1 space-y-3 overflow-y-auto max-h-[650px] pr-1 scrollbar-thin">
                      {col.items.length === 0 ? (
                        <div className="py-12 flex flex-col items-center justify-center text-center text-muted-foreground border-2 border-dashed border-border/20 rounded-2xl p-4">
                          <Film className="h-6 w-6 opacity-30 mb-2" />
                          <p className="text-xs font-bold opacity-60">No items in {col.title}</p>
                          <button
                            onClick={() => handleOpenAddWithStatus(col.id)}
                            className="text-[10px] font-bold text-primary hover:underline mt-1"
                          >
                            + Add item
                          </button>
                        </div>
                      ) : (
                        col.items.map(item => {
                          const isMovie = item.type === 'movie';
                          const friendName = getFriendName(item.recommendedBy);
                          const platformInfo = item.platform ? PLATFORM_CONFIG[item.platform] : null;

                          return (
                            <motion.div
                              key={item.id}
                              layout
                              draggable
                              onDragStart={(e) => {
                                e.dataTransfer.setData('text/plain', item.id);
                                setDraggedItemId(item.id);
                              }}
                              onDragEnd={() => setDraggedItemId(null)}
                              onClick={() => handleOpenDetail(item)}
                              className={cn(
                                "glass rounded-2xl border border-border/20 p-3.5 flex flex-col gap-2.5 transition-all cursor-pointer relative group hover:border-primary/40 hover:bg-card/90 active:scale-[0.99]",
                                item.pinned && "ring-1 ring-primary/40 border-primary/30",
                                draggedItemId === item.id && "opacity-40 scale-95"
                              )}
                            >
                              {/* Top row: Poster + Title + Type badge */}
                              <div className="flex items-start gap-2.5">
                                {item.posterUrl ? (
                                  <img
                                    src={item.posterUrl}
                                    alt={item.title}
                                    referrerPolicy="no-referrer"
                                    className="h-14 w-10 rounded-lg object-cover shadow-sm shrink-0 border border-white/10"
                                    onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                                  />
                                ) : (
                                  <div className="h-14 w-10 rounded-lg bg-muted/40 flex items-center justify-center text-muted-foreground shrink-0 border border-border/20">
                                    {isMovie ? <Film className="h-3.5 w-3.5" /> : <Tv className="h-3.5 w-3.5" />}
                                  </div>
                                )}

                                <div className="flex-1 min-w-0">
                                  <div className="flex items-start justify-between gap-1">
                                    <h5 className="font-bold text-xs leading-snug text-foreground group-hover:text-primary transition-colors line-clamp-2">
                                      {item.title}
                                    </h5>
                                    {item.pinned && (
                                      <Pin className="h-3 w-3 text-primary shrink-0 fill-primary/20" />
                                    )}
                                  </div>

                                  <div className="flex items-center gap-1.5 flex-wrap mt-1">
                                    <span className={cn(
                                      "text-[8px] font-black uppercase px-1.5 py-0.5 rounded border shrink-0",
                                      isMovie
                                        ? "bg-purple-500/10 border-purple-500/20 text-purple-400"
                                        : "bg-cyan-500/10 border-cyan-500/20 text-cyan-400"
                                    )}>
                                      {item.type}
                                    </span>
                                    {item.releaseYear && (
                                      <span className="text-[9px] font-semibold text-muted-foreground">{item.releaseYear}</span>
                                    )}
                                    {item.imdbRating && (
                                      <span className="inline-flex items-center gap-0.5 text-[8px] font-black text-amber-400 bg-amber-400/10 border border-amber-400/20 px-1 rounded">
                                        <Star className="h-2 w-2 fill-amber-400" /> {item.imdbRating}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* Genres & Platform */}
                              <div className="flex items-center justify-between gap-1 pt-1 border-t border-border/10 text-[9px]">
                                {item.genres.length > 0 ? (
                                  <span className="text-muted-foreground truncate max-w-[140px]">
                                    {item.genres.slice(0, 2).join(', ')}
                                  </span>
                                ) : (
                                  <span className="text-muted-foreground/60 italic">No genre</span>
                                )}

                                {platformInfo && (
                                  <span className={cn(
                                    "inline-flex items-center gap-1 text-[8px] font-bold px-1.5 py-0.5 rounded-full border shrink-0",
                                    platformInfo.color, platformInfo.textColor, platformInfo.borderColor
                                  )}>
                                    <platformInfo.icon className="h-2.5 w-2.5" />
                                    {platformInfo.label}
                                  </span>
                                )}
                              </div>

                              {/* Recommender / Watched Rating */}
                              <div className="flex items-center justify-between gap-2 text-[10px]">
                                <div className="flex items-center gap-1 text-muted-foreground truncate">
                                  <User className="h-3 w-3 shrink-0" />
                                  <span className="truncate">{item.recommendedBy ? friendName : 'Self'}</span>
                                </div>

                                {item.status === 'watched' && item.rating && (
                                  <div className="flex gap-0.5 shrink-0">
                                    {Array.from({ length: 5 }).map((_, i) => (
                                      <Star
                                        key={i}
                                        className={cn(
                                          "h-2.5 w-2.5",
                                          i < (item.rating || 0) ? "text-amber-400 fill-amber-400" : "text-muted-foreground/20"
                                        )}
                                      />
                                    ))}
                                  </div>
                                )}
                              </div>

                              {/* Quick Move & Action Controls */}
                              <div className="flex items-center justify-between gap-1 pt-2 border-t border-border/10">
                                <div className="flex items-center gap-1">
                                  {/* Left Move Button */}
                                  {col.id === 'watching' && (
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={(e) => { e.stopPropagation(); handleMoveStatus(item, 'to_watch'); }}
                                      className="h-6 w-6 rounded-lg hover:bg-muted/40 text-muted-foreground hover:text-foreground"
                                      title="Move back to To Watch"
                                    >
                                      <ArrowLeft className="h-3 w-3" />
                                    </Button>
                                  )}
                                  {col.id === 'watched' && (
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={(e) => { e.stopPropagation(); handleMoveStatus(item, 'watching'); }}
                                      className="h-6 w-6 rounded-lg hover:bg-muted/40 text-muted-foreground hover:text-foreground"
                                      title="Move back to Watching"
                                    >
                                      <ArrowLeft className="h-3 w-3" />
                                    </Button>
                                  )}

                                  {/* Right Move / Action Button */}
                                  {col.id === 'to_watch' && (
                                    <Button
                                      onClick={(e) => { e.stopPropagation(); handleStartWatching(item); }}
                                      className="h-6 rounded-lg bg-primary/10 border border-primary/20 hover:bg-primary/20 text-primary text-[9px] font-black uppercase px-2 gap-1"
                                    >
                                      <Play className="h-2.5 w-2.5 fill-primary/20" />
                                      <span>Watch</span>
                                    </Button>
                                  )}
                                  {col.id === 'watching' && (
                                    <Button
                                      onClick={(e) => { e.stopPropagation(); handleOpenRate(item); }}
                                      className="h-6 rounded-lg bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 text-emerald-400 text-[9px] font-black uppercase px-2 gap-1"
                                    >
                                      <Check className="h-2.5 w-2.5" />
                                      <span>Complete</span>
                                    </Button>
                                  )}
                                  {col.id === 'watched' && (
                                    <Button
                                      onClick={(e) => { e.stopPropagation(); handleMoveStatus(item, 'to_watch'); }}
                                      className="h-6 rounded-lg bg-slate-500/10 border border-slate-500/20 hover:bg-slate-500/20 text-slate-300 text-[9px] font-bold px-2 gap-1"
                                    >
                                      <RotateCcw className="h-2.5 w-2.5" />
                                      <span>Re-watch</span>
                                    </Button>
                                  )}

                                  {col.id === 'to_watch' && (
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={(e) => { e.stopPropagation(); handleMoveStatus(item, 'watching'); }}
                                      className="h-6 w-6 rounded-lg hover:bg-muted/40 text-muted-foreground hover:text-foreground"
                                      title="Move to Watching"
                                    >
                                      <ArrowRight className="h-3 w-3" />
                                    </Button>
                                  )}
                                </div>

                                <div className="flex items-center gap-0.5">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={(e) => { e.stopPropagation(); handleOpenManageLists(item); }}
                                    className="h-6 w-6 rounded-lg hover:bg-muted/40 text-muted-foreground hover:text-primary transition-colors"
                                    title="Add to Curated Lists"
                                  >
                                    <FolderHeart className="h-3 w-3" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={(e) => { e.stopPropagation(); handleOpenEdit(item); }}
                                    className="h-6 w-6 rounded-lg hover:bg-muted/40 text-muted-foreground hover:text-foreground"
                                  >
                                    <Edit2 className="h-3 w-3" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={(e) => { e.stopPropagation(); setDeletingItem(item); }}
                                    className="h-6 w-6 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>
                            </motion.div>
                          );
                        })
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        ) : (
          <motion.div key="media-grid" layout className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredList.map(item => {
              const isMovie = item.type === 'movie';
              const friendName = getFriendName(item.recommendedBy);
              const borderGradient = isMovie
                ? "hover:border-purple-500/40 from-purple-500/5"
                : "hover:border-cyan-500/40 from-cyan-500/5";
              const platformInfo = item.platform ? PLATFORM_CONFIG[item.platform] : null;

              return (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  onClick={() => handleOpenDetail(item)}
                  className={cn(
                    "glass rounded-2xl border border-border/20 flex flex-col justify-between gap-3 transition-all bg-gradient-to-br to-transparent shadow-none hover:bg-card/75 relative overflow-hidden group cursor-pointer active:scale-[0.99]",
                    borderGradient,
                    item.pinned && "ring-1 ring-primary/30 border-primary/20"
                  )}
                >
                  {/* Poster backdrop if available */}
                  {item.posterUrl && (
                    <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-2xl">
                      <img
                        src={item.posterUrl}
                        alt=""
                        className="absolute top-0 right-0 h-full w-2/5 object-cover opacity-10 blur-sm"
                        style={{ maskImage: 'linear-gradient(to left, rgba(0,0,0,0.4), transparent)' }}
                      />
                    </div>
                  )}

                  <div className="space-y-2 relative z-10 p-4 pb-0">
                    {/* Pin badge */}
                    {item.pinned && (
                      <div className="absolute top-2 right-2 h-5 w-5 rounded-full bg-primary/20 flex items-center justify-center">
                        <Pin className="h-2.5 w-2.5 text-primary" />
                      </div>
                    )}

                    {/* Poster + Title row */}
                    <div className="flex items-start gap-3">
                      {item.posterUrl ? (
                        <img
                          src={item.posterUrl}
                          alt={item.title}
                          referrerPolicy="no-referrer"
                          className="h-16 w-11 rounded-lg object-cover shadow-md shrink-0 border border-white/10"
                          onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                        />
                      ) : (
                        <div className="h-16 w-11 rounded-lg bg-muted/40 flex items-center justify-center text-muted-foreground shrink-0 border border-border/20">
                          {isMovie ? <Film className="h-4 w-4" /> : <Tv className="h-4 w-4" />}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="font-bold text-sm leading-snug text-foreground group-hover:text-primary transition-colors line-clamp-2">
                            {item.title}
                            {item.releaseYear && <span className="text-muted-foreground font-normal ml-1">({item.releaseYear})</span>}
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

                        {/* IMDb Badge & Platform badge */}
                        <div className="flex items-center gap-1.5 flex-wrap mt-1">
                          {item.imdbRating && (
                            <span className="inline-flex items-center gap-0.5 text-[9px] font-black text-amber-400 bg-amber-400/10 border border-amber-400/20 px-1.5 py-0.5 rounded-md">
                              <Star className="h-2.5 w-2.5 fill-amber-400" /> {item.imdbRating}
                            </span>
                          )}
                          {platformInfo && (
                            <span className={cn(
                              "inline-flex items-center gap-1 text-[8px] font-bold px-1.5 py-0.5 rounded-full border",
                              platformInfo.color, platformInfo.textColor, platformInfo.borderColor
                            )}>
                              <platformInfo.icon className="h-3 w-3 shrink-0" />
                              {platformInfo.label}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Genres */}
                    {item.genres.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {item.genres.slice(0, 3).map(g => (
                          <span key={g} className="bg-muted/30 border border-border/5 text-muted-foreground rounded px-1.5 py-0.5 text-[8px] font-semibold">
                            {g}
                          </span>
                        ))}
                        {item.genres.length > 3 && (
                          <span className="bg-muted/20 text-muted-foreground rounded px-1.5 py-0.5 text-[8px]">+{item.genres.length - 3}</span>
                        )}
                      </div>
                    )}

                    {/* Recommender */}
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
                  <div className="border-t border-border/10 pt-2.5 px-4 pb-3 flex items-center justify-between gap-2 mt-auto relative z-10">
                    {/* Status / Action */}
                    <div>
                      {item.status === 'to_watch' && (
                        <Button
                          onClick={(e) => { e.stopPropagation(); handleStartWatching(item); }}
                          className="h-7 rounded-lg bg-primary/10 border border-primary/20 hover:bg-primary/20 text-primary text-[9px] font-black uppercase tracking-wider gap-1 px-2.5"
                        >
                          <Play className="h-2.5 w-2.5 fill-primary/25" />
                          <span>Watch</span>
                        </Button>
                      )}
                      {item.status === 'watching' && (
                        <Button
                          onClick={(e) => { e.stopPropagation(); handleOpenRate(item); }}
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
                                    i < (item.rating || 0) ? "text-amber-400 fill-amber-400" : "text-muted-foreground/20"
                                  )}
                                />
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-0.5">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => { e.stopPropagation(); handleOpenDetail(item); }}
                        className="h-7 w-7 rounded-lg hover:bg-muted/30 text-muted-foreground hover:text-foreground"
                        title="View Full Details"
                      >
                        <Info className="h-3 w-3" />
                      </Button>
                      {/* Pin toggle */}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => { e.stopPropagation(); handleTogglePin(item); }}
                        className={cn(
                          "h-7 w-7 rounded-lg hover:bg-muted/30 transition-colors",
                          item.pinned ? "text-primary hover:text-primary/80" : "text-muted-foreground hover:text-foreground"
                        )}
                        title={item.pinned ? 'Unpin' : 'Pin to top'}
                      >
                        {item.pinned ? <PinOff className="h-3 w-3" /> : <Pin className="h-3 w-3" />}
                      </Button>
                      {/* Curated list action */}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => { e.stopPropagation(); handleOpenManageLists(item); }}
                        className="h-7 w-7 rounded-lg hover:bg-muted/30 text-muted-foreground hover:text-primary transition-colors"
                        title="Add to Curated Lists"
                      >
                        <FolderHeart className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => { e.stopPropagation(); handleOpenEdit(item); }}
                        className="h-7 w-7 rounded-lg hover:bg-muted/30 text-muted-foreground hover:text-foreground"
                      >
                        <Edit2 className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => { e.stopPropagation(); setDeletingItem(item); }}
                        className="h-7 w-7 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>

                  {/* Light streak */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out pointer-events-none" />
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Detail Modal ──────────────────────────────────────────────── */}
      <MediaDetailModal
        item={selectedDetailItem}
        open={isDetailOpen}
        onOpenChange={setIsDetailOpen}
        onEdit={(item) => handleOpenEdit(item)}
        onDelete={(item) => setDeletingItem(item)}
        onTogglePin={(item) => handleTogglePin(item)}
        onStartWatching={(item) => handleStartWatching(item)}
        onRate={(item) => handleOpenRate(item)}
        onManageLists={(item) => handleOpenManageLists(item)}
        contactName={getFriendName(selectedDetailItem?.recommendedBy)}
      />

      {/* ── Manage Custom Lists Modal ────────────────────────────────────── */}
      <ManageListsModal
        open={isManageListsOpen}
        onOpenChange={setIsManageListsOpen}
        targetItem={manageListsItem}
        initialCreate={initialCreateList}
        onSelectList={(list) => setSelectedListId(list.id)}
        onListsChanged={loadData}
      />

      {/* ── Dialog Form Modal ─────────────────────────────────────────── */}
      <MediaEntryForm
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        onSubmit={handleSaveItem}
        initialData={editingItem || undefined}
        isEdit={!!editingItem}
      />

      {/* ── Rate & Review Modal ───────────────────────────────────────── */}
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
                    <Star className={cn("h-8 w-8 transition-colors", stars <= rateStars ? "text-amber-400 fill-amber-400 drop-shadow-[0_0_5px_rgba(251,191,36,0.3)]" : "text-muted-foreground/30")} />
                  </button>
                ))}
              </div>
            </div>
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
            <Button onClick={handleSaveRate} className="rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white border-none text-xs font-bold px-4">
              Complete Watch
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Confirm Delete Dialog ─────────────────────────────────────── */}
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
            <AlertDialogAction onClick={handleDeleteItem} className="rounded-xl bg-destructive hover:bg-destructive/90 text-white border-none text-xs font-bold px-4">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Surprise Me Modal ──────────────────────────────────────────────── */}
      <AnimatePresence>
        {isSurpriseOpen && surpriseItem && (
          <div className="fixed inset-0 z-[9999] grid place-items-center p-3 sm:p-4 pointer-events-auto overflow-hidden">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/80 backdrop-blur-md"
              onClick={() => setIsSurpriseOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 15 }}
              transition={{ type: 'spring', damping: 24, stiffness: 340 }}
              className="relative z-10 glass rounded-3xl border border-border/40 p-4 sm:p-5 w-[88vw] max-w-[310px] max-h-[85vh] overflow-y-auto no-scrollbar shadow-2xl text-center flex flex-col items-center"
            >
              {/* Glow ambient background orbs */}
              <div className="absolute -top-10 -right-10 h-32 w-32 bg-amber-500/20 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute -bottom-10 -left-10 h-32 w-32 bg-primary/20 rounded-full blur-3xl pointer-events-none" />

              {/* Close Button */}
              <button
                type="button"
                onClick={() => setIsSurpriseOpen(false)}
                className="absolute top-3 right-3 h-6 w-6 rounded-full bg-muted/40 hover:bg-muted/70 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors z-20"
              >
                <X className="h-3.5 w-3.5" />
              </button>

              <div className="relative z-10 flex flex-col items-center w-full">
                {/* Animated 3D Rolling Dice */}
                <motion.div
                  animate={isShuffling ? { rotate: [0, -180, 360], scale: [1, 1.3, 0.9, 1] } : { rotate: 0, scale: 1 }}
                  transition={{ duration: 0.35, ease: "easeInOut" }}
                  className="text-2xl mb-0.5 flex items-center justify-center"
                >
                  🎲
                </motion.div>

                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-amber-400 mb-1.5">Tonight's Pick</span>

                {/* Animated Card Content (Smooth Card Swap) */}
                <AnimatePresence mode="wait">
                  <motion.div
                    key={surpriseItem.id}
                    initial={{ opacity: 0, scale: 0.9, rotateY: -75 }}
                    animate={{ opacity: 1, scale: 1, rotateY: 0 }}
                    exit={{ opacity: 0, scale: 0.9, rotateY: 75 }}
                    transition={{ duration: 0.22, ease: "easeInOut" }}
                    className="flex flex-col items-center w-full"
                  >
                    {/* Poster image */}
                    {surpriseItem.posterUrl ? (
                      <img
                        src={surpriseItem.posterUrl}
                        alt={surpriseItem.title}
                        referrerPolicy="no-referrer"
                        className="h-24 w-16 object-cover rounded-xl shadow-lg border border-white/10 mb-2"
                        onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                      />
                    ) : (
                      <div className="h-24 w-16 rounded-xl bg-muted/40 flex items-center justify-center text-muted-foreground border border-border/20 mb-2">
                        {surpriseItem.type === 'movie' ? <Film className="h-5 w-5" /> : <Tv className="h-5 w-5" />}
                      </div>
                    )}

                    {/* Title & Year */}
                    <h2 className="text-base font-black text-foreground leading-tight line-clamp-1 max-w-[200px]">
                      {surpriseItem.title}
                    </h2>
                    {surpriseItem.releaseYear && (
                      <p className="text-muted-foreground text-[10px] font-semibold mt-0.5">{surpriseItem.releaseYear}</p>
                    )}

                    {/* Badges row */}
                    <div className="flex flex-wrap justify-center items-center gap-1 my-2">
                      <span className={cn(
                        "text-[8px] font-black uppercase px-2 py-0.5 rounded-full border flex items-center gap-1",
                        surpriseItem.type === 'movie'
                          ? "bg-purple-500/10 border-purple-500/20 text-purple-400"
                          : "bg-cyan-500/10 border-cyan-500/20 text-cyan-400"
                      )}>
                        {surpriseItem.type === 'movie' ? <Film className="h-2.5 w-2.5" /> : <Tv className="h-2.5 w-2.5" />}
                        {surpriseItem.type}
                      </span>

                      {surpriseItem.imdbRating && (
                        <span className="text-[8px] font-black text-amber-400 bg-amber-400/10 border border-amber-400/20 px-2 py-0.5 rounded-full flex items-center gap-0.5">
                          <Star className="h-2.5 w-2.5 fill-amber-400" /> {surpriseItem.imdbRating}
                        </span>
                      )}

                      {surpriseItem.platform && PLATFORM_CONFIG[surpriseItem.platform] && (() => {
                        const pInfo = PLATFORM_CONFIG[surpriseItem.platform];
                        const Icon = pInfo.icon;
                        return (
                          <span className={cn(
                            "text-[8px] font-bold px-2 py-0.5 rounded-full border flex items-center gap-1",
                            pInfo.color, pInfo.textColor, pInfo.borderColor
                          )}>
                            <Icon className="h-2.5 w-2.5 shrink-0" />
                            {pInfo.label}
                          </span>
                        );
                      })()}
                    </div>

                    {/* Recommended By Friend */}
                    {surpriseItem.recommendedBy && (
                      <p className="text-[9px] text-muted-foreground mb-2">
                        Recommended by <span className="text-foreground font-bold">{getFriendName(surpriseItem.recommendedBy)}</span>
                      </p>
                    )}
                  </motion.div>
                </AnimatePresence>

                {/* Action buttons */}
                <div className="grid grid-cols-2 gap-2 w-full mt-1">
                  <Button
                    type="button"
                    onClick={() => setIsSurpriseOpen(false)}
                    className="h-8.5 rounded-xl bg-muted/40 text-muted-foreground hover:text-foreground border border-border/30 hover:bg-muted/60 text-[11px] font-bold"
                  >
                    Not today
                  </Button>
                  <Button
                    type="button"
                    onClick={() => {
                      handleStartWatching(surpriseItem);
                      setIsSurpriseOpen(false);
                    }}
                    className="h-8.5 rounded-xl bg-primary text-white hover:bg-primary/90 text-[11px] font-bold gap-1 shadow-md shadow-primary/20"
                  >
                    <Play className="h-3 w-3 fill-white/30" />
                    Let's watch!
                  </Button>
                </div>

                {/* Pick different shuffle button */}
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.95 }}
                  onClick={handlePickDifferent}
                  className="mt-2.5 text-[11px] font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1.5 py-1 px-3.5 rounded-full hover:bg-amber-400/10 transition-all border border-amber-400/20 bg-amber-400/5 shadow-sm"
                >
                  <Shuffle className={cn("h-3 w-3 transition-transform duration-300", isShuffling && "rotate-180")} />
                  <span>Pick a different one</span>
                </motion.button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
