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
import { DiningEntryForm } from './DiningEntryForm';
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
  const { restaurantName, visitDate, cuisine, priceRange, location, dishes = [], overallNotes, overallRating } = experience || {};
  
  if (!experience) return null;
  
  const likedDishes = dishes.filter(d => d.status === 'liked');
  const avoidedDishes = dishes.filter(d => d.status === 'not-recommended');
  
  const allImages = dishes.flatMap(d => d.images);
  const heroImage = allImages[0] || null;

  const handleCopyText = () => {
    const dishList = dishes.map(d => {
      const statusIcon = d.status === 'liked' ? '✅' : d.status === 'not-recommended' ? '❌' : '⏺️';
      const ratingStars = d.rating ? '⭐'.repeat(d.rating) : '';
      const priceTag = d.price ? `(₹${d.price})` : '';
      return `${statusIcon} *${d.name}* ${priceTag} ${ratingStars}\n${d.notes.replace(/[*#=]/g, '')}`;
    }).join('\n\n');

    const dateFormatted = visitDate ? format(new Date(visitDate), 'MMM d, yyyy') : 'Undated';
    const text = `🍽️ *${restaurantName}*\n📅 ${dateFormatted}\n📍 ${location?.address || 'N/A'}\n\n*Items:*\n${dishList}\n\n_Logged via Buxman_`;

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
        className="relative group min-h-[128px] rounded-[2rem] overflow-hidden border border-white/10 shadow-2xl cursor-pointer bg-card/30 backdrop-blur-md transition-all duration-300 hover:border-primary/30 hover:shadow-primary/5 active:scale-[0.98]"
      >
        {/* Subtle Backdrop Glow Layer */}
        <div className="absolute inset-0 z-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5 group-hover:from-primary/10 group-hover:to-secondary/8 transition-all duration-500" />
        
        <div className="relative z-10 h-full flex items-center p-5 gap-5">
          {/* Vertical Calendar Date Badge */}
          <div className="relative z-10 flex flex-col items-center justify-center shrink-0 w-16 h-20 rounded-2xl bg-white/5 border border-white/5 group-hover:bg-primary/10 group-hover:border-primary/20 transition-all duration-300 shadow-sm">
            {visitDate ? (
              <>
                <span className="text-[9px] font-black text-muted-foreground/60 uppercase tracking-widest leading-none mb-1">
                  {format(new Date(visitDate), 'MMM')}
                </span>
                <span className="text-2xl font-black text-foreground tracking-tighter leading-none">
                  {format(new Date(visitDate), 'd')}
                </span>
              </>
            ) : (
              <>
                <span className="text-[9px] font-black text-primary uppercase tracking-widest leading-none mb-1 animate-pulse">
                  TBD
                </span>
                <span className="text-sm font-black text-muted-foreground tracking-tighter leading-none mt-1">
                  Undated
                </span>
              </>
            )}
          </div>
          
          <div className="flex-1 min-w-0 flex flex-col justify-center py-1">
             {/* Styled Meta Pill Badges */}
             <div className="flex flex-wrap items-center gap-2 mb-1.5">
                {cuisine && (
                  <span className="text-[8px] font-black text-primary uppercase tracking-[0.2em] bg-primary/10 px-2 py-0.5 rounded-md border border-primary/15 shadow-sm">
                    {cuisine}
                  </span>
                )}
                <span className="text-[8px] font-black text-muted-foreground/75 uppercase tracking-wider bg-white/5 px-2 py-0.5 rounded-md border border-white/5 flex items-center gap-0.5 shadow-sm">
                  {[...Array(4)].map((_, i) => (
                    <span 
                      key={i} 
                      className={cn(
                        "text-[8px] font-black leading-none",
                        i < (priceRange === 'budget' ? 1 : priceRange === 'mid' ? 2 : priceRange === 'premium' ? 3 : 4) 
                          ? "text-primary" 
                          : "text-muted-foreground/20"
                      )}
                    >
                      ₹
                    </span>
                  ))}
                </span>
                {experience._visitCount && experience._visitCount > 1 && (
                  <span className="text-[8px] font-black text-muted-foreground/75 uppercase tracking-wider bg-white/5 px-2 py-0.5 rounded-md border border-white/5 shadow-sm">
                    {experience._visitCount} Visits
                  </span>
                )}
             </div>
             
             {/* Restaurant Name in Full (Wrapped properly, no truncation) */}
             <h3 className="text-xl font-black tracking-tight text-foreground group-hover:text-primary transition-colors duration-300 break-words whitespace-normal leading-snug">
               {restaurantName}
             </h3>
             
             {location?.address && (
               <div className="flex items-center gap-1 mt-1 text-muted-foreground/50 text-[10px] font-semibold">
                 <MapPin className="h-3 w-3 shrink-0 text-rose-400/70" />
                 <span className="truncate">{location.address}</span>
               </div>
             )}
             
             {/* Dynamic Status-Colored Inline Dish Pills */}
             {dishes.length > 0 && (
               <div className="flex flex-wrap items-center gap-1.5 mt-3">
                 {dishes.slice(0, 3).map((dish, idx) => (
                   <span 
                     key={dish.id || idx}
                     className={cn(
                       "text-[8px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider border transition-all duration-300 shadow-sm",
                       dish.status === 'liked' ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                       dish.status === 'not-recommended' ? "bg-rose-500/10 text-rose-400 border-rose-500/20" :
                       "bg-white/5 text-muted-foreground/60 border-white/5"
                     )}
                   >
                     {dish.name}
                   </span>
                 ))}
                 {dishes.length > 3 && (
                   <span className="text-[8px] font-black text-muted-foreground/45 uppercase tracking-widest pl-0.5">
                     +{dishes.length - 3} MORE
                   </span>
                 )}
               </div>
             )}
          </div>
          
          {/* Simple, Ultra-Premium Glowing Chevron navigation indicator */}
          <div className="flex items-center justify-center shrink-0 pl-1">
            <div className="h-10 w-10 rounded-full bg-white/5 border border-white/5 text-muted-foreground/50 flex items-center justify-center transition-all duration-300 group-hover:bg-primary/20 group-hover:border-primary/30 group-hover:text-primary group-hover:scale-105 active:scale-95 shadow-sm">
              <ChevronRight className="h-4.5 w-4.5 group-hover:translate-x-0.5 transition-transform duration-300" />
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  const cardContent = (
    <div className="flex flex-col h-full">
      {/* Sleek Typographic Header Panel */}
      <div className="relative shrink-0 py-12 px-8 border-b border-white/5 bg-gradient-to-br from-primary/15 via-background/60 to-secondary/10 overflow-hidden">
        {/* Abstract Glowing Mesh Backgrounds */}
        <div className="absolute -top-12 -right-12 w-64 h-64 bg-primary/10 rounded-full blur-[60px] pointer-events-none" />
        <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-secondary/5 rounded-full blur-[40px] pointer-events-none" />
        
        {/* Floating Headers */}
        <div className="flex justify-between items-center mb-10 relative z-10">
          <button 
            onClick={(e) => { e.stopPropagation(); onClose?.(); }}
            className="h-11 w-11 rounded-xl bg-white/5 backdrop-blur-xl border border-white/10 flex items-center justify-center text-white active:scale-90 hover:bg-white/10 transition-all shadow-xl"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          
          <div className="flex gap-2">
            <button 
              onClick={(e) => { e.stopPropagation(); onShare?.(); }}
              className="h-11 w-11 rounded-xl bg-white/5 backdrop-blur-xl border border-white/10 flex items-center justify-center text-white active:scale-90 hover:bg-white/10 transition-all shadow-xl"
            >
              <Share2 className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Restaurant Info Panel */}
        <div className="relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.4 }}
          >
            <div className="flex items-center gap-2.5 mb-4">
              <Badge className="bg-primary text-white border-none text-[9px] font-black uppercase tracking-widest px-3.5 py-1.5 shadow-glow rounded-full">
                {cuisine || 'Dining'}
              </Badge>
              <div className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-white/90 text-[9px] font-black uppercase tracking-widest">
                {priceRange === 'budget' ? '₹' : priceRange === 'mid' ? '₹₹' : priceRange === 'premium' ? '₹₹₹' : '₹₹₹₹'}
              </div>
              {experience._visitCount && experience._visitCount > 1 && (
                <div className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-muted-foreground text-[9px] font-black uppercase tracking-widest">
                  {experience._visitCount} Visits
                </div>
              )}
            </div>
            
            <h2 className="text-4xl sm:text-5xl font-black tracking-tight text-white leading-tight">
              {restaurantName}
            </h2>
            
            <div className="flex flex-wrap items-center gap-4 mt-4 text-white/60 text-[10px] font-black uppercase tracking-wider">
              <div className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-primary/80" />
                {visitDate ? format(new Date(visitDate), 'MMMM d, yyyy') : 'Undated Visit'}
              </div>
              {location?.address && (
                <>
                  <div className="h-1 w-1 rounded-full bg-white/20" />
                  <div className="flex items-center gap-1.5 max-w-[280px] sm:max-w-[400px] truncate">
                    <MapPin className="h-3.5 w-3.5 text-rose-400" />
                    <span className="truncate">{location.address}</span>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Details Section */}
      <div className="px-8 py-10 space-y-12 flex-1 pb-32">
        {/* Overall Experience Review Section */}
        {(overallNotes || overallRating) && (
          <div className="space-y-6 animate-in fade-in-50 duration-500">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-amber-500/10 flex items-center justify-center border border-amber-500/15">
                <Quote className="h-4.5 w-4.5 text-amber-400" />
              </div>
              <h3 className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground/60">Overall Experience</h3>
            </div>
            
            <div className="relative rounded-[2.5rem] overflow-hidden bg-gradient-to-br from-card/60 via-card/40 to-background/30 border border-white/10 p-6 sm:p-8 shadow-xl">
              {/* Subtle background glow blob */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-[60px] pointer-events-none" />
              
              <div className="flex flex-col gap-5 relative z-10">
                {overallRating && (
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black text-muted-foreground/50 uppercase tracking-widest">Visit Rating</span>
                    <div className="flex gap-0.5">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star 
                          key={s} 
                          className={cn(
                            "h-4 w-4", 
                            s <= overallRating! 
                              ? "text-amber-400 fill-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]" 
                              : "text-muted-foreground/15"
                          )} 
                        />
                      ))}
                    </div>
                  </div>
                )}
                
                {overallNotes && (
                  <div className="relative pl-5 border-l-2 border-primary/30">
                    <div className="text-base sm:text-lg text-muted-foreground/90 leading-relaxed font-semibold italic">
                      <FormattedText text={overallNotes} />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Dishes Highlight List */}
        {dishes.length > 0 && (
          <div className="space-y-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/15">
                  <Utensils className="h-4.5 w-4.5 text-primary" />
                </div>
                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground/60">Ordered Items</h3>
              </div>
              <div className="h-px flex-1 bg-white/5 mx-6" />
              <Badge variant="outline" className="rounded-full border-primary/20 text-primary font-black uppercase text-[9px] px-3 py-1">
                {dishes.length} Items
              </Badge>
            </div>

            <div className="grid grid-cols-1 gap-6">
              {dishes.map((dish, idx) => (
                <motion.div 
                  key={dish.id}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + idx * 0.08 }}
                  className="group relative bg-gradient-to-br from-card/40 via-card/30 to-background/50 backdrop-blur-2xl border border-white/5 rounded-[2rem] p-6 shadow-xl hover:border-primary/20 hover:shadow-primary/5 transition-all duration-300 overflow-hidden"
                >
                  <div className="flex items-start gap-5">
                    {/* Gourmet Status Icon Badge (Left Column) */}
                    <div className={cn(
                      "h-12 w-12 rounded-2xl flex items-center justify-center shrink-0 border shadow-sm transition-all duration-300 group-hover:scale-105",
                      dish.status === 'liked' ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" :
                      dish.status === 'not-recommended' ? "bg-rose-500/10 border-rose-500/20 text-rose-400" :
                      "bg-white/5 border-white/5 text-muted-foreground/50"
                    )}>
                      {dish.status === 'liked' ? (
                        <Star className="h-5 w-5 fill-emerald-400 text-emerald-400" />
                      ) : dish.status === 'not-recommended' ? (
                        <ThumbsDown className="h-5 w-5 fill-rose-400/10 text-rose-400" />
                      ) : (
                        <Utensils className="h-5 w-5 text-muted-foreground/40" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0 flex flex-col justify-center">
                      <div className="flex flex-wrap items-center justify-between gap-3 mb-1.5">
                        <h4 className="font-extrabold text-lg sm:text-xl tracking-tight text-foreground group-hover:text-primary transition-colors duration-300">
                          {dish.name}
                        </h4>
                        
                        <Badge className={cn(
                          "shrink-0 text-[8px] font-black uppercase tracking-widest border-none px-3 py-1 rounded-full shadow-sm",
                          dish.status === 'liked' ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400" : 
                          dish.status === 'not-recommended' ? "bg-rose-500/10 border border-rose-500/20 text-rose-400" : 
                          "bg-white/5 border-white/5 text-muted-foreground/60"
                        )}>
                          {dish.status === 'liked' ? 'Must Try' : dish.status === 'not-recommended' ? 'Avoid' : 'Neutral'}
                        </Badge>
                      </div>
                      
                      {/* Price & Rating Bar */}
                      {(dish.price || dish.rating) && (
                        <div className="flex items-center gap-3.5 mb-3 flex-wrap">
                          {dish.price && (
                            <span className="text-[10px] font-black text-primary uppercase tracking-wider bg-primary/10 px-2 py-0.5 rounded-md border border-primary/20">
                              ₹{dish.price}
                            </span>
                          )}
                          {dish.rating && (
                            <div className="flex gap-0.5">
                              {[1, 2, 3, 4, 5].map(s => (
                                <Star 
                                  key={s} 
                                  className={cn(
                                    "h-3.5 w-3.5", 
                                    s <= dish.rating! 
                                      ? "text-amber-400 fill-amber-400" 
                                      : "text-muted-foreground/10"
                                  )} 
                                />
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Dish Notes in Blockquote */}
                      {dish.notes && (
                        <div className="relative mt-2.5 pl-4 border-l border-primary/20">
                          <FormattedText 
                            text={dish.notes} 
                            className="text-sm leading-relaxed text-muted-foreground/80 font-medium italic" 
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Integrated Floating Actions for Expanded View */}
        <div className="fixed bottom-0 left-0 right-0 p-5 bg-gradient-to-t from-background via-background/95 to-transparent border-t border-white/5 backdrop-blur-md z-50">
          <div className="max-w-3xl mx-auto flex flex-row items-center gap-2.5 w-full">
            <Button 
              onClick={(e) => { e.stopPropagation(); onEdit?.(); }}
              className="flex-1 h-12 rounded-xl bg-primary text-white hover:opacity-95 font-bold uppercase tracking-wider text-[10px] shadow-glow gap-1.5 border-none transition-all active:scale-95"
            >
              <Edit className="h-4 w-4" /> Edit
            </Button>

            <DiningEntryForm 
              trigger={
                <Button 
                  variant="outline"
                  className="flex-1 h-12 rounded-xl border border-white/10 bg-white/5 text-white hover:bg-white/10 font-bold uppercase tracking-wider text-[10px] gap-1.5 transition-all active:scale-95"
                >
                  <Utensils className="h-4 w-4" /> Revisit
                </Button>
              }
              initialData={{
                ...experience,
                id: '', // New ID
                visitDate: new Date().toISOString(),
                dishes: [], // Start fresh with dishes
                overallNotes: '',
                overallRating: undefined,
              }}
            />

            <Button 
              variant="outline"
              onClick={(e) => { e.stopPropagation(); handleCopyText(); }}
              className="h-12 w-12 rounded-xl bg-card border border-white/10 text-white hover:bg-white/5 shrink-0 transition-all active:scale-90 flex items-center justify-center"
            >
              {copied ? <Check className="h-4.5 w-4.5 text-emerald-400" /> : <Copy className="h-4.5 w-4.5" />}
            </Button>

            <Button 
              variant="outline"
              onClick={(e) => { e.stopPropagation(); onDelete?.(); }}
              className="h-12 w-12 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500 hover:text-white transition-all shrink-0 active:scale-90 flex items-center justify-center"
            >
              <Trash2 className="h-4.5 w-4.5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );

  // Expanded View via Portal
  const expandedOverlay = (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
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
