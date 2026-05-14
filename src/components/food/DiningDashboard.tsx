import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, Search, Filter, Utensils, 
  ChefHat, Map, Sparkles, TrendingUp,
  History, Calendar, Share2, Star, Heart, Layers
} from 'lucide-react';
import { DiningExperience } from '@/types/food';
import { foodService } from '@/lib/food-service';
import { ExperienceCard } from './ExperienceCard';
import { DiningEntryForm } from './DiningEntryForm';
import { ShareExperienceModal } from './ShareExperienceModal';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { haptics } from '@/lib/haptics';
import { toast } from 'sonner';
import { format } from 'date-fns';
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

export function DiningDashboard() {
  const [experiences, setExperiences] = useState<DiningExperience[]>(() => foodService.getExperiences());
  const [search, setSearch] = useState('');
  const [selectedCuisine, setSelectedCuisine] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isEntryFormOpen, setIsEntryFormOpen] = useState(false);
  const [editingExperience, setEditingExperience] = useState<DiningExperience | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [idToDelete, setIdToDelete] = useState<string | null>(null);
  
  // Advanced Shared Card Engine Integration state
  const [sharingExperience, setSharingExperience] = useState<DiningExperience | null>(null);
  const [viewMode, setViewMode] = useState<'overview' | 'highlights' | 'favorites' | 'timeline'>('overview');

  const handleRefresh = () => {
    setExperiences(foodService.getExperiences());
  };

  useEffect(() => {
    const handleUpdate = () => handleRefresh();
    window.addEventListener('dining-updated', handleUpdate);
    return () => window.removeEventListener('dining-updated', handleUpdate);
  }, []);

  const cuisines = useMemo(() => {
    const set = new Set(experiences.map(e => e.cuisine).filter(Boolean));
    return Array.from(set) as string[];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [experiences]);

  const filtered = useMemo(() => {
    return experiences.filter(e => {
      const matchSearch = e.restaurantName.toLowerCase().includes(search.toLowerCase()) || 
                          e.cuisine?.toLowerCase().includes(search.toLowerCase());
      const matchCuisine = !selectedCuisine || e.cuisine === selectedCuisine;
      
      if (viewMode === 'favorites') {
        const hasLiked = e.dishes.some(d => d.status === 'liked');
        return matchSearch && matchCuisine && hasLiked;
      }
      return matchSearch && matchCuisine;
    });
  }, [experiences, search, selectedCuisine, viewMode]);

  // Derive "Best Experience" dynamic highlight
  const bestExperience = useMemo(() => {
    if (experiences.length === 0) return null;
    return [...experiences].sort((a, b) => {
      const aLikes = a.dishes.filter(d => d.status === 'liked').length;
      const bLikes = b.dishes.filter(d => d.status === 'liked').length;
      return bLikes - aLikes;
    })[0];
  }, [experiences]);

  const handleDelete = (id: string) => {
    setIdToDelete(id);
    setShowDeleteDialog(true);
  };

  const confirmDelete = () => {
    if (!idToDelete) return;
    const updated = foodService.deleteExperience(idToDelete);
    setExperiences(updated);
    setExpandedId(null);
    setShowDeleteDialog(false);
    setIdToDelete(null);
    toast.success('Experience deleted');
    haptics.medium();
  };

  const triggerShare = (exp: DiningExperience) => {
    haptics.selection();
    setSharingExperience(exp);
  };

  return (
    <div className="space-y-8 pb-32">
      {/* Header & Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-5xl font-black tracking-tighter flex items-center gap-3">
            Food <span className="text-primary italic">& Dining</span>
            <Utensils className="h-7 w-7 text-amber-400" />
          </h1>
          <p className="text-muted-foreground/60 text-xs font-black uppercase tracking-[0.3em]">Track your meals and visits</p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-6 bg-card/30 backdrop-blur-3xl border border-white/5 p-4 rounded-[2.5rem] shadow-2xl">
            <div className="text-center">
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 mb-1">Total Visits</p>
              <div className="flex items-center justify-center gap-1.5">
                <div className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                <p className="text-2xl font-black tabular-nums">{experiences.length}</p>
              </div>
            </div>
            <div className="h-10 w-px bg-white/10" />
            <div className="text-center">
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-primary/60 mb-1">Items Logged</p>
              <div className="flex items-center justify-center gap-1.5">
                <div className="h-2 w-2 rounded-full bg-primary shadow-[0_0_10px_rgba(var(--primary-rgb),0.5)]" />
                <p className="text-2xl font-black tabular-nums">{experiences.reduce((s, e) => s + e.dishes.length, 0)}</p>
              </div>
            </div>
          </div>
          
          <Button 
            onClick={() => { haptics.selection(); setIsEntryFormOpen(true); }}
            className="h-16 w-16 sm:w-auto sm:px-8 rounded-[2rem] bg-white text-black hover:bg-white/90 shadow-glow font-black uppercase tracking-widest text-[11px] gap-2 transition-all active:scale-95"
          >
            <Plus className="h-6 w-6" />
            <span className="hidden sm:inline">Add Entry</span>
          </Button>
        </div>
      </div>

      {/* Primary Module Sub-Navigation Framework */}
      <div className="flex bg-card/20 backdrop-blur-xl border border-white/5 p-1.5 rounded-[2rem] gap-2 overflow-x-auto no-scrollbar shadow-lg">
        {[
          { id: 'overview', label: 'Overview', icon: Utensils },
          { id: 'highlights', label: 'Best Experiences', icon: Sparkles },
          { id: 'favorites', label: 'Favorite Meals', icon: Heart },
          { id: 'timeline', label: 'Timeline View', icon: History }
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = viewMode === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => { haptics.light(); setViewMode(tab.id as any); }}
              className={cn(
                "flex-1 min-w-[120px] py-3 rounded-[1.5rem] font-bold text-xs flex items-center justify-center gap-2 transition-all relative z-10",
                isActive ? "text-white shadow-sm" : "text-muted-foreground hover:text-white"
              )}
            >
              <Icon className={cn("h-4 w-4 shrink-0", isActive ? "text-primary" : "")} />
              <span>{tab.label}</span>
              {isActive && (
                <motion.div
                  layoutId="dining-nav-active"
                  className="absolute inset-0 bg-primary rounded-[1.5rem] -z-10"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Filters Overlay */}
      <div className="flex flex-col gap-4">
        <div className="relative group">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground/40 group-focus-within:text-primary transition-colors" />
          <Input 
            placeholder="Search restaurants, cuisines..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-16 pl-14 rounded-[2rem] bg-card/20 backdrop-blur-2xl border-white/5 shadow-2xl focus:border-primary/40 transition-all text-base placeholder:text-muted-foreground/30"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
          <Badge 
            onClick={() => setSelectedCuisine(null)}
            className={cn(
              "px-4 py-2 rounded-xl cursor-pointer font-bold text-[10px] uppercase tracking-widest transition-all",
              !selectedCuisine ? "bg-primary text-white" : "bg-card/40 text-muted-foreground hover:bg-muted/60"
            )}
          >
            All Cuisines
          </Badge>
          {cuisines.map(c => (
            <Badge 
              key={c}
              onClick={() => setSelectedCuisine(c)}
              className={cn(
                "px-4 py-2 rounded-xl cursor-pointer font-bold text-[10px] uppercase tracking-widest transition-all whitespace-nowrap",
                selectedCuisine === c ? "bg-primary text-white shadow-md" : "bg-card/40 text-muted-foreground hover:bg-muted/60"
              )}
            >
              {c}
            </Badge>
          ))}
        </div>
      </div>

      {/* Dynamic Render based on Active Viewport Mode */}
      {viewMode === 'highlights' && bestExperience && (
        <div className="space-y-6 animate-in fade-in-50 duration-700">
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-xl bg-amber-500/20 flex items-center justify-center">
                <Sparkles className="h-4.5 w-4.5 text-amber-500 animate-pulse" />
              </div>
              <h2 className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground/80">Highest Rated Highlight</h2>
            </div>
            <Badge variant="outline" className="border-amber-500/20 text-amber-500/80 bg-amber-500/5 text-[9px] font-black tracking-[0.1em] px-3">
              PREMIUM SELECTION
            </Badge>
          </div>

          <div className="relative rounded-[3.5rem] overflow-hidden bg-card/40 backdrop-blur-3xl border border-white/10 p-6 sm:p-10 shadow-3xl flex flex-col lg:flex-row gap-10 items-stretch">
            {/* Ambient Background Glows */}
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px] -z-10 pointer-events-none opacity-50" />
            <div className="absolute bottom-0 left-0 w-80 h-80 bg-amber-500/5 rounded-full blur-[100px] -z-10 pointer-events-none" />
            
            <div className="w-full lg:w-2/5 min-h-[320px] rounded-[2.5rem] overflow-hidden relative border border-white/10 shadow-2xl shrink-0 group">
              <img 
                src={bestExperience.dishes[0]?.images[0] || 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=1200&q=80'} 
                alt="" 
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000" 
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20" />
              
              <div className="absolute bottom-6 left-6 right-6 flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <Badge className="bg-primary text-white border-none text-[10px] font-black uppercase tracking-widest px-4 py-1.5 shadow-xl rounded-full">
                    Best Choice
                  </Badge>
                </div>
                <p className="text-[10px] text-white/60 font-bold uppercase tracking-[0.2em] backdrop-blur-sm bg-black/20 px-3 py-1 rounded-full w-fit">
                  Captured {format(new Date(bestExperience.visitDate), 'MMMM yyyy')}
                </p>
              </div>
            </div>

            <div className="flex-1 flex flex-col justify-center space-y-6 text-left">
              <div className="space-y-3">
                <div className="flex items-center gap-3 text-[10px] font-black text-primary uppercase tracking-[0.2em] opacity-80">
                  <div className="h-px w-8 bg-primary/30" />
                  Premium Experience
                </div>

                <h3 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tighter leading-[0.9] text-foreground">
                  {bestExperience.restaurantName}
                </h3>
                
                <div className="flex items-center gap-4 text-xs font-bold text-muted-foreground/60 uppercase tracking-widest pt-1">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-primary/60" /> 
                    {format(new Date(bestExperience.visitDate), 'MMMM d, yyyy')}
                  </div>
                  {bestExperience.cuisine && (
                    <>
                      <div className="h-1.5 w-1.5 rounded-full bg-white/10" />
                      <div className="flex items-center gap-2">
                        <ChefHat className="h-4 w-4 text-primary/60" /> 
                        {bestExperience.cuisine}
                      </div>
                    </>
                  )}
                </div>
              </div>
              
              <div className="relative">
                <div className="absolute -left-4 top-0 bottom-0 w-1 bg-gradient-to-b from-primary/40 to-transparent rounded-full" />
                <p className="text-base sm:text-lg text-muted-foreground/90 leading-relaxed font-medium italic pl-4">
                  "{bestExperience.overallNotes || `Outstanding encounter with sublime offerings. An ambient experience standard in the ${bestExperience.cuisine || 'dining'} landscape.`}"
                </p>
              </div>

              <div className="flex flex-wrap gap-2 pt-2">
                {bestExperience.dishes.map((d, i) => (
                  <div key={i} className="flex items-center gap-2 bg-white/5 border border-white/10 px-4 py-2 rounded-2xl shadow-sm transition-all hover:bg-white/10 hover:scale-105 cursor-default">
                    <Star className="h-3 w-3 text-amber-400 fill-amber-400" />
                    <span className="text-[11px] font-black uppercase tracking-widest">
                      {d.name}
                    </span>
                  </div>
                ))}
              </div>

              <div className="pt-6 flex flex-col sm:flex-row gap-4">
                <Button 
                  onClick={() => triggerShare(bestExperience)}
                  className="h-14 sm:h-16 px-10 rounded-[2rem] bg-primary text-white hover:opacity-90 font-black uppercase tracking-widest text-[11px] gap-3 shadow-glow border-none transition-all active:scale-95"
                >
                  <Share2 className="h-5 w-5" /> Share Cinematic Story Card
                </Button>
                
                <Button 
                  variant="outline"
                  onClick={() => setExpandedId(bestExperience.id)}
                  className="h-14 sm:h-16 px-8 rounded-[2rem] border-white/10 bg-white/5 text-white hover:bg-white/10 font-black uppercase tracking-widest text-[11px] transition-all"
                >
                  View Full Details
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {viewMode === 'timeline' ? (
        <div className="relative pl-6 sm:pl-10 space-y-10 py-6 before:absolute before:left-2 sm:before:left-4 before:top-2 before:bottom-2 before:w-px before:bg-gradient-to-b before:from-primary before:via-white/10 before:to-transparent animate-in fade-in-50 duration-700">
          {filtered.map((exp, idx) => (
            <div key={exp.id} className="relative group">
              {/* Timeline Indicator Node */}
              <div className="absolute -left-[24px] sm:-left-[38px] top-6 h-5 w-5 rounded-full bg-background border-2 border-primary/40 group-hover:scale-125 group-hover:bg-primary group-hover:border-primary transition-all duration-300 shadow-glow" />
              
              <div className="bg-card/30 backdrop-blur-2xl border border-white/5 rounded-[2.5rem] p-8 shadow-xl hover:border-primary/20 transition-all duration-500 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 group-hover:shadow-primary/5">
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/5">
                      <Calendar className="h-3 w-3 text-primary/60" />
                      <span className="text-[10px] font-black text-primary uppercase tracking-widest">
                        {format(new Date(exp.visitDate), 'MMM d, yyyy')}
                      </span>
                    </div>
                    {exp.cuisine && (
                      <span className="text-[10px] font-black text-muted-foreground/60 uppercase tracking-[0.2em]">{exp.cuisine}</span>
                    )}
                  </div>
                  
                  <h3 className="text-2xl font-black tracking-tight text-foreground group-hover:text-primary transition-colors">{exp.restaurantName}</h3>
                  
                  <div className="flex items-center gap-5 pt-1">
                    <div className="flex items-center gap-2">
                      <Utensils className="h-3.5 w-3.5 text-muted-foreground/40" />
                      <span className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest">
                        {exp.dishes.length} Items
                      </span>
                    </div>
                    {exp.dishes.some(d => d.status === 'liked') && (
                      <div className="flex items-center gap-2">
                        <Star className="h-3.5 w-3.5 text-emerald-400/60 fill-emerald-400/20" />
                        <span className="text-[10px] font-bold text-emerald-400/60 uppercase tracking-widest">
                          {exp.dishes.filter(d => d.status === 'liked').length} Favorites
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0 w-full sm:w-auto">
                  <Button 
                    variant="outline"
                    onClick={() => { setExpandedId(exp.id); }}
                    className="flex-1 sm:flex-none h-12 rounded-2xl text-[10px] font-black uppercase tracking-widest bg-white/5 border-white/10 hover:bg-white/10 transition-all"
                  >
                    Details
                  </Button>
                  <Button 
                    onClick={() => triggerShare(exp)}
                    className="flex-1 sm:flex-none h-12 rounded-2xl bg-primary text-white text-[10px] font-black uppercase tracking-widest gap-2 shadow-lg border-none hover:opacity-90 transition-all active:scale-95"
                  >
                    <Share2 className="h-4 w-4" /> Share
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Standard Views Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <AnimatePresence mode="popLayout">
            {filtered.map((exp) => (
              <ExperienceCard 
                key={exp.id} 
                experience={exp} 
                onClose={() => setExpandedId(exp.id)} // View full drawer
                onShare={() => triggerShare(exp)}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      {filtered.length === 0 && (
        <div className="py-24 flex flex-col items-center justify-center text-center space-y-4">
          <div className="h-20 w-20 rounded-[2.5rem] bg-muted/30 flex items-center justify-center">
            <ChefHat className="h-10 w-10 text-muted-foreground/30" />
          </div>
          <div>
            <h3 className="text-xl font-bold">No matching experiences</h3>
            <p className="text-muted-foreground text-sm">Try broadening your search parameters or toggle views.</p>
          </div>
          <Button 
            variant="outline" 
            onClick={() => setIsEntryFormOpen(true)}
            className="rounded-xl border-primary/20 text-primary hover:bg-primary/5"
          >
            Log New Visit
          </Button>
        </div>
      )}

      {/* Expanded View Drawer Modal */}
      <AnimatePresence>
        {expandedId && (
          <ExperienceCard 
            experience={experiences.find(e => e.id === expandedId)!} 
            isExpanded={true}
            onClose={() => setExpandedId(null)}
            onEdit={() => {
              setEditingExperience(experiences.find(e => e.id === expandedId)!);
              setExpandedId(null);
            }}
            onDelete={() => handleDelete(expandedId)}
            onShare={() => {
              const exp = experiences.find(e => e.id === expandedId);
              if (exp) {
                // Launch premium visual dialog instead of plain view-shot
                triggerShare(exp);
              }
            }}
          />
        )}
      </AnimatePresence>

      {/* Advanced Visual Card Generator & Social Customization Portal */}
      <ShareExperienceModal 
        experience={sharingExperience}
        open={!!sharingExperience}
        onOpenChange={(open) => !open && setSharingExperience(null)}
      />

      <DiningEntryForm 
        open={isEntryFormOpen} 
        onOpenChange={setIsEntryFormOpen}
        onSubmit={handleRefresh}
      />

      <DiningEntryForm 
        open={!!editingExperience} 
        onOpenChange={(open) => !open && setEditingExperience(null)}
        initialData={editingExperience || undefined}
        isEdit={true}
        onSubmit={handleRefresh}
      />

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="rounded-[2.5rem] border-white/10 bg-black/80 backdrop-blur-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-2xl font-black tracking-tight text-white">
              Delete "{experiences.find(e => e.id === idToDelete)?.restaurantName || 'Experience'}"?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground font-medium">
              Are you sure you want to remove this entry? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-3">
            <AlertDialogCancel className="rounded-2xl border-white/10 bg-white/5 text-white hover:bg-white/10 hover:text-white">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete}
              className="rounded-2xl bg-destructive text-white hover:bg-destructive/90 font-bold"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
