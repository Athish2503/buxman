import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Camera, Image as ImageIcon, Trash2, Star, 
  ThumbsUp, ThumbsDown, Minus, X, Plus 
} from 'lucide-react';
import { Camera as CapacitorCamera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Dish, DishStatus } from '@/types/food';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { RichTextToolbar } from './RichTextToolbar';
import { cn } from '@/lib/utils';
import { haptics } from '@/lib/haptics';
import { toast } from 'sonner';

interface DishEditorProps {
  dish: Dish;
  isExpanded?: boolean;
  onToggle?: () => void;
  onChange: (dish: Dish) => void;
  onRemove: () => void;
}

export function DishEditor({ dish, isExpanded = true, onToggle, onChange, onRemove }: DishEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleAction = (action: string) => {
    if (!textareaRef.current) return;
    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const selected = text.substring(start, end);
    
    let replacement = '';
    switch (action) {
      case 'bold': replacement = `**${selected}**`; break;
      case 'italic': replacement = `*${selected}*`; break;
      case 'heading': replacement = `\n## ${selected}`; break;
      case 'list': replacement = `\n- ${selected}`; break;
      case 'quote': replacement = `\n> ${selected}`; break;
      case 'highlight': replacement = `==${selected}==`; break;
    }

    const newValue = text.substring(0, start) + replacement + text.substring(end);
    onChange({ ...dish, notes: newValue });
    
    // Reset focus and selection
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + replacement.length, start + replacement.length);
    }, 0);
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
        onChange({ ...dish, images: [...dish.images, b64] });
        haptics.success();
      }
    } catch (error: any) {
      if (error?.message !== 'User cancelled photos app') {
        toast.error('Could not capture image');
      }
    }
  };

  const removeImage = (index: number) => {
    const newImages = [...dish.images];
    newImages.splice(index, 1);
    onChange({ ...dish, images: newImages });
  };

  const statusOptions: { value: DishStatus; label: string; icon: any; color: string; bg: string }[] = [
    { value: 'liked', label: 'Liked', icon: ThumbsUp, color: 'text-success', bg: 'bg-success/10' },
    { value: 'neutral', label: 'Neutral', icon: Minus, color: 'text-muted-foreground', bg: 'bg-muted/50' },
    { value: 'not-recommended', label: 'Avoid', icon: ThumbsDown, color: 'text-destructive', bg: 'bg-destructive/10' },
  ];

  return (
    <div className={cn(
      "relative rounded-2xl bg-card/40 border border-border/40 transition-all duration-300 overflow-hidden",
      isExpanded ? "p-4 space-y-4" : "p-3 hover:bg-card/60"
    )}>
      {/* Remove Button (always visible but smaller when collapsed) */}
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onRemove(); }}
        className={cn(
          "absolute rounded-full bg-destructive/90 text-white flex items-center justify-center shadow-lg active:scale-90 transition-all z-10",
          isExpanded ? "-top-2 -right-2 h-8 w-8" : "top-2 right-2 h-6 w-6 opacity-0 group-hover:opacity-100"
        )}
      >
        <X className="h-3.5 w-3.5" />
      </button>

      {/* Header/Compact View */}
      <div 
        className={cn("flex items-center gap-3 cursor-pointer", !isExpanded && "group")}
        onClick={onToggle}
      >
        {!isExpanded && dish.images[0] && (
          <div className="h-10 w-10 rounded-lg overflow-hidden shrink-0 shadow-sm border border-border/20">
            <img src={dish.images[0]} alt="" className="h-full w-full object-cover" />
          </div>
        )}

        <div className="flex-1 min-w-0">
          {isExpanded ? (
            <Input
              value={dish.name}
              onChange={(e) => onChange({ ...dish, name: e.target.value })}
              placeholder="Dish Name (e.g. Truffle Pasta)"
              className="bg-background/50 border-border/40 font-bold h-10"
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <div className="flex items-center justify-between gap-2">
              <div className="flex flex-col">
                <span className={cn("font-bold truncate text-sm", !dish.name && "text-muted-foreground italic")}>
                  {dish.name || "Untitled Dish"}
                </span>
                {dish.notes && (
                  <span className="text-[10px] text-muted-foreground truncate opacity-60">
                    {dish.notes.replace(/[#*`>_-]/g, '').slice(0, 40)}...
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {dish.status !== 'neutral' && (
                  <div className={cn(
                    "h-6 w-6 rounded-full flex items-center justify-center",
                    dish.status === 'liked' ? "bg-success/20 text-success" : "bg-destructive/20 text-destructive"
                  )}>
                    {dish.status === 'liked' ? <ThumbsUp className="h-3 w-3" /> : <ThumbsDown className="h-3 w-3" />}
                  </div>
                )}
                {dish.rating && (
                  <div className="flex items-center gap-1 bg-amber-400/10 px-2 py-0.5 rounded-full">
                    <Star className="h-2.5 w-2.5 text-amber-400 fill-amber-400" />
                    <span className="text-[10px] font-black text-amber-500">{dish.rating}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {isExpanded && (
          <div className="flex items-center gap-1 bg-muted/30 p-1 rounded-lg border border-border/40 shrink-0" onClick={(e) => e.stopPropagation()}>
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => {
                  haptics.light();
                  onChange({ ...dish, rating: star });
                }}
                className="p-0.5 transition-all active:scale-125"
              >
                <Star 
                  className={cn(
                    "h-4 w-4", 
                    (dish.rating || 0) >= star ? "text-amber-400 fill-amber-400" : "text-muted-foreground/30"
                  )} 
                />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Expanded Content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="space-y-4 pt-2"
          >
            <div className="grid grid-cols-3 gap-2">
              {statusOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    haptics.selection();
                    onChange({ ...dish, status: opt.value });
                  }}
                  className={cn(
                    "flex flex-col items-center justify-center gap-1.5 py-2.5 rounded-xl border transition-all duration-200",
                    dish.status === opt.value 
                      ? `${opt.bg} border-transparent shadow-sm` 
                      : "bg-background/20 border-border/20 text-muted-foreground hover:bg-muted/30"
                  )}
                >
                  <opt.icon className={cn("h-4 w-4", dish.status === opt.value ? opt.color : "text-muted-foreground/50")} />
                  <span className={cn("text-[10px] font-black uppercase tracking-widest", dish.status === opt.value ? opt.color : "text-muted-foreground/60")}>
                    {opt.label}
                  </span>
                </button>
              ))}
            </div>

            <div className="space-y-2">
              <RichTextToolbar onAction={handleAction} />
              <Textarea
                ref={textareaRef}
                value={dish.notes}
                onChange={(e) => onChange({ ...dish, notes: e.target.value })}
                placeholder="What did you love (or hate) about it? Mention spices, texture, etc."
                className="bg-background/30 border-border/40 min-h-[80px] text-sm resize-none focus:border-primary/40"
              />
            </div>

            <div className="space-y-2">
              <div className="flex flex-wrap gap-2">
                {dish.images.map((img, idx) => (
                  <div key={idx} className="relative h-20 w-20 rounded-xl overflow-hidden border border-border/40 shadow-sm group">
                    <img src={img} alt="Dish" className="h-full w-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeImage(idx)}
                      className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
                    >
                      <Trash2 className="h-5 w-5 text-white" />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => handleAddImage(CameraSource.Camera)}
                  className="h-20 w-20 rounded-xl border-2 border-dashed border-border/40 flex flex-col items-center justify-center gap-1 text-muted-foreground hover:border-primary/40 hover:text-primary active:bg-primary/5 transition-all"
                >
                  <Camera className="h-5 w-5" />
                  <span className="text-[9px] font-bold uppercase tracking-widest">Camera</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleAddImage(CameraSource.Photos)}
                  className="h-20 w-20 rounded-xl border-2 border-dashed border-border/40 flex flex-col items-center justify-center gap-1 text-muted-foreground hover:border-primary/40 hover:text-primary active:bg-primary/5 transition-all"
                >
                  <ImageIcon className="h-5 w-5" />
                  <span className="text-[9px] font-bold uppercase tracking-widest">Gallery</span>
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
