import { useState, useEffect, useRef } from 'react';
import { Check, ChevronRight, ChevronsRight, Lock, Unlock } from 'lucide-react';
import { haptics } from '@/lib/haptics';
import { cn } from '@/lib/utils';

interface SwipeToAddProps {
  onConfirm: () => void;
  isSubmitting: boolean;
  success: boolean;
  label?: string;
}

export function SwipeToAdd({
  onConfirm,
  isSubmitting,
  success,
  label = 'Swipe to Add',
}: SwipeToAddProps) {
  const trackRef  = useRef<HTMLDivElement>(null);
  const thumbRef  = useRef<HTMLDivElement>(null);
  const [pct, setPct]         = useState(0);
  const [dragging, setDragging] = useState(false);
  const [done, setDone]       = useState(false);
  const startX = useRef(0);
  const trackW = useRef(0);
  const THUMB  = 46;
  const THRESH = 0.86;
  const lastTick = useRef(0);
  const triggered = useRef(false);

  const reset = () => { 
    setPct(0); 
    setDone(false); 
    lastTick.current = 0; 
    triggered.current = false;
  };

  useEffect(() => { 
    if (!success && !isSubmitting && done) {
      const timer = setTimeout(reset, 1200);
      return () => clearTimeout(timer);
    }
  }, [success, isSubmitting, done]);

  useEffect(() => { if (!success && !isSubmitting && !done) reset(); }, [success, isSubmitting]);

  const begin = (clientX: number) => {
    if (done || isSubmitting) return;
    startX.current = clientX;
    trackW.current = (trackRef.current?.clientWidth ?? 200) - THUMB - 12;
    setDragging(true);
  };
  const move = (clientX: number) => {
    if (!dragging) return;
    const delta = clientX - startX.current;
    const raw   = Math.min(Math.max(delta / trackW.current, 0), 1);
    setPct(raw);
    
    // Physical resistance feel
    const tick = Math.floor(raw / 0.12);
    if (tick > lastTick.current && raw < THRESH) {
      lastTick.current = tick;
      haptics.selection();
    }

    if (raw >= THRESH && !triggered.current) {
      triggered.current = true;
      setDone(true);
      setDragging(false);
      setPct(1);
      haptics.success();
      onConfirm();
    }
  };
  const end = () => {
    if (!done) { 
      setDragging(false); 
      // Add a spring back effect via CSS
      setPct(0); 
      lastTick.current = 0; 
    }
  };

  const onMouseDown = (e: React.MouseEvent) => begin(e.clientX);
  useEffect(() => {
    if (!dragging) return;
    const mm = (e: MouseEvent) => move(e.clientX);
    const mu = () => end();
    window.addEventListener('mousemove', mm);
    window.addEventListener('mouseup', mu);
    return () => { window.removeEventListener('mousemove', mm); window.removeEventListener('mouseup', mu); };
  }, [dragging, done]);

  const onTouchStart = (e: React.TouchEvent) => begin(e.touches[0].clientX);
  const onTouchMove  = (e: React.TouchEvent) => move(e.touches[0].clientX);
  const onTouchEnd   = () => end();

  // Unique Color Morphing: Violet (262) -> Cyan (186) -> Success Green (152)
  const currentHue = 262 - (pct * (262 - 186));
  const bgColor = success 
    ? 'hsl(152 68% 45%)' 
    : `hsl(${currentHue} 85% ${dragging ? '15%' : '10%'} / 0.15)`;

  return (
    <div
      ref={trackRef}
      className={cn(
        "relative h-[60px] rounded-2xl overflow-hidden select-none border transition-all duration-500",
        success ? "border-emerald-500/50" : "border-white/5 bg-black/20"
      )}
      style={{
        backgroundColor: bgColor,
        boxShadow: success 
          ? '0 0 40px hsl(152 68% 50% / 0.5)' 
          : dragging ? 'inset 0 0 20px rgba(0,0,0,0.4)' : 'none',
      }}
    >
      {/* Liquid Glow Trail */}
      <div 
        className={cn(
          "absolute left-0 top-0 bottom-0 transition-all duration-300 pointer-events-none blur-xl opacity-30",
          success ? "opacity-0" : ""
        )}
        style={{ 
          width: `${pct * 100}%`,
          background: `linear-gradient(90deg, transparent, hsl(${currentHue} 85% 65%))`,
        }}
      />

      {/* Track Background Text */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        {success ? (
          <div className="flex items-center gap-3 text-white font-bold text-sm animate-scale-in">
            <div className="h-7 w-7 rounded-full bg-white/20 flex items-center justify-center shadow-lg">
              <Check className="h-4 w-4" strokeWidth={4} />
            </div>
            <span>Payment Logged</span>
          </div>
        ) : isSubmitting ? (
          <div className="flex flex-col items-center gap-1.5">
            <div className="h-5 w-5 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
          </div>
        ) : (
          <div className={cn(
            "flex items-center gap-2 transition-all duration-300",
            pct > 0.4 ? "opacity-0 -translate-x-4 blur-sm" : "opacity-100 translate-x-4"
          )}>
            <span className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground/30 shimmer-text italic">
              {label}
            </span>
          </div>
        )}
      </div>

      {/* Sliding Thumb */}
      {!success && !isSubmitting && (
        <div
          ref={thumbRef}
          onMouseDown={onMouseDown}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          className={cn(
            "absolute left-1.5 top-1.5 h-[48px] w-[48px] rounded-[14px] flex items-center justify-center",
            "cursor-grab active:cursor-grabbing z-10 shadow-2xl",
            !dragging && "transition-all duration-500 cubic-bezier(0.175, 0.885, 0.32, 1.275)"
          )}
          style={{ 
            transform: `translateX(${pct * trackW.current}px) scale(${dragging ? 1.05 : 1}) rotate(${pct * 15}deg)`,
            background: success 
              ? 'white' 
              : `linear-gradient(135deg, hsl(${currentHue} 85% 65%), hsl(${currentHue + 30} 85% 55%))`,
          }}
        >
          <div className="relative flex items-center justify-center">
            {pct > 0.7 ? (
              <Unlock className="h-5 w-5 text-white animate-in zoom-in duration-300" strokeWidth={2.5} />
            ) : (
              <Lock className="h-5 w-5 text-white/90" strokeWidth={2.5} />
            )}
            
            {/* Pulsing Ring */}
            {!dragging && !done && (
              <div className="absolute inset-0 rounded-full border-2 border-white/50 animate-ping opacity-20" />
            )}
            
            {/* Shimmer overlay */}
            <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/30 to-transparent rotate-45 -translate-x-full animate-shine pointer-events-none" />
          </div>
          
          {/* Magnet Indicator */}
          {pct > 0.6 && (
            <div className="absolute -right-8 top-1/2 -translate-y-1/2 opacity-40 animate-pulse">
              <ChevronRight className="h-4 w-4 text-white" />
            </div>
          )}
        </div>
      )}
      
      {/* Progress Notch (Unique Detail) */}
      <div className="absolute right-4 top-1/2 -translate-y-1/2 h-1 w-1 rounded-full bg-white/10" />
      <div className="absolute right-8 top-1/2 -translate-y-1/2 h-1 w-1 rounded-full bg-white/5" />
    </div>
  );
}
