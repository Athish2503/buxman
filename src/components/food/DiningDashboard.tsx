import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, Search, Filter, Utensils, 
  ChefHat, Map, Sparkles, TrendingUp,
  History, Calendar
} from 'lucide-react';
import { DiningExperience } from '@/types/food';
import { foodService } from '@/lib/food-service';
import { ExperienceCard } from './ExperienceCard';
import { DiningEntryForm } from './DiningEntryForm';
import { shareService } from '@/lib/share-service';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { haptics } from '@/lib/haptics';
import { toast } from 'sonner';
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
  }, [experiences]);

  const filtered = useMemo(() => {
    return experiences.filter(e => {
      const matchSearch = e.restaurantName.toLowerCase().includes(search.toLowerCase()) || 
                          e.cuisine?.toLowerCase().includes(search.toLowerCase());
      const matchCuisine = !selectedCuisine || e.cuisine === selectedCuisine;
      return matchSearch && matchCuisine;
    });
  }, [experiences, search, selectedCuisine]);



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

      {/* Filters */}
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

      {/* Experiences Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <AnimatePresence mode="popLayout">
          {filtered.map((exp) => (
            <ExperienceCard 
              key={exp.id} 
              experience={exp} 
              onClose={() => setExpandedId(exp.id)} // This acts as select/expand in dashboard
            />
          ))}
        </AnimatePresence>
      </div>

      {filtered.length === 0 && (
        <div className="py-24 flex flex-col items-center justify-center text-center space-y-4">
          <div className="h-20 w-20 rounded-[2.5rem] bg-muted/30 flex items-center justify-center">
            <ChefHat className="h-10 w-10 text-muted-foreground/30" />
          </div>
          <div>
            <h3 className="text-xl font-bold">No entries</h3>
            <p className="text-muted-foreground text-sm">Add a dining entry to get started.</p>
          </div>
          <Button 
            variant="outline" 
            onClick={() => setIsEntryFormOpen(true)}
            className="rounded-xl border-primary/20 text-primary hover:bg-primary/5"
          >
            Add First Entry
          </Button>
        </div>
      )}

      {/* Expanded View Modal */}
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
              if (exp) shareService.shareAsImage(`exp-card-${exp.id}`, exp.restaurantName.replace(/\s+/g, '_'));
            }}
          />
        )}
      </AnimatePresence>

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
