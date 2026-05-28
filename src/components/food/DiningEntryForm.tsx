import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format } from 'date-fns';
import { 
  X, Plus, Utensils, MapPin, CalendarDays, 
  IndianRupee, Sparkles, Tag, ChevronDown, ChevronUp
} from 'lucide-react';
import { createPortal } from 'react-dom';
import { useIsMobile } from '@/hooks/useIsMobile';
import { SwipeToAdd } from '@/components/ui/swipe-to-add';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { DiningExperience, Dish, PriceRange } from '@/types/food';
import { foodService } from '@/lib/food-service';
import { DishEditor } from './DishEditor';
import { cn } from '@/lib/utils';
import { haptics } from '@/lib/haptics';
import { toast } from 'sonner';
import { geocoder } from '@/lib/geocoder';
import { LocationPicker } from './LocationPicker';

const experienceSchema = z.object({
  restaurantName: z.string().min(1, 'Restaurant name is required'),
  visitDate: z.string().optional().nullable(),
  cuisine: z.string().optional(),
  priceRange: z.enum(['budget', 'mid', 'premium', 'luxury']).optional(),
  address: z.string().optional(),
});

type FormData = z.infer<typeof experienceSchema>;

export interface DiningEntryFormProps {
  onSubmit?: (experience: DiningExperience) => void;
  initialData?: DiningExperience;
  isEdit?: boolean;
  onClose?: () => void;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const PRICE_RANGES: { value: PriceRange; label: string; icon: string }[] = [
  { value: 'budget', label: 'Budget', icon: '₹' },
  { value: 'mid', label: 'Mid-Range', icon: '₹₹' },
  { value: 'premium', label: 'Premium', icon: '₹₹₹' },
  { value: 'luxury', label: 'Luxury', icon: '₹₹₹₹' },
];

function FormBody({ onSubmit, initialData, isEdit = false, onClose, onDone }: DiningEntryFormProps & { onDone?: () => void }) {
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
    resolver: zodResolver(experienceSchema),
    defaultValues: initialData ? {
      restaurantName: initialData.restaurantName,
      visitDate: initialData.visitDate ? format(new Date(initialData.visitDate), 'yyyy-MM-dd') : '',
      cuisine: initialData.cuisine || '',
      priceRange: initialData.priceRange || 'mid',
      address: initialData.location?.address || '',
    } : { 
      visitDate: format(new Date(), 'yyyy-MM-dd'),
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
        visitDate: initialData.visitDate ? format(new Date(initialData.visitDate), 'yyyy-MM-dd') : '',
        cuisine: initialData.cuisine || '',
        priceRange: initialData.priceRange || 'mid',
        address: initialData.location?.address || '',
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
    const unique = foodService.getUniqueRestaurants();
    return unique.filter(r => 
      r.restaurantName.toLowerCase().includes(restaurantName.toLowerCase()) &&
      r.restaurantName.toLowerCase() !== restaurantName.toLowerCase()
    ).slice(0, 3);
  }, [restaurantName, isEdit]);

  const [showCuisineSuggestions, setShowCuisineSuggestions] = useState(false);
  const cuisineValue = watch('cuisine');

  const cuisineSuggestions = useMemo(() => {
    const experiences = foodService.getExperiences();
    const uniqueCuisines = Array.from(new Set(
      experiences.map(e => e.cuisine?.trim()).filter(Boolean)
    ));
    
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

      const experience: DiningExperience = {
        id: (isEdit && initialData?.id) ? initialData.id : crypto.randomUUID(),
        restaurantName: data.restaurantName,
        visitDate: data.visitDate || null,
        cuisine: data.cuisine,
        priceRange: data.priceRange,
        location: {
          address: finalAddress,
          lat,
          lng,
        },
        dishes,
        createdAt: initialData?.createdAt || new Date().toISOString(),
      };

      if (isEdit) {
        foodService.updateExperience(experience);
        toast.success('Experience updated');
      } else {
        foodService.addExperience(experience);
        toast.success('Experience logged! Check your dashboard.');
      }

      setSuccess(true);
      await new Promise(r => setTimeout(r, 800));

      if (onSubmit) onSubmit(experience);
      if (onDone) onDone();
      onClose?.();
    } finally {
      setIsProcessing(false);
    }
  };

  // Address is managed via controlled LocationPicker component

  return (
    <form className="flex flex-col pb-20 sm:pb-0">
      <div className="relative rounded-3xl mb-6 p-6 overflow-hidden bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/10">
        <div className="absolute top-0 right-0 p-6 opacity-10">
          <Utensils className="h-20 w-20 rotate-12" />
        </div>
        
        <div className="flex items-center justify-between mb-3 relative z-10">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/60">
            {isEdit ? 'Refine Experience' : 'New Culinary Log'}
          </p>
          {!isEdit && (
            <button
              type="button"
              onClick={() => {
                reset({
                  restaurantName: '',
                  visitDate: format(new Date(), 'yyyy-MM-dd'),
                  cuisine: '',
                  priceRange: 'mid',
                  address: '',
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
                  <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60 px-3 py-2 border-b border-white/5">Previous Visits</p>
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
              <div className="flex items-center justify-between ml-1">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Date</Label>
                {watch('visitDate') && (
                  <button
                    type="button"
                    onClick={() => {
                      setValue('visitDate', '', { shouldValidate: true });
                      haptics.light();
                    }}
                    className="text-[9px] font-bold uppercase text-primary hover:underline"
                  >
                    Set Undated
                  </button>
                )}
              </div>
              <div className="relative">
                <Input
                  type="date"
                  {...register('visitDate')}
                  className="h-11 bg-background/50 border-white/10 text-sm font-medium rounded-2xl pr-10"
                />
                <CalendarDays className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
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
        </div>
      </div>

      <div className="mb-8">
        <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-4 block ml-1">Price Range</Label>
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
            <h3 className="text-sm font-black uppercase tracking-widest">Dishes & Drinks</h3>
            <p className="text-[10px] text-muted-foreground">Log individual items you tried</p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addDish}
            className="rounded-full border-primary/30 text-primary hover:bg-primary/10 gap-1.5 font-bold h-9 px-4"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Item
          </Button>
        </div>

        {/* Previously Ordered Items (Quick Add) */}
        {!isEdit && restaurantName && (
          <div className="px-1">
            {(() => {
              const prevDishes = foodService.getDishesByRestaurant(restaurantName);
              const currentNames = dishes.map(d => d.name.toLowerCase().trim());
              const suggestions = prevDishes.filter(pd => !currentNames.includes(pd.name.toLowerCase().trim()));
              
              if (suggestions.length === 0) return null;
              
              return (
                <div className="space-y-3 p-4 rounded-3xl bg-white/5 border border-white/5">
                  <p className="text-[9px] font-black uppercase tracking-widest text-primary/60">Ordered Before</p>
                  <div className="flex flex-wrap gap-2">
                    {suggestions.map(pd => (
                      <button
                        key={pd.id}
                        type="button"
                        onClick={() => {
                          setDishes([...dishes, { ...pd, id: crypto.randomUUID(), images: [] }]);
                          haptics.light();
                          toast.info(`Added ${pd.name} from previous visit`);
                        }}
                        className="px-3 py-1.5 rounded-xl bg-background/50 border border-white/5 text-[10px] font-bold hover:bg-primary/10 hover:border-primary/30 transition-all flex items-center gap-2 group"
                      >
                        <Plus className="h-3 w-3 text-muted-foreground group-hover:text-primary" />
                        {pd.name}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })()}
          </div>
        )}

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
                Add Another Item
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
                <p className="text-sm font-bold">No dishes logged yet</p>
                <p className="text-[10px] font-medium opacity-60">Tap to add your first dish or drink</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <SwipeToAdd
        onConfirm={() => handleSubmit(onFormSubmit)()}
        isSubmitting={isSubmitting || isProcessing}
        success={success}
        label={isEdit ? 'Swipe to Update' : 'Swipe to Log Experience'}
      />
    </form>
  );
}

export function DiningEntryForm({ 
  onSubmit, 
  initialData, 
  isEdit = false, 
  onClose, 
  trigger,
  open: externalOpen,
  onOpenChange
}: DiningEntryFormProps) {
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
            drag={isMobile ? "y" : false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.8 }}
            onDragEnd={(_, info) => {
              if (isMobile && info.offset.y > 100) {
                setOpen(false);
              }
            }}
            initial={isMobile ? { y: "100%" } : { opacity: 0, scale: 0.95, y: 20 }}
            animate={isMobile ? { y: 0 } : { opacity: 1, scale: 1, y: 0 }}
            exit={isMobile ? { y: "100%" } : { opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className={cn(
              "relative w-full z-[9999] overflow-hidden bg-background",
              isMobile ? "rounded-t-[3rem] h-[95dvh]" : "max-w-2xl rounded-[2.5rem] border border-white/10 shadow-2xl h-[90vh]"
            )}
            style={{ display: 'flex', flexDirection: 'column' }}
          >
            {isMobile && (
              <div className="flex justify-center pt-4 pb-2 shrink-0">
                <div className="h-1.5 w-12 rounded-full bg-muted-foreground/20" />
              </div>
            )}
            
            <div className="flex items-center justify-between px-8 py-5 border-b border-white/5 shrink-0">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-2xl bg-gradient-primary flex items-center justify-center shadow-glow">
                  <Sparkles className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-black tracking-tight leading-none">Dining Entry</h2>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1">Capture the moment</p>
                </div>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="h-10 w-10 rounded-2xl bg-muted/50 flex items-center justify-center text-muted-foreground hover:text-foreground active:scale-90 transition-all"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 px-8 py-6 no-scrollbar" style={{ overscrollBehavior: 'contain' }}>
              <FormBody 
                onSubmit={(exp) => {
                  onSubmit?.(exp);
                  setOpen(false);
                }} 
                onDone={() => setOpen(false)} 
                initialData={initialData}
                isEdit={isEdit}
              />
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  return (
    <>
      <div onClick={() => setOpen(true)} className="contents">
        {trigger}
      </div>
      {createPortal(overlay, document.body)}
    </>
  );
}
