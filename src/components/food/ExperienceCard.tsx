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
        className="relative group h-36 rounded-[2rem] overflow-hidden border border-border/40 shadow-lg cursor-pointer bg-card/20 backdrop-blur-sm"
      >
        {/* Subtle Background */}
        {heroImage ? (
          <img src={heroImage} alt="" className="absolute inset-0 h-full w-full object-cover opacity-20 group-hover:scale-110 transition-transform duration-700" />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-secondary/5" />
        )}
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/90 to-transparent" />
        
        <div className="relative h-full flex items-center p-5 gap-5">
          {/* Thumbnail with Badge Overlay */}
          <div className="relative h-24 w-24 shrink-0">
            {heroImage ? (
              <div className="h-full w-full rounded-2xl overflow-hidden shadow-2xl border border-white/10">
                <img src={heroImage} alt="" className="h-full w-full object-cover" />
              </div>
            ) : (
              <div className="h-full w-full rounded-2xl bg-muted/50 flex items-center justify-center border border-white/5">
                <Utensils className="h-8 w-8 opacity-20" />
              </div>
            )}
            <Badge className="absolute -bottom-2 -right-2 bg-primary text-white border-none text-[8px] font-black uppercase tracking-widest px-2 shadow-lg">
              {cuisine || 'Log'}
            </Badge>
          </div>
          
          <div className="flex-1 min-w-0 flex flex-col justify-center">
             <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {format(new Date(visitDate), 'MMM d')}
                </span>
                <div className="h-1 w-1 rounded-full bg-border" />
                <span className="text-[10px] font-black text-primary uppercase tracking-widest">
                  {priceRange === 'budget' ? '₹' : priceRange === 'mid' ? '₹₹' : priceRange === 'premium' ? '₹₹₹' : '₹₹₹₹'}
                </span>
             </div>
             
             <h3 className="text-xl font-black truncate tracking-tight mb-1">{restaurantName}</h3>
             
             <div className="flex items-center gap-3">
                <div className="flex items-center gap-1 text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest">
                  <Utensils className="h-3 w-3" />
                  {dishes.length} Items
                </div>
                {likedDishes.length > 0 && (
                  <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-400 uppercase tracking-widest">
                    <Star className="h-3 w-3 fill-emerald-400" />
                    {likedDishes.length} Must Try
                  </div>
                )}
             </div>
          </div>
          
          <div className="flex items-center gap-1.5 shrink-0">
            <button 
              onClick={(e) => { e.stopPropagation(); onShare?.(); }}
              className="h-10 w-10 rounded-2xl bg-muted/20 hover:bg-primary/20 text-muted-foreground hover:text-primary flex items-center justify-center transition-all shadow-sm active:scale-95"
              title="Share cinematic layout"
            >
              <Share2 className="h-4.5 w-4.5" />
            </button>
            <div className="h-10 w-10 rounded-2xl bg-muted/30 flex items-center justify-center text-muted-foreground group-hover:bg-primary group-hover:text-white group-hover:scale-110 transition-all">
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
      <div className={cn("relative shrink-0", isExpanded ? "h-[45vh] sm:h-[50vh]" : "h-64")}>
        {heroImage ? (
          <img src={heroImage} alt={restaurantName} className="h-full w-full object-cover" />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-primary/30 to-secondary/30 flex items-center justify-center">
            <Utensils className="h-16 w-16 text-white/40" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-black/40" />
        
        {/* Floating Headers */}
        <div className="absolute top-6 left-6 right-6 flex justify-between items-start z-10">
          <button 
            onClick={(e) => { e.stopPropagation(); onClose?.(); }}
            className="h-10 w-10 rounded-2xl bg-black/40 backdrop-blur-xl border border-white/10 flex items-center justify-center text-white active:scale-90 transition-all shadow-xl"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          
          <div className="flex gap-2">
            <button 
              onClick={(e) => { e.stopPropagation(); onShare?.(); }}
              className="h-10 w-10 rounded-2xl bg-black/40 backdrop-blur-xl border border-white/10 flex items-center justify-center text-white active:scale-90 transition-all shadow-xl"
            >
              <Share2 className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Restaurant Info Over Hero */}
        <div className="absolute bottom-8 left-8 right-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.4 }}
          >
            <div className="flex items-center gap-2 mb-2">
              <Badge className="bg-primary/90 backdrop-blur-md text-white border-none text-[8px] font-black uppercase tracking-widest px-2.5 py-1">
                {cuisine || 'Dining'}
              </Badge>
              <div className="px-2 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/10 text-white text-[8px] font-black uppercase tracking-widest">
                {priceRange === 'budget' ? '₹' : priceRange === 'mid' ? '₹₹' : priceRange === 'premium' ? '₹₹₹' : '₹₹₹₹'}
              </div>
            </div>
            <h2 className={cn(
              "font-black tracking-tight text-white leading-tight",
              isExpanded ? "text-4xl sm:text-5xl" : "text-2xl"
            )}>
              {restaurantName}
            </h2>
            <div className="flex flex-wrap items-center gap-3 mt-3 text-white/80 text-[10px] font-bold uppercase tracking-widest">
              <div className="flex items-center gap-1.5">
                <Calendar className="h-3 w-3 text-primary-light" />
                {format(new Date(visitDate), 'MMM d, yyyy')}
              </div>
              {location?.address && (
                <>
                  <div className="h-1 w-1 rounded-full bg-white/30" />
                  <div className="flex items-center gap-1.5 max-w-[200px] truncate">
                    <MapPin className="h-3 w-3 text-rose-400" />
                    {location.address}
                  </div>
                </>
              )}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Details Section */}
      <div className={cn("px-6 py-8 space-y-10 flex-1", isExpanded ? "pb-32" : "")}>
        {/* Dishes Highlight */}
        {dishes.length > 0 && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">Items Ordered</h3>
              <div className="h-px flex-1 bg-border/20 mx-4" />
              <div className="flex items-center gap-1.5 text-[10px] font-black text-primary uppercase tracking-widest">
                <Utensils className="h-3 w-3" />
                {dishes.length} Items
              </div>
            </div>

            <div className="space-y-4">
              {dishes.map((dish, idx) => (
                <motion.div 
                  key={dish.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 + idx * 0.05 }}
                  className="group relative bg-card/40 backdrop-blur-xl border border-white/5 rounded-[1.5rem] p-5 overflow-hidden shadow-lg hover:border-primary/20 transition-all"
                >
                  <div className="flex gap-4">
                    {dish.images[0] && (
                      <div className="h-16 w-16 rounded-xl overflow-hidden shrink-0 shadow-md border border-white/5">
                        <img src={dish.images[0]} alt={dish.name} className="h-full w-full object-cover" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h4 className="font-bold text-sm tracking-tight truncate">{dish.name}</h4>
                        <Badge className={cn(
                          "shrink-0 text-[7px] font-black uppercase tracking-widest border-none",
                          dish.status === 'liked' ? "bg-emerald-500/20 text-emerald-400" : 
                          dish.status === 'not-recommended' ? "bg-rose-500/20 text-rose-400" : 
                          "bg-muted/40 text-muted-foreground"
                        )}>
                          {dish.status === 'liked' ? 'Must Try' : dish.status === 'not-recommended' ? 'Avoid' : 'Neutral'}
                        </Badge>
                      </div>
                      
                      {dish.rating && (
                        <div className="flex gap-0.5 mb-2">
                          {[1,2,3,4,5].map(s => (
                            <Star key={s} className={cn("h-2.5 w-2.5", s <= dish.rating! ? "text-amber-400 fill-amber-400" : "text-muted-foreground/10")} />
                          ))}
                        </div>
                      )}

                      {dish.notes && (
                        <div className="relative">
                          <Quote className="absolute -left-1 -top-1 h-3 w-3 text-primary/20" />
                          <div className="pl-3">
                             <FormattedText text={dish.notes} className="text-[11px] leading-relaxed text-muted-foreground/80 line-clamp-3" />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Expanded Images for Dish */}
                  {isExpanded && dish.images.length > 1 && (
                    <div className="flex gap-2 mt-4 overflow-x-auto no-scrollbar pb-1">
                      {dish.images.slice(1).map((img, i) => (
                        <img key={i} src={img} className="h-20 w-28 object-cover rounded-xl shadow-sm border border-white/5" />
                      ))}
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Integrated Actions for Expanded View */}
        {isExpanded && (
          <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-background via-background/95 to-transparent z-50">
            <div className="max-w-2xl mx-auto flex gap-3">
              <Button 
                onClick={(e) => { e.stopPropagation(); onEdit?.(); }}
                className="flex-1 h-14 rounded-2xl bg-primary text-white hover:opacity-90 font-black uppercase tracking-widest text-[10px] shadow-glow gap-2 border-none"
              >
                <Edit className="h-4.5 w-4.5" /> Edit Experience
              </Button>
              
              <Button 
                variant="outline"
                onClick={(e) => { e.stopPropagation(); handleCopyText(); }}
                className="h-14 w-14 rounded-2xl bg-card border-white/10 text-white hover:bg-white/5 shrink-0 shadow-lg"
              >
                {copied ? <Check className="h-5 w-5 text-emerald-400" /> : <Copy className="h-5 w-5" />}
              </Button>

              <Button 
                variant="outline"
                onClick={(e) => { e.stopPropagation(); onDelete?.(); }}
                className="h-14 w-14 rounded-2xl bg-rose-500/10 border-rose-500/20 text-rose-400 hover:bg-rose-500 hover:text-white transition-all shrink-0 shadow-lg"
              >
                <Trash2 className="h-5 w-5" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  if (!isExpanded) {
    return (
      <motion.div
        layoutId={`card-${experience.id}`}
        onClick={() => { haptics.selection(); onClose?.(); }}
        className="relative group h-36 rounded-[2rem] overflow-hidden border border-border/40 shadow-lg cursor-pointer bg-card/20 backdrop-blur-sm"
      >
        {/* Subtle Background */}
        {heroImage ? (
          <img src={heroImage} alt="" className="absolute inset-0 h-full w-full object-cover opacity-20 group-hover:scale-110 transition-transform duration-700" />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-secondary/5" />
        )}
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/90 to-transparent" />
        
        <div className="relative h-full flex items-center p-5 gap-5">
          {/* Thumbnail with Badge Overlay */}
          <div className="relative h-24 w-24 shrink-0">
            {heroImage ? (
              <div className="h-full w-full rounded-2xl overflow-hidden shadow-2xl border border-white/10">
                <img src={heroImage} alt="" className="h-full w-full object-cover" />
              </div>
            ) : (
              <div className="h-full w-full rounded-2xl bg-muted/50 flex items-center justify-center border border-white/5">
                <Utensils className="h-8 w-8 opacity-20" />
              </div>
            )}
            <Badge className="absolute -bottom-2 -right-2 bg-primary text-white border-none text-[8px] font-black uppercase tracking-widest px-2 shadow-lg">
              {cuisine || 'Log'}
            </Badge>
          </div>
          
          <div className="flex-1 min-w-0 flex flex-col justify-center">
             <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {format(new Date(visitDate), 'MMM d')}
                </span>
                <div className="h-1 w-1 rounded-full bg-border" />
                <span className="text-[10px] font-black text-primary uppercase tracking-widest">
                  {priceRange === 'budget' ? '₹' : priceRange === 'mid' ? '₹₹' : priceRange === 'premium' ? '₹₹₹' : '₹₹₹₹'}
                </span>
             </div>
             
             <h3 className="text-xl font-black truncate tracking-tight mb-1">{restaurantName}</h3>
             
             <div className="flex items-center gap-3">
                <div className="flex items-center gap-1 text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest">
                  <Utensils className="h-3 w-3" />
                  {dishes.length} Items
                </div>
                {likedDishes.length > 0 && (
                  <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-400 uppercase tracking-widest">
                    <Star className="h-3 w-3 fill-emerald-400" />
                    {likedDishes.length} Must Try
                  </div>
                )}
             </div>
          </div>
          
          <div className="flex items-center gap-1.5 shrink-0">
            <button 
              onClick={(e) => { e.stopPropagation(); onShare?.(); }}
              className="h-10 w-10 rounded-2xl bg-muted/20 hover:bg-primary/20 text-muted-foreground hover:text-primary flex items-center justify-center transition-all shadow-sm active:scale-95"
              title="Share cinematic layout"
            >
              <Share2 className="h-4.5 w-4.5" />
            </button>
            <div className="h-10 w-10 rounded-2xl bg-muted/30 flex items-center justify-center text-muted-foreground group-hover:bg-primary group-hover:text-white group-hover:scale-110 transition-all">
               <ChevronRight className="h-5 w-5" />
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  // Expanded View via Portal
  const expandedOverlay = (
    <div className="fixed inset-0 z-40 flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/90 backdrop-blur-xl"
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
        className="relative w-full h-full sm:h-[92vh] sm:max-w-2xl sm:rounded-[3rem] bg-background overflow-hidden sm:border sm:border-white/10 shadow-2xl z-10 flex flex-col"
      >
        {isMobile && (
          <div className="flex justify-center pt-4 pb-2 shrink-0 bg-transparent absolute top-0 left-0 right-0 z-30 pointer-events-auto cursor-grab active:cursor-grabbing">
            <div className="h-1.5 w-12 rounded-full bg-primary/30" />
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
