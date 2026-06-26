import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format } from 'date-fns';
import { 
  X, Plus, Utensils, MapPin, Sparkles, Tag, ChevronDown, ChevronUp, Users, Heart
} from 'lucide-react';
import { createPortal } from 'react-dom';
import { useIsMobile } from '@/hooks/useIsMobile';
import { SwipeToAdd } from '@/components/ui/swipe-to-add';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { DiningRecommendation, Dish, PriceRange } from '@/types/food';
import { foodService } from '@/lib/food-service';
import { DishEditor } from './DishEditor';
import { cn } from '@/lib/utils';
import { haptics } from '@/lib/haptics';
import { toast } from 'sonner';
import { geocoder } from '@/lib/geocoder';
import { LocationPicker } from './LocationPicker';

const recommendationSchema = z.object({
  restaurantName: z.string().min(1, 'Restaurant name is required'),
  cuisine: z.string().optional(),
  priceRange: z.enum(['budget', 'mid', 'premium', 'luxury']).optional(),
  address: z.string().optional(),
  recommendedBy: z.string().optional(),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof recommendationSchema>;

export interface RecommendationEntryFormProps {
  onSubmit?: (recommendation: DiningRecommendation) => void;
  initialData?: DiningRecommendation;
  isEdit?: boolean;
  onClose?: () => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const PRICE_RANGES: { value: PriceRange; label: string; icon: string }[] = [
  { value: 'budget', label: 'Budget', icon: '₹' },
  { value: 'mid', label: 'Mid-Range', icon: '₹₹' },
  { value: 'premium', label: 'Premium', icon: '₹₹₹' },
  { value: 'luxury', label: 'Luxury', icon: '₹₹₹₹' },
];

function FormBody({ onSubmit, initialData, isEdit = false, onClose, onDone }: RecommendationEntryFormProps & { onDone?: () => void }) {
  const [dishes, setDishes] = useState<Dish[]>(initialData?.dishes || []);
  const [expandedDishId, setExpandedDishId] = useState<string | null>(
    initialData?.dishes && initialData.dishes.length > 0 ? initialData.dishes[0].id : null
  );
  const [success, setSuccess] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [resolvedCoords, setResolvedCoords] = useState<{ lat?: number; lng?: number }>(() => ({
    lat: initialData?.location?.lat,
    lng: initialData?.location?.lng,
  }));

  // Auto-scroll to expanded dish editor
  useEffect(() => {
    if (expandedDishId) {
      const timer = setTimeout(() => {
        const el = document.getElementById(`dish-editor-${expandedDishId}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [expandedDishId]);
  
  const { register, handleSubmit, setValue, watch, formState: { errors, isSubmitting }, reset } = useForm<FormData>({
    resolver: zodResolver(recommendationSchema),
    defaultValues: initialData ? {
      restaurantName: initialData.restaurantName,
      cuisine: initialData.cuisine || '',
      priceRange: initialData.priceRange || 'mid',
      address: initialData.location?.address || '',
      recommendedBy: initialData.recommendedBy || '',
      notes: initialData.notes || '',
    } : { 
      priceRange: 'mid'
    },
  });

  useEffect(() => {
    if (initialData) {
      setDishes(initialData.dishes || []);
      setExpandedDishId(initialData.dishes && initialData.dishes.length > 0 ? initialData.dishes[0].id : null);
      setResolvedCoords({
        lat: initialData.location?.lat,
        lng: initialData.location?.lng,
      });
      reset({
        restaurantName: initialData.restaurantName,
        cuisine: initialData.cuisine || '',
        priceRange: initialData.priceRange || 'mid',
        address: initialData.location?.address || '',
        recommendedBy: initialData.recommendedBy || '',
        notes: initialData.notes || '',
      });
    }
  }, [initialData, reset]);

  const selectedPriceRange = watch('priceRange');

  const addDish = () => {
    const newDish: Dish = {
      id: crypto.randomUUID(),
      name: '',
      status: 'neutral',
      notes: '',
      images: [],
    };
    setDishes([...dishes, newDish]);
    setExpandedDishId(newDish.id);
    haptics.medium();
  };

  const updateDish = (index: number, updatedDish: Dish) => {
    const newDishes = [...dishes];
    newDishes[index] = updatedDish;
    setDishes(newDishes);
  };

  const removeDish = (index: number) => {
    const newDishes = [...dishes];
    newDishes.splice(index, 1);
    setDishes(newDishes);
    haptics.medium();
  };

  const [showSuggestions, setShowSuggestions] = useState(false);
  const restaurantName = watch('restaurantName');
  
  const suggestions = useMemo(() => {
    if (!restaurantName || isEdit) return [];
    
    // Suggest from both visited experiences and existing recommendations
    const uniqueVisited = foodService.getUniqueRestaurants();
    const recommendations = foodService.getRecommendations();
    
    const uniqueRecsMap = new Map<string, any>();
    recommendations.forEach(r => {
      if (!uniqueRecsMap.has(r.restaurantName.toLowerCase())) {
        uniqueRecsMap.set(r.restaurantName.toLowerCase(), r);
      }
    });

    const combined = [...uniqueVisited];
    uniqueRecsMap.forEach((r) => {
      if (!combined.some(v => v.restaurantName.toLowerCase() === r.restaurantName.toLowerCase())) {
        combined.push({
          restaurantName: r.restaurantName,
          cuisine: r.cuisine,
          location: r.location,
          priceRange: r.priceRange
        });
      }
    });

    return combined.filter(r => 
      r.restaurantName.toLowerCase().includes(restaurantName.toLowerCase()) &&
      r.restaurantName.toLowerCase() !== restaurantName.toLowerCase()
    ).slice(0, 3);
  }, [restaurantName, isEdit]);

  const [showCuisineSuggestions, setShowCuisineSuggestions] = useState(false);
  const cuisineValue = watch('cuisine');

  const cuisineSuggestions = useMemo(() => {
    const experiences = foodService.getExperiences();
    const recommendations = foodService.getRecommendations();
    
    const uniqueCuisines = Array.from(new Set([
      ...experiences.map(e => e.cuisine?.trim()).filter(Boolean),
      ...recommendations.map(r => r.cuisine?.trim()).filter(Boolean)
    ]));
    
    const val = (cuisineValue || '').trim();
    if (!val) {
      return uniqueCuisines.slice(0, 3);
    }
    
    return uniqueCuisines.filter(c => 
      c.toLowerCase().includes(val.toLowerCase()) &&
      c.toLowerCase() !== val.toLowerCase()
    ).slice(0, 3);
  }, [cuisineValue]);

  const selectSuggestion = (s: any) => {
    setValue('restaurantName', s.restaurantName, { shouldValidate: true });
    if (s.cuisine) setValue('cuisine', s.cuisine);
    if (s.location?.address) setValue('address', s.location.address);
    if (s.priceRange) setValue('priceRange', s.priceRange);
    if (s.location?.lat !== undefined && s.location?.lng !== undefined) {
      setResolvedCoords({ lat: s.location.lat, lng: s.location.lng });
    }
    setShowSuggestions(false);
    haptics.selection();
    toast.info(`Pre-filled details for ${s.restaurantName}`);
  };

  const onFormSubmit = async (data: FormData) => {
    if (isProcessing) return;
    setIsProcessing(true);

    try {
      let lat = resolvedCoords.lat;
      let lng = resolvedCoords.lng;
      let finalAddress = data.address || '';

      // Fallback geocoding if lat/lng are still unresolved
      if (finalAddress && (lat === undefined || lng === undefined)) {
        try {
          const coords = await geocoder.geocode(finalAddress);
          lat = coords.lat;
          lng = coords.lng;
          if (coords.address && !finalAddress) {
            finalAddress = coords.address;
          }
        } catch (e) {
          console.error("Geocoding failed", e);
        }
      }

      const recommendation: DiningRecommendation = {
        id: (isEdit && initialData?.id) ? initialData.id : crypto.randomUUID(),
        restaurantName: data.restaurantName,
        cuisine: data.cuisine,
        priceRange: data.priceRange,
        location: {
          address: finalAddress,
          lat,
          lng,
        },
        recommendedBy: data.recommendedBy,
        notes: data.notes,
        dishes,
        createdAt: initialData?.createdAt || new Date().toISOString(),
      };

      if (isEdit) {
        foodService.updateRecommendation(recommendation);
        toast.success('Recommendation updated');
      } else {
        foodService.addRecommendation(recommendation);
        toast.success('Recommendation saved to wishlist!');
      }

      setSuccess(true);
      await new Promise(r => setTimeout(r, 800));

      if (onSubmit) onSubmit(recommendation);
      if (onDone) onDone();
      onClose?.();
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form className="flex flex-col pb-20 sm:pb-0">
      <div className="relative rounded-3xl mb-6 p-6 overflow-hidden bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/10">
        <div className="absolute top-0 right-0 p-6 opacity-10">
          <Sparkles className="h-20 w-20 rotate-12" />
        </div>
        
        <div className="flex items-center justify-between mb-3 relative z-10">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/60">
            {isEdit ? 'Refine Recommendation' : 'Save Recommendation'}
          </p>
          {!isEdit && (
            <button
              type="button"
              onClick={() => {
                reset({
                  restaurantName: '',
                  cuisine: '',
                  priceRange: 'mid',
                  address: '',
                  recommendedBy: '',
                  notes: '',
                });
                setDishes([]);
                setResolvedCoords({});
                haptics.medium();
                toast.info('Form cleared');
              }}
              className="text-[9px] font-black uppercase tracking-wider text-muted-foreground/60 hover:text-primary hover:underline transition-all"
            >
              Clear Form
            </button>
          )}
        </div>
 
        <div className="space-y-4 relative z-10">
          <div className="space-y-1.5 relative">
            <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Restaurant Name</Label>
            <Input
              {...register('restaurantName')}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
              placeholder="e.g. The Glass House"
              className="h-12 bg-background/50 border-white/10 text-lg font-bold placeholder:text-muted-foreground/30 focus:border-primary/50 transition-all rounded-2xl"
              autoComplete="off"
            />
            
            <AnimatePresence>
              {showSuggestions && suggestions.length > 0 && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="absolute top-full left-0 right-0 z-50 mt-2 bg-card/90 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden p-1"
                >
                  <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60 px-3 py-2 border-b border-white/5">Previous Suggestions</p>
                  {suggestions.map((s, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => selectSuggestion(s)}
                      className="w-full px-4 py-3 text-left hover:bg-primary/10 transition-colors flex items-center justify-between group"
                    >
                      <div className="flex flex-col">
                        <span className="text-sm font-bold group-hover:text-primary transition-colors">{s.restaurantName}</span>
                        {s.cuisine && <span className="text-[10px] text-muted-foreground/60">{s.cuisine}</span>}
                      </div>
                      <Plus className="h-4 w-4 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
            
            {errors.restaurantName && <p className="text-xs text-destructive">{errors.restaurantName.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5 relative">
              <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Cuisine</Label>
              <Input
                {...register('cuisine')}
                onFocus={() => setShowCuisineSuggestions(true)}
                onBlur={() => setTimeout(() => setShowCuisineSuggestions(false), 200)}
                placeholder="e.g. Italian"
                className="h-11 bg-background/50 border-white/10 text-sm font-medium rounded-2xl"
                autoComplete="off"
              />

              <AnimatePresence>
                {showCuisineSuggestions && cuisineSuggestions.length > 0 && (
                  <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute top-full left-0 right-0 z-50 mt-2 bg-card/90 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden p-1 min-w-[140px]"
                  >
                    <p className="text-[8px] font-black uppercase tracking-widest text-muted-foreground/60 px-3 py-1.5 border-b border-white/5">Cuisines</p>
                    {cuisineSuggestions.map((c, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setValue('cuisine', c, { shouldValidate: true });
                          setShowCuisineSuggestions(false);
                          haptics.selection();
                        }}
                        className="w-full px-3 py-2 text-left hover:bg-primary/10 transition-colors flex items-center justify-between group text-xs rounded-xl"
                      >
                        <span className="font-bold group-hover:text-primary transition-colors">{c}</span>
                        <Plus className="h-3 w-3 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            
            <div className="space-y-1.5">
              <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Recommended By</Label>
              <div className="relative">
                <Input
                  {...register('recommendedBy')}
                  placeholder="e.g. John, Instagram"
                  className="h-11 bg-background/50 border-white/10 text-sm font-medium rounded-2xl pl-10"
                />
                <Users className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50 pointer-events-none" />
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Location / Address</Label>
            <LocationPicker
              address={watch('address') || ''}
              onChangeAddress={(addr) => setValue('address', addr, { shouldValidate: true })}
              lat={resolvedCoords.lat}
              lng={resolvedCoords.lng}
              onChangeCoords={(coords) => setResolvedCoords(coords)}
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">General Notes</Label>
            <Textarea
              {...register('notes')}
              placeholder="Why was this recommended? Any specific details (e.g. 'Famous for sourdough pizza', 'Make reservations a week in advance')."
              className="bg-background/50 border-white/10 text-sm font-medium rounded-2xl min-h-[80px]"
            />
          </div>
        </div>
      </div>

      <div className="mb-8">
        <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-4 block ml-1">Estimated Price Range</Label>
        <div className="grid grid-cols-4 gap-2">
          {PRICE_RANGES.map((range) => (
            <button
              key={range.value}
              type="button"
              onClick={() => {
                haptics.selection();
                setValue('priceRange', range.value);
              }}
              className={cn(
                "flex flex-col items-center justify-center gap-1.5 py-3 rounded-2xl border transition-all duration-300",
                selectedPriceRange === range.value
                  ? "bg-primary text-white border-transparent shadow-lg scale-105"
                  : "bg-muted/30 border-border/40 text-muted-foreground hover:bg-muted/50"
              )}
            >
              <span className="text-sm font-black">{range.icon}</span>
              <span className="text-[9px] font-bold uppercase tracking-tighter">{range.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-6 mb-10">
        <div className="flex items-center justify-between px-1">
          <div>
            <h3 className="text-sm font-black uppercase tracking-widest">Recommended Dishes to Try</h3>
            <p className="text-[10px] text-muted-foreground">Add specific items you want to order</p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addDish}
            className="rounded-full border-primary/30 text-primary hover:bg-primary/10 gap-1.5 font-bold h-9 px-4"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Dish
          </Button>
        </div>

        <div className="space-y-4">
          <AnimatePresence initial={false}>
            {dishes.map((dish, index) => (
              <motion.div
                key={dish.id}
                id={`dish-editor-${dish.id}`}
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: -20 }}
                transition={{ type: 'spring', damping: 20, stiffness: 300 }}
              >
                <DishEditor
                  dish={dish}
                  isExpanded={expandedDishId === dish.id}
                  onToggle={() => setExpandedDishId(expandedDishId === dish.id ? null : dish.id)}
                  onChange={(updated) => {
                    const isDuplicate = dishes.some((d, idx) => idx !== index && d.name.toLowerCase().trim() === updated.name.toLowerCase().trim() && updated.name.length > 0);
                    if (isDuplicate) {
                      toast.warning(`"${updated.name}" is already in this list`);
                    }
                    updateDish(index, updated);
                  }}
                  onRemove={() => removeDish(index)}
                />
              </motion.div>
            ))}
          </AnimatePresence>

          {dishes.length > 0 && (
            <div className="flex justify-center pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={addDish}
                className="w-full rounded-2xl border-dashed border-primary/30 text-primary hover:bg-primary/5 hover:border-primary/50 gap-2 font-bold h-11 transition-all"
              >
                <Plus className="h-4 w-4" />
                Add Another Dish
              </Button>
            </div>
          )}

          {dishes.length === 0 && (
            <div 
              onClick={addDish}
              className="py-12 border-2 border-dashed border-border/40 rounded-[2rem] flex flex-col items-center justify-center gap-3 text-muted-foreground hover:border-primary/40 hover:bg-primary/5 transition-all cursor-pointer group"
            >
              <div className="h-12 w-12 rounded-2xl bg-muted/50 flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                <Utensils className="h-6 w-6 opacity-40 group-hover:opacity-100 group-hover:text-primary transition-all" />
              </div>
              <div className="text-center">
                <p className="text-sm font-bold">No items listed yet</p>
                <p className="text-[10px] font-medium opacity-60">Tap to add your first recommended item to try</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <SwipeToAdd
        onConfirm={() => handleSubmit(onFormSubmit)()}
        isSubmitting={isSubmitting || isProcessing}
        success={success}
        label={isEdit ? 'Swipe to Update' : 'Swipe to Save Recommendation'}
      />
    </form>
  );
}

export function RecommendationEntryForm({ 
  onSubmit, 
  initialData, 
  isEdit = false, 
  onClose, 
  open: externalOpen,
  onOpenChange
}: RecommendationEntryFormProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = externalOpen !== undefined ? externalOpen : internalOpen;
  const setOpen = onOpenChange || setInternalOpen;
  const isMobile = useIsMobile();

  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  const overlay = (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[9998] flex items-end sm:items-center justify-center p-0 sm:p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-md"
            onClick={() => setOpen(false)}
          />

          <motion.div
            initial={isMobile ? { y: '100%' } : { scale: 0.9, opacity: 0 }}
            animate={isMobile ? { y: 0 } : { scale: 1, opacity: 1 }}
            exit={isMobile ? { y: '100%' } : { scale: 0.9, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 220 }}
            className="relative z-10 w-full sm:max-w-2xl h-[92vh] sm:h-auto sm:max-h-[90vh] bg-background border border-white/10 rounded-t-[2.5rem] sm:rounded-[2.5rem] flex flex-col shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-white/5 shrink-0 bg-card/10">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                  <Heart className="h-4.5 w-4.5 text-primary fill-primary/10" />
                </div>
                <div>
                  <h2 className="text-lg font-black tracking-tight">{isEdit ? 'Edit Recommendation' : 'Add Recommendation'}</h2>
                  <p className="text-[10px] text-muted-foreground/60 font-bold uppercase tracking-widest">Food & Dining Wishlist</p>
                </div>
              </div>
              
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setOpen(false)}
                className="h-10 w-10 rounded-full hover:bg-white/5 text-muted-foreground hover:text-white"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            {/* Scrollable Content Container */}
            <div className="flex-1 overflow-y-auto px-6 py-6 scrollbar-thin">
              <FormBody
                onSubmit={onSubmit}
                initialData={initialData}
                isEdit={isEdit}
                onClose={onClose}
                onDone={() => setOpen(false)}
              />
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  if (typeof document === 'undefined') return null;
  return createPortal(overlay, document.body);
}
