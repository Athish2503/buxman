import { useState, useMemo, forwardRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MapPin, Calendar, Star, ThumbsUp, ThumbsDown, 
  Share2, Download, Trash2, Edit, Utensils,
  ChevronRight, ArrowLeft, Camera, Quote, Copy, Check, FileText
} from 'lucide-react';
import { DiningExperience, Dish } from '@/types/food';
import { FormattedText } from './FormattedText';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { haptics } from '@/lib/haptics';
import { toast } from 'sonner';
import { useIsMobile } from '@/hooks/useIsMobile';

interface ExperienceCardProps {
  experience: DiningExperience;
  onShare?: () => void;
  onExport?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onClose?: () => void;
  isExpanded?: boolean;
}

export const ExperienceCard = forwardRef<HTMLDivElement, ExperienceCardProps>(({ 
  experience, 
  onShare, 
  onExport, 
  onEdit, 
  onDelete, 
  onClose,
  isExpanded = false 
}, ref) => {
  const [copied, setCopied] = useState(false);
  const isMobile = useIsMobile();
  const { restaurantName, visitDate, cuisine, priceRange, location, dishes } = experience;
  
  const likedDishes = dishes.filter(d => d.status === 'liked');
  const avoidedDishes = dishes.filter(d => d.status === 'not-recommended');
  
  const allImages = dishes.flatMap(d => d.images);
  const heroImage = allImages[0] || null;

  const handleCopyText = () => {
    const dishList = dishes.map(d => {
      const statusIcon = d.status === 'liked' ? '✅' : d.status === 'not-recommended' ? '❌' : '⏺️';
      const ratingStars = d.rating ? '⭐'.repeat(d.rating) : '';
      return `${statusIcon} *${d.name}* ${ratingStars}\n${d.notes.replace(/[*#=]/g, '')}`;
    }).join('\n\n');

    const text = `🍽️ *${restaurantName}*\n📅 ${format(new Date(visitDate), 'MMM d, yyyy')}\n📍 ${location?.address || 'N/A'}\n\n*Items:*\n${dishList}\n\n_Logged via Buxman_`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success('Experience copied to clipboard!');
    haptics.success();
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isExpanded) {
    return (
      <motion.div
        layoutId={`card-${experience.id}`}
        onClick={() => { haptics.selection(); onClose?.(); }}
        className="relative group min-h-[144px] rounded-[2.5rem] overflow-hidden border border-white/10 shadow-2xl cursor-pointer bg-card/30 backdrop-blur-md transition-all hover:border-primary/30 hover:shadow-primary/5 active:scale-[0.98]"
      >
        {/* Subtle Background Image with Gradient Overlay */}
        {heroImage ? (
          <div className="absolute inset-0 z-0">
            <img src={heroImage} alt="" className="h-full w-full object-cover opacity-20 group-hover:scale-110 transition-transform duration-1000" />
            <div className="absolute inset-0 bg-gradient-to-br from-background/90 via-background/40 to-transparent" />
          </div>
        ) : (
          <div className="absolute inset-0 z-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5" />
        )}
        
        <div className="relative z-10 h-full flex items-center p-5 gap-5">
          {/* Thumbnail with Premium Framing */}
          <div className="relative h-24 w-24 shrink-0 group-hover:scale-105 transition-transform duration-500">
            <div className="absolute -inset-1.5 bg-gradient-to-br from-primary/20 to-transparent rounded-[1.8rem] blur-sm opacity-0 group-hover:opacity-100 transition-opacity" />
            {heroImage ? (
              <div className="h-full w-full rounded-2xl overflow-hidden shadow-xl border border-white/10 relative z-10">
                <img src={heroImage} alt="" className="h-full w-full object-cover" />
              </div>
            ) : (
              <div className="h-full w-full rounded-2xl bg-muted/30 flex items-center justify-center border border-white/5 relative z-10">
                <Utensils className="h-8 w-8 text-primary/30" />
              </div>
            )}
            <Badge className="absolute -bottom-2 -right-1 bg-primary text-white border-none text-[8px] font-black uppercase tracking-widest px-2.5 py-1 shadow-lg z-20 rounded-full">
              {cuisine || 'Dining'}
            </Badge>
          </div>
          
          <div className="flex-1 min-w-0 flex flex-col justify-center py-1">
             <div className="flex items-center gap-3 mb-1.5">
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-white/5 border border-white/5">
                  <Calendar className="h-2.5 w-2.5 text-muted-foreground/60" />
                  <span className="text-[9px] font-black text-muted-foreground/80 uppercase tracking-widest">
                    {format(new Date(visitDate), 'MMM d')}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  {[...Array(4)].map((_, i) => (
                    <span 
                      key={i} 
                      className={cn(
                        "text-[10px] font-black leading-none",
                        i < (priceRange === 'budget' ? 1 : priceRange === 'mid' ? 2 : priceRange === 'premium' ? 3 : 4) 
                          ? "text-primary" 
                          : "text-muted-foreground/20"
                      )}
                    >
                      ₹
                    </span>
                  ))}
                </div>
             </div>
             
             <h3 className="text-2xl font-black truncate tracking-tighter text-foreground group-hover:text-primary transition-colors duration-300">
               {restaurantName}
             </h3>
             
             <div className="flex items-center gap-4 mt-2">
                <div className="flex items-center gap-1.5">
                  <div className="h-5 w-5 rounded-lg bg-white/5 flex items-center justify-center">
                    <Utensils className="h-3 w-3 text-muted-foreground/40" />
                  </div>
                  <span className="text-[10px] font-black text-muted-foreground/60 uppercase tracking-[0.1em]">
                    {dishes.length} Items
                  </span>
                </div>
                
                {likedDishes.length > 0 && (
                  <div className="flex items-center gap-1.5">
                    <div className="h-5 w-5 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                      <Star className="h-3 w-3 text-emerald-400 fill-emerald-400" />
                    </div>
                    <span className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.1em]">
                      {likedDishes.length} Favorites
                    </span>
                  </div>
                )}
             </div>
          </div>
          
          <div className="flex items-center gap-2 shrink-0">
            <button 
              onClick={(e) => { e.stopPropagation(); onShare?.(); }}
              className="h-11 w-11 rounded-[1.2rem] bg-white/5 hover:bg-primary/20 text-muted-foreground hover:text-primary flex items-center justify-center transition-all shadow-sm border border-white/5 active:scale-90"
              title="Share Card"
            >
              <Share2 className="h-4.5 w-4.5" />
            </button>
            <div className="h-11 w-11 rounded-[1.2rem] bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all duration-300 shadow-inner group-hover:shadow-primary/30">
               <ChevronRight className="h-5 w-5" />
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  const cardContent = (
    <div className="flex flex-col h-full">
      {/* Hero Section */}
      <div className={cn("relative shrink-0 h-[45vh] sm:h-[50vh]")}>
        {heroImage ? (
          <img src={heroImage} alt={restaurantName} className="h-full w-full object-cover" />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-primary/30 to-secondary/30 flex items-center justify-center">
            <Utensils className="h-20 w-20 text-white/40" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-black/60" />
        
        {/* Floating Headers */}
        <div className="absolute top-8 left-8 right-8 flex justify-between items-start z-10">
          <button 
            onClick={(e) => { e.stopPropagation(); onClose?.(); }}
            className="h-12 w-12 rounded-2xl bg-black/40 backdrop-blur-xl border border-white/10 flex items-center justify-center text-white active:scale-90 transition-all shadow-2xl hover:bg-black/60"
          >
            <ArrowLeft className="h-6 w-6" />
          </button>
          
          <div className="flex gap-3">
            <button 
              onClick={(e) => { e.stopPropagation(); onShare?.(); }}
              className="h-12 w-12 rounded-2xl bg-black/40 backdrop-blur-xl border border-white/10 flex items-center justify-center text-white active:scale-90 transition-all shadow-2xl hover:bg-black/60"
            >
              <Share2 className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Restaurant Info Over Hero */}
        <div className="absolute bottom-10 left-10 right-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.5 }}
          >
            <div className="flex items-center gap-3 mb-4">
              <Badge className="bg-primary text-white border-none text-[10px] font-black uppercase tracking-widest px-4 py-1.5 shadow-glow rounded-full">
                {cuisine || 'Dining'}
              </Badge>
              <div className="px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/10 text-white text-[10px] font-black uppercase tracking-widest">
                {priceRange === 'budget' ? '₹' : priceRange === 'mid' ? '₹₹' : priceRange === 'premium' ? '₹₹₹' : '₹₹₹₹'}
              </div>
            </div>
            <h2 className="text-5xl sm:text-6xl font-black tracking-tighter text-white leading-[0.85]">
              {restaurantName}
            </h2>
            <div className="flex flex-wrap items-center gap-5 mt-5 text-white/80 text-[11px] font-black uppercase tracking-widest">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" />
                {format(new Date(visitDate), 'MMMM d, yyyy')}
              </div>
              {location?.address && (
                <>
                  <div className="h-1.5 w-1.5 rounded-full bg-white/30" />
                  <div className="flex items-center gap-2 max-w-[300px] truncate">
                    <MapPin className="h-4 w-4 text-rose-400" />
                    {location.address}
                  </div>
                </>
              )}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Details Section */}
      <div className="px-8 py-10 space-y-12 flex-1 pb-40">
        {/* Dishes Highlight */}
        {dishes.length > 0 && (
          <div className="space-y-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Utensils className="h-5 w-5 text-primary" />
                </div>
                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground/60">Ordered Items</h3>
              </div>
              <div className="h-px flex-1 bg-border/20 mx-6" />
              <Badge variant="outline" className="rounded-full border-primary/20 text-primary font-black uppercase text-[9px] px-3 py-1">
                {dishes.length} Items
              </Badge>
            </div>

            <div className="grid grid-cols-1 gap-6">
              {dishes.map((dish, idx) => (
                <motion.div 
                  key={dish.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 + idx * 0.1 }}
                  className="group relative bg-card/40 backdrop-blur-3xl border border-white/5 rounded-[2.5rem] p-6 shadow-xl hover:border-primary/20 transition-all duration-500 overflow-hidden"
                >
                  <div className="flex gap-6">
                    {dish.images[0] && (
                      <div className="h-24 w-24 rounded-2xl overflow-hidden shrink-0 shadow-2xl border border-white/10 group-hover:scale-105 transition-transform duration-500">
                        <img src={dish.images[0]} alt={dish.name} className="h-full w-full object-cover" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0 flex flex-col justify-center">
                      <div className="flex items-center justify-between gap-3 mb-2">
                        <h4 className="font-black text-xl tracking-tight truncate group-hover:text-primary transition-colors">{dish.name}</h4>
                        <Badge className={cn(
                          "shrink-0 text-[8px] font-black uppercase tracking-widest border-none px-3 py-1 rounded-full shadow-sm",
                          dish.status === 'liked' ? "bg-emerald-500 text-white" : 
                          dish.status === 'not-recommended' ? "bg-rose-500 text-white" : 
                          "bg-muted text-muted-foreground"
                        )}>
                          {dish.status === 'liked' ? 'Must Try' : dish.status === 'not-recommended' ? 'Avoid' : 'Neutral'}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center gap-3 mb-3">
                        {dish.rating && (
                          <div className="flex gap-0.5">
                            {[1,2,3,4,5].map(s => (
                              <Star key={s} className={cn("h-3.5 w-3.5", s <= dish.rating! ? "text-amber-400 fill-amber-400" : "text-muted-foreground/10")} />
                            ))}
                          </div>
                        )}
                      </div>

                      {dish.notes && (
                        <div className="relative mt-2">
                          <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary/20 rounded-full" />
                          <div className="pl-4">
                             <FormattedText text={dish.notes} className="text-sm leading-relaxed text-muted-foreground/90 font-medium" />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Expanded Images for Dish */}
                  {dish.images.length > 1 && (
                    <div className="flex gap-3 mt-6 overflow-x-auto no-scrollbar pb-2">
                      {dish.images.slice(1).map((img, i) => (
                        <div key={i} className="h-24 w-32 shrink-0 rounded-xl overflow-hidden border border-white/10 shadow-lg">
                          <img src={img} className="h-full w-full object-cover" />
                        </div>
                      ))}
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Integrated Actions for Expanded View */}
        <div className="fixed bottom-0 left-0 right-0 p-8 bg-gradient-to-t from-background via-background/95 to-transparent z-50">
          <div className="max-w-3xl mx-auto flex gap-4">
            <Button 
              onClick={(e) => { e.stopPropagation(); onEdit?.(); }}
              className="flex-1 h-16 rounded-3xl bg-primary text-white hover:opacity-95 font-black uppercase tracking-widest text-[11px] shadow-glow gap-3 border-none transition-all active:scale-95"
            >
              <Edit className="h-5 w-5" /> Edit Experience
            </Button>
            
            <Button 
              variant="outline"
              onClick={(e) => { e.stopPropagation(); handleCopyText(); }}
              className="h-16 w-16 rounded-3xl bg-card/80 backdrop-blur-md border-white/10 text-white hover:bg-white/5 shrink-0 shadow-2xl transition-all active:scale-90"
            >
              {copied ? <Check className="h-6 w-6 text-emerald-400" /> : <Copy className="h-6 w-6" />}
            </Button>

            <Button 
              variant="outline"
              onClick={(e) => { e.stopPropagation(); onDelete?.(); }}
              className="h-16 w-16 rounded-3xl bg-rose-500/10 border-rose-500/20 text-rose-400 hover:bg-rose-500 hover:text-white transition-all shrink-0 shadow-2xl active:scale-90"
            >
              <Trash2 className="h-6 w-6" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );

  // Expanded View via Portal
  const expandedOverlay = (
    <div className="fixed inset-0 z-40 flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/95 backdrop-blur-2xl"
        onClick={onClose}
      />
      <motion.div
        layoutId={`card-${experience.id}`}
        drag={isMobile ? "y" : false}
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={isMobile ? { top: 0, bottom: 0.8 } : 0}
        onDragEnd={(_, info) => {
          if (info.offset.y > 150 || info.velocity.y > 500) {
            haptics.light();
            onClose?.();
          }
        }}
        className="relative w-full h-full sm:h-[94vh] sm:max-w-3xl sm:rounded-[3.5rem] bg-background overflow-hidden sm:border sm:border-white/10 shadow-[0_0_100px_rgba(0,0,0,0.5)] z-10 flex flex-col"
      >
        {isMobile && (
          <div className="flex justify-center pt-5 pb-2 shrink-0 bg-transparent absolute top-0 left-0 right-0 z-30 pointer-events-auto cursor-grab active:cursor-grabbing">
            <div className="h-1.5 w-14 rounded-full bg-white/20 backdrop-blur-md" />
          </div>
        )}
        <div className={cn("flex-1 overflow-y-auto no-scrollbar", isMobile ? "pt-6" : "")}>
          {cardContent}
        </div>
      </motion.div>
    </div>
  );

  return createPortal(expandedOverlay, document.body);
});

ExperienceCard.displayName = "ExperienceCard";
