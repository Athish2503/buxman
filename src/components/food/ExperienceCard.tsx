import { useState, useMemo, forwardRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MapPin, Calendar, Star, ThumbsUp, ThumbsDown, 
  Share2, Download, Trash2, Edit2, Utensils,
  ChevronRight, ArrowLeft, Camera, Quote, Copy, Check
} from 'lucide-react';
import { DiningExperience, Dish } from '@/types/food';
import { FormattedText } from './FormattedText';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { haptics } from '@/lib/haptics';
import { toast } from 'sonner';

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

    const text = `🍽️ *${restaurantName}*\n📅 ${format(new Date(visitDate), 'MMM d, yyyy')}\n📍 ${location?.address || 'N/A'}\n\n*The Experience:*\n${dishList}\n\n_Logged via Culinary Diary_`;

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
                  <div className="flex items-center gap-1 text-[10px] font-bold text-success uppercase tracking-widest">
                    <Star className="h-3 w-3 fill-success" />
                    {likedDishes.length} Must Try
                  </div>
                )}
             </div>
          </div>
          
          <div className="h-10 w-10 rounded-2xl bg-muted/30 flex items-center justify-center text-muted-foreground group-hover:bg-primary group-hover:text-white group-hover:scale-110 transition-all">
             <ChevronRight className="h-5 w-5" />
          </div>
        </div>
      </motion.div>
    );
  }

  const cardContent = (
    <motion.div 
      layoutId={`card-${experience.id}`}
      id={`exp-card-${experience.id}`}
      className={cn(
        "relative bg-background",
        isExpanded ? "" : "rounded-[2.5rem] border border-border/40 shadow-xl overflow-hidden"
      )}
    >
      {/* Hero Section */}
      <div className={cn("relative", isExpanded ? "h-[45vh]" : "h-64")}>
        {heroImage ? (
          <img src={heroImage} alt={restaurantName} className="h-full w-full object-cover" />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-primary/30 to-secondary/30 flex items-center justify-center">
            <Utensils className="h-16 w-16 text-white/40" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-black/40" />
        
        {/* Floating Headers */}
        <div className="absolute top-10 left-6 right-6 flex justify-between items-start z-10">
          <button 
            onClick={(e) => { e.stopPropagation(); onClose?.(); }}
            className="h-12 w-12 rounded-2xl bg-black/40 backdrop-blur-2xl border border-white/10 flex items-center justify-center text-white active:scale-90 transition-all shadow-xl"
          >
            <ArrowLeft className="h-6 w-6" />
          </button>
          
          <div className="flex gap-2">
            <button 
              onClick={(e) => { e.stopPropagation(); onShare?.(); }}
              className="h-12 w-12 rounded-2xl bg-black/40 backdrop-blur-2xl border border-white/10 flex items-center justify-center text-white active:scale-90 transition-all shadow-xl"
            >
              <Share2 className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Restaurant Info Over Hero */}
        <div className="absolute bottom-10 left-8 right-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
          >
            <h2 className={cn(
              "font-black tracking-tight text-white mb-3",
              isExpanded ? "text-5xl leading-[0.95]" : "text-2xl"
            )}>
              {restaurantName}
            </h2>
            <div className="flex flex-wrap items-center gap-4 text-white/90 text-[10px] font-black uppercase tracking-[0.2em]">
              <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10">
                <Calendar className="h-3.5 w-3.5 text-primary-light" />
                {format(new Date(visitDate), 'MMM d, yyyy')}
              </div>
              {location?.address && (
                <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10">
                  <MapPin className="h-3.5 w-3.5 text-rose-400" />
                  {location.address}
                </div>
              )}
              {priceRange && (
                <div className="bg-primary px-3 py-1.5 rounded-full text-white shadow-lg">
                  {priceRange === 'budget' ? '₹' : priceRange === 'mid' ? '₹₹' : priceRange === 'premium' ? '₹₹₹' : '₹₹₹₹'}
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Details Section */}
      <div className={cn("px-6 py-10 space-y-10", isExpanded ? "pb-48" : "")}>
        {/* Dishes Highlight */}
        {dishes.length > 0 && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black uppercase tracking-[0.2em] text-muted-foreground">The Experience</h3>
              <div className="h-px flex-1 bg-border/40 mx-4" />
            </div>

            <div className="space-y-4">
              {dishes.map((dish) => (
                <motion.div 
                  key={dish.id}
                  layoutId={`dish-${dish.id}`}
                  className="group relative bg-card/60 backdrop-blur-xl border border-white/5 rounded-[2rem] p-6 overflow-hidden shadow-xl"
                >
                  <div className="flex gap-4">
                    {dish.images[0] && (
                      <div className="h-20 w-20 rounded-2xl overflow-hidden shrink-0 shadow-md">
                        <img src={dish.images[0]} alt={dish.name} className="h-full w-full object-cover" />
                      </div>
                    )}
                    <div className="flex-1 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <h4 className="font-bold text-base tracking-tight">{dish.name}</h4>
                        <div className={cn(
                          "px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border",
                          dish.status === 'liked' ? "bg-success/10 text-success border-success/20" : 
                          dish.status === 'not-recommended' ? "bg-destructive/10 text-destructive border-destructive/20" : 
                          "bg-muted/30 text-muted-foreground border-border/20"
                        )}>
                          {dish.status === 'liked' ? 'Must Try' : dish.status === 'not-recommended' ? 'Avoid' : 'Neutral'}
                        </div>
                      </div>
                      
                      {dish.rating && (
                        <div className="flex gap-0.5">
                          {[1,2,3,4,5].map(s => (
                            <Star key={s} className={cn("h-3 w-3", s <= dish.rating! ? "text-amber-400 fill-amber-400" : "text-muted-foreground/20")} />
                          ))}
                        </div>
                      )}

                      <FormattedText text={dish.notes} className="text-muted-foreground line-clamp-3" />
                    </div>
                  </div>
                  
                  {/* Expanded Images for Dish */}
                  {isExpanded && dish.images.length > 1 && (
                    <div className="flex gap-2 mt-4 overflow-x-auto no-scrollbar pb-1">
                      {dish.images.slice(1).map((img, i) => (
                        <img key={i} src={img} className="h-24 w-32 object-cover rounded-xl shadow-sm" />
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
          <div className="pt-12 flex gap-3">
            <Button 
              onClick={(e) => { e.stopPropagation(); onEdit?.(); }}
              className="flex-1 h-16 rounded-[2rem] bg-white text-black hover:bg-white/90 font-black uppercase tracking-widest text-[11px] shadow-glow gap-2"
            >
              <Edit2 className="h-5 w-5" /> Edit Log
            </Button>
            
            <Button 
              variant="outline"
              onClick={(e) => { e.stopPropagation(); handleCopyText(); }}
              className="h-16 w-16 rounded-[2rem] bg-card border-white/5 text-white hover:bg-white/10 shrink-0 shadow-lg"
            >
              {copied ? <Check className="h-6 w-6 text-success" /> : <Copy className="h-6 w-6" />}
            </Button>

            <Button 
              variant="outline"
              onClick={(e) => { e.stopPropagation(); onDelete?.(); }}
              className="h-16 w-16 rounded-[2rem] bg-destructive/10 border-destructive/20 text-destructive hover:bg-destructive hover:text-white transition-all shrink-0 shadow-lg"
            >
              <Trash2 className="h-6 w-6" />
            </Button>
          </div>
        )}
        </div>
    </motion.div>
  );

  return (
    <div
      ref={ref}
      className={cn(
        "cursor-pointer transition-all duration-500",
        isExpanded ? "fixed inset-0 z-[100] w-full h-screen overflow-y-auto bg-background no-scrollbar" : "hover:scale-[1.01] active:scale-[0.99]"
      )}
      onClick={!isExpanded ? () => onClose?.() : undefined}
    >
      {cardContent}
    </div>
  );
});

ExperienceCard.displayName = "ExperienceCard";
