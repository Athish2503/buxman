import { useState, useMemo, forwardRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MapPin, Star, ThumbsUp, ThumbsDown, 
  Trash2, Edit, Utensils, ChevronRight, ArrowLeft, 
  Users, Sparkles, Plus, Image as ImageIcon, Camera,
  X, PenLine, Heart
} from 'lucide-react';
import { DiningRecommendation, Dish, PriceRange } from '@/types/food';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { haptics } from '@/lib/haptics';
import { toast } from 'sonner';
import { useIsMobile } from '@/hooks/useIsMobile';
import { foodService } from '@/lib/food-service';
import { Camera as CapacitorCamera, CameraResultType, CameraSource } from '@capacitor/camera';

interface RecommendationCardProps {
  recommendation: DiningRecommendation;
  onClose?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onLogVisit?: () => void;
  onUpdate?: (updated: DiningRecommendation) => void;
  isExpanded?: boolean;
}

export const RecommendationCard = forwardRef<HTMLDivElement, RecommendationCardProps>(({ 
  recommendation, 
  onClose,
  onEdit, 
  onDelete, 
  onLogVisit,
  onUpdate,
  isExpanded = false 
}, ref) => {
  const isMobile = useIsMobile();
  const { restaurantName, cuisine, priceRange, location, dishes = [], recommendedBy, notes } = recommendation || {};
  
  // Local state for direct Dish CRUD
  const [isDishDialogOpen, setIsDishDialogOpen] = useState(false);
  const [editingDish, setEditingDish] = useState<Dish | null>(null);
  const [isNewDish, setIsNewDish] = useState(false);
  
  // Dish Form State
  const [dishName, setDishName] = useState('');
  const [dishNotes, setDishNotes] = useState('');
  const [dishPrice, setDishPrice] = useState<string>('');
  const [dishRating, setDishRating] = useState<number>(0);
  const [dishImages, setDishImages] = useState<string[]>([]);
  const [dishStatus, setDishStatus] = useState<'liked' | 'neutral' | 'not-recommended'>('neutral');

  if (!recommendation) return null;

  const handleOpenAddDish = () => {
    haptics.medium();
    setEditingDish({
      id: crypto.randomUUID(),
      name: '',
      status: 'neutral',
      notes: '',
      images: []
    });
    setIsNewDish(true);
    setDishName('');
    setDishNotes('');
    setDishPrice('');
    setDishRating(0);
    setDishImages([]);
    setDishStatus('neutral');
    setIsDishDialogOpen(true);
  };

  const handleOpenEditDish = (dish: Dish) => {
    haptics.selection();
    setEditingDish(dish);
    setIsNewDish(false);
    setDishName(dish.name);
    setDishNotes(dish.notes || '');
    setDishPrice(dish.price ? dish.price.toString() : '');
    setDishRating(dish.rating || 0);
    setDishImages(dish.images || []);
    setDishStatus(dish.status || 'neutral');
    setIsDishDialogOpen(true);
  };

  const handleSaveDish = () => {
    if (!dishName.trim()) {
      toast.error('Dish name is required');
      return;
    }

    const updatedDish: Dish = {
      id: editingDish?.id || crypto.randomUUID(),
      name: dishName,
      status: dishStatus,
      notes: dishNotes,
      price: dishPrice ? parseFloat(dishPrice) : undefined,
      rating: dishRating > 0 ? dishRating : undefined,
      images: dishImages
    };

    let updatedDishes = [...dishes];
    if (isNewDish) {
      updatedDishes.push(updatedDish);
    } else {
      updatedDishes = updatedDishes.map(d => d.id === updatedDish.id ? updatedDish : d);
    }

    const updatedRec = {
      ...recommendation,
      dishes: updatedDishes
    };

    foodService.updateRecommendation(updatedRec);
    if (onUpdate) onUpdate(updatedRec);

    toast.success(isNewDish ? 'Dish added' : 'Dish updated');
    setIsDishDialogOpen(false);
    haptics.success();
  };

  const handleDeleteDish = (dishId: string) => {
    haptics.medium();
    const updatedDishes = dishes.filter(d => d.id !== dishId);
    const updatedRec = {
      ...recommendation,
      dishes: updatedDishes
    };
    foodService.updateRecommendation(updatedRec);
    if (onUpdate) onUpdate(updatedRec);
    toast.success('Dish removed');
  };

  const handleAddImage = async (source: CameraSource) => {
    try {
      const image = await CapacitorCamera.getPhoto({
        quality: 80,
        allowEditing: true,
        resultType: CameraResultType.Base64,
        source: source,
      });

      if (image.base64String) {
        const b64 = `data:image/${image.format};base64,${image.base64String}`;
        setDishImages(prev => [...prev, b64]);
        haptics.success();
      }
    } catch (error: any) {
      if (error?.message !== 'User cancelled photos app') {
        toast.error('Could not capture image');
      }
    }
  };

  const removeImage = (idxToRemove: number) => {
    setDishImages(prev => prev.filter((_, idx) => idx !== idxToRemove));
  };

  if (!isExpanded) {
    return (
      <motion.div
        layoutId={`card-${recommendation.id}`}
        onClick={() => { haptics.selection(); onClose?.(); }}
        className="relative group min-h-[128px] rounded-[2rem] overflow-hidden border border-white/10 shadow-2xl cursor-pointer bg-card/30 backdrop-blur-md transition-all duration-300 hover:border-primary/30 hover:shadow-primary/5 active:scale-[0.98]"
      >
        <div className="absolute inset-0 z-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5 group-hover:from-primary/10 group-hover:to-secondary/8 transition-all duration-500" />
        
        <div className="relative z-10 h-full flex items-center p-5 gap-5">
          {/* Wishlist Avatar Badge */}
          <div className="relative z-10 flex flex-col items-center justify-center shrink-0 w-16 h-20 rounded-2xl bg-white/5 border border-white/5 group-hover:bg-primary/10 group-hover:border-primary/20 transition-all duration-300 shadow-sm">
            <Heart className="h-7 w-7 text-primary animate-pulse opacity-80" />
            <span className="text-[8px] font-black text-muted-foreground/60 uppercase tracking-widest leading-none mt-1">
              WISHLIST
            </span>
          </div>
          
          <div className="flex-1 min-w-0 flex flex-col justify-center py-1">
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
                {recommendedBy && (
                  <span className="text-[8px] font-black text-muted-foreground/60 uppercase tracking-widest bg-white/5 px-2 py-0.5 rounded-md border border-white/5 shadow-sm truncate max-w-[120px]">
                    via {recommendedBy}
                  </span>
                )}
             </div>
             
             <h3 className="text-xl font-black tracking-tight text-foreground group-hover:text-primary transition-colors duration-300 break-words whitespace-normal leading-snug">
               {restaurantName}
             </h3>
             
             {location?.address && (
               <div className="flex items-center gap-1 mt-1 text-muted-foreground/50 text-[10px] font-semibold">
                 <MapPin className="h-3 w-3 shrink-0 text-rose-400/70" />
                 <span className="truncate">{location.address}</span>
               </div>
             )}
             
             {dishes.length > 0 && (
               <div className="flex flex-wrap items-center gap-1.5 mt-3">
                 {dishes.slice(0, 3).map((dish, idx) => (
                   <span 
                     key={dish.id || idx}
                     className="text-[8px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider border bg-white/5 text-muted-foreground/60 border-white/5"
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
          
          <div className="flex items-center justify-center shrink-0 pl-1">
            <div className="h-10 w-10 rounded-full bg-white/5 border border-white/5 text-muted-foreground/50 flex items-center justify-center transition-all duration-300 group-hover:bg-primary/20 group-hover:border-primary/30 group-hover:text-primary group-hover:scale-105 active:scale-95 shadow-sm">
              <ChevronRight className="h-4.5 w-4.5 group-hover:translate-x-0.5 transition-transform duration-300" />
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  // Expanded View Drawer Modal
  const detailsDrawer = (
    <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-0 sm:p-4">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/80 backdrop-blur-md"
        onClick={() => { haptics.light(); onClose?.(); }}
      />
      
      {/* Container */}
      <motion.div
        layoutId={`card-${recommendation.id}`}
        className="relative z-10 w-full sm:max-w-2xl h-[92vh] sm:h-auto sm:max-h-[90vh] bg-background border border-white/10 rounded-t-[2.5rem] sm:rounded-[2.5rem] flex flex-col shadow-3xl overflow-hidden"
      >
        {/* Navigation / Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/5 shrink-0 bg-card/10">
          <Button
            variant="ghost"
            onClick={() => { haptics.light(); onClose?.(); }}
            className="rounded-xl px-3 hover:bg-white/5 text-muted-foreground hover:text-white flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="text-[10px] font-black uppercase tracking-widest">Back</span>
          </Button>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={onEdit}
              className="h-10 w-10 rounded-full hover:bg-white/5 text-muted-foreground hover:text-white"
            >
              <Edit className="h-4.5 w-4.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onDelete}
              className="h-10 w-10 rounded-full hover:bg-red-500/10 text-rose-400 hover:text-rose-300"
            >
              <Trash2 className="h-4.5 w-4.5" />
            </Button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-8 scrollbar-thin">
          {/* Restaurant Header */}
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2.5">
              {cuisine && (
                <span className="text-[9px] font-black text-primary uppercase tracking-[0.25em] bg-primary/10 px-3 py-1 rounded-full border border-primary/20">
                  {cuisine}
                </span>
              )}
              <span className="text-[9px] font-black text-muted-foreground/75 uppercase tracking-widest bg-white/5 px-3 py-1 rounded-full border border-white/5 flex items-center gap-0.5">
                {[...Array(4)].map((_, i) => (
                  <span 
                    key={i} 
                    className={cn(
                      "text-[9px] font-black leading-none",
                      i < (priceRange === 'budget' ? 1 : priceRange === 'mid' ? 2 : priceRange === 'premium' ? 3 : 4) 
                        ? "text-primary" 
                        : "text-muted-foreground/20"
                    )}
                  >
                    ₹
                  </span>
                ))}
              </span>
              {recommendedBy && (
                <span className="text-[9px] font-black text-muted-foreground/60 uppercase tracking-widest bg-white/5 px-3 py-1 rounded-full border border-white/5 flex items-center gap-1.5">
                  <Users className="h-3 w-3 text-primary/60" />
                  Rec by {recommendedBy}
                </span>
              )}
            </div>

            <h1 className="text-3xl sm:text-4xl font-black tracking-tight leading-tight text-white">{restaurantName}</h1>
            
            {location?.address && (
              <div className="flex items-start gap-2 text-muted-foreground/70 text-xs font-semibold">
                <MapPin className="h-4.5 w-4.5 shrink-0 text-rose-400/80 mt-0.5" />
                <span>{location.address}</span>
              </div>
            )}
          </div>

          {/* Notes Quote */}
          {notes && (
            <div className="relative py-3 pl-5 border-l border-primary/30 bg-white/5 p-5 rounded-r-[2rem] rounded-bl-[2rem] border border-white/5">
              <p className="text-sm sm:text-base text-muted-foreground leading-relaxed italic font-medium">
                "{notes}"
              </p>
            </div>
          )}

          {/* Dishes List Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-white/5 pb-2">
              <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/80">Recommended Dishes to Try</h2>
              <Button
                variant="outline"
                size="sm"
                onClick={handleOpenAddDish}
                className="h-8 rounded-full text-[9px] font-black uppercase tracking-widest border-primary/25 text-primary hover:bg-primary/5 gap-1.5 px-3"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Dish
              </Button>
            </div>

            {dishes.length === 0 ? (
              <div className="py-12 text-center rounded-[2rem] border border-dashed border-white/5 text-muted-foreground/40 text-xs font-bold flex flex-col items-center gap-2">
                <Utensils className="h-8 w-8 opacity-25" />
                No dishes saved to try yet.
              </div>
            ) : (
              <div className="space-y-4">
                {dishes.map((dish) => (
                  <div 
                    key={dish.id} 
                    className="p-5 rounded-[2rem] bg-card/20 border border-white/5 flex flex-col md:flex-row gap-5 items-start justify-between relative group/dish"
                  >
                    <div className="flex-1 space-y-2.5">
                      <div className="flex items-center gap-3">
                        <h3 className="font-bold text-white text-base">{dish.name}</h3>
                        {dish.price && (
                          <span className="text-xs font-black text-primary bg-primary/10 border border-primary/10 px-2 py-0.5 rounded-full">
                            ₹{dish.price}
                          </span>
                        )}
                        {dish.rating && (
                          <span className="text-xs font-black text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-full flex items-center gap-0.5">
                            <Star className="h-3 w-3 fill-amber-400" />
                            {dish.rating}
                          </span>
                        )}
                      </div>
                      
                      {dish.notes && (
                        <p className="text-xs text-muted-foreground/80 leading-relaxed">{dish.notes}</p>
                      )}
                      
                      {/* Image Thumbnails */}
                      {dish.images && dish.images.length > 0 && (
                        <div className="flex gap-2 overflow-x-auto pt-1 pb-1">
                          {dish.images.map((img, i) => (
                            <div key={i} className="h-16 w-20 rounded-xl overflow-hidden shrink-0 border border-white/10 shadow-md">
                              <img src={img} alt="" className="h-full w-full object-cover" />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 self-end md:self-start opacity-70 group-hover/dish:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenEditDish(dish)}
                        className="h-8 w-8 rounded-full hover:bg-white/5 text-muted-foreground hover:text-white"
                      >
                        <PenLine className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteDish(dish.id)}
                        className="h-8 w-8 rounded-full hover:bg-red-500/10 text-rose-400 hover:text-rose-300"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-6 border-t border-white/5 bg-card/10 shrink-0 flex flex-col gap-3">
          <Button 
            onClick={() => { haptics.selection(); onLogVisit?.(); }}
            className="w-full h-16 rounded-[2rem] bg-primary text-white hover:opacity-90 font-black uppercase tracking-widest text-[11px] gap-2.5 shadow-glow border-none transition-all active:scale-95"
          >
            <Sparkles className="h-5 w-5 text-amber-300 animate-pulse" />
            Log as Actual Visit
          </Button>
          <Button 
            variant="outline"
            onClick={() => { haptics.light(); onClose?.(); }}
            className="w-full h-14 rounded-[2rem] border-white/10 bg-white/5 text-white hover:bg-white/10 font-black uppercase tracking-widest text-[10px]"
          >
            Close Details
          </Button>
        </div>
      </motion.div>

      {/* Direct Dish Add/Edit Dialog Modal */}
      <AnimatePresence>
        {isDishDialogOpen && (
          <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/80 backdrop-blur-md"
              onClick={() => setIsDishDialogOpen(false)}
            />
            
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative z-10 w-full max-w-md bg-background border border-white/10 rounded-[2.5rem] p-6 shadow-3xl space-y-5 overflow-hidden"
            >
              <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <div className="flex items-center gap-2">
                  <Utensils className="h-4 w-4 text-primary" />
                  <h3 className="font-black text-white text-base">
                    {isNewDish ? 'Add Recommended Dish' : 'Edit Recommended Dish'}
                  </h3>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsDishDialogOpen(false)}
                  className="h-8 w-8 rounded-full hover:bg-white/5"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground ml-1">Dish Name</Label>
                  <Input 
                    value={dishName}
                    onChange={(e) => setDishName(e.target.value)}
                    placeholder="e.g. Signature Sourdough Pizza"
                    className="h-11 bg-background/50 border-white/10 rounded-xl"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground ml-1">Price (₹)</Label>
                    <Input 
                      type="number"
                      value={dishPrice}
                      onChange={(e) => setDishPrice(e.target.value)}
                      placeholder="e.g. 450"
                      className="h-11 bg-background/50 border-white/10 rounded-xl"
                    />
                  </div>
                  
                  <div className="space-y-1.5">
                    <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground ml-1">Rating (Optional)</Label>
                    <div className="flex items-center gap-1 h-11 bg-background/50 border border-white/10 rounded-xl px-3 justify-around">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => { haptics.light(); setDishRating(star); }}
                          className="focus:outline-none"
                        >
                          <Star 
                            className={cn(
                              "h-5 w-5 transition-all active:scale-125", 
                              star <= dishRating 
                                ? "text-amber-400 fill-amber-400" 
                                : "text-muted-foreground/30 hover:text-amber-400/50"
                            )} 
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground ml-1">Wishlist Status</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { value: 'neutral', label: 'Neutral', icon: ThumbsUp, color: 'text-muted-foreground', bg: 'bg-muted/50 border-white/5' },
                      { value: 'liked', label: 'Must Try', icon: ThumbsUp, color: 'text-success', bg: 'bg-success/20 border-success/20' },
                      { value: 'not-recommended', label: 'Avoid', icon: ThumbsDown, color: 'text-destructive', bg: 'bg-destructive/20 border-destructive/20' }
                    ].map((opt) => {
                      const isSelected = dishStatus === opt.value;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => { haptics.selection(); setDishStatus(opt.value as any); }}
                          className={cn(
                            "py-2 rounded-xl text-[10px] font-black uppercase border transition-all flex items-center justify-center gap-1.5",
                            isSelected ? opt.bg + " scale-105" : "bg-white/5 border-white/5 text-muted-foreground/60 hover:bg-white/10"
                          )}
                        >
                          <span className={opt.color}>{opt.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground ml-1">Notes / Why Order?</Label>
                  <Textarea 
                    value={dishNotes}
                    onChange={(e) => setDishNotes(e.target.value)}
                    placeholder="e.g. Recommended by foodie blogger. Must ask for extra cheese."
                    className="bg-background/50 border-white/10 rounded-xl min-h-[70px]"
                  />
                </div>

                {/* Dish Images Upload */}
                <div className="space-y-2">
                  <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground ml-1">Reference Images</Label>
                  
                  {dishImages.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-2">
                      {dishImages.map((img, i) => (
                        <div key={i} className="relative h-14 w-18 rounded-lg overflow-hidden border border-white/10">
                          <img src={img} alt="" className="h-full w-full object-cover" />
                          <button
                            type="button"
                            onClick={() => removeImage(i)}
                            className="absolute top-0.5 right-0.5 h-4 w-4 bg-black/60 rounded-full flex items-center justify-center hover:bg-black/80"
                          >
                            <X className="h-2.5 w-2.5 text-white" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => handleAddImage(CameraSource.Camera)}
                      className="h-10 rounded-xl text-[9px] font-black uppercase gap-1.5 border-white/10 bg-white/5"
                    >
                      <Camera className="h-4 w-4" /> Camera
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => handleAddImage(CameraSource.Photos)}
                      className="h-10 rounded-xl text-[9px] font-black uppercase gap-1.5 border-white/10 bg-white/5"
                    >
                      <ImageIcon className="h-4 w-4" /> Gallery
                    </Button>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  variant="outline"
                  onClick={() => setIsDishDialogOpen(false)}
                  className="flex-1 h-11 rounded-xl text-[10px] font-black uppercase border-white/10"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveDish}
                  className="flex-1 h-11 rounded-xl bg-primary text-white text-[10px] font-black uppercase"
                >
                  Save Item
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );

  if (typeof document === 'undefined') return null;
  return createPortal(detailsDrawer, document.body);
});

RecommendationCard.displayName = 'RecommendationCard';
