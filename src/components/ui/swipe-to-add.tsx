import { useState, useEffect, useRef } from 'react';
import { motion, useMotionValue, useTransform, useSpring } from 'framer-motion';
import { Check, ChevronRight, Lock, Unlock } from 'lucide-react';
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
  const [done, setDone] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const THUMB_SIZE = 50;
  const PADDING = 6;
  
  // Calculate drag constraints based on track width
  const [dragWidth, setDragWidth] = useState(200);
  useEffect(() => {
    if (trackRef.current) {
      setDragWidth(trackRef.current.offsetWidth - THUMB_SIZE - PADDING * 2);
    }
  }, []);

  const pct = useTransform(x, [0, dragWidth], [0, 1]);
  
  const currentHue = useTransform(pct, [0, 1], [262, 186]);
  const bgColor = useTransform(pct, [0, 1], [
    'rgba(139, 92, 246, 0.1)', // Violet
    'rgba(6, 182, 212, 0.2)'    // Cyan
  ]);

  const trailBg = useTransform(currentHue, h => `linear-gradient(90deg, transparent, hsl(${h} 85% 65%))`);
  const labelOpacity = useTransform(pct, [0, 0.4], [1, 0]);
  const labelX = useTransform(pct, [0, 0.4], [20, 0]);
  const thumbBg = useTransform(currentHue, h => `linear-gradient(135deg, hsl(${h} 85% 65%), hsl(${h + 30} 85% 55%))`);
  const magnetOpacity = useTransform(pct, [0.6, 0.9], [0, 1]);

  const lastTick = useRef(0);
  const isTriggered = useRef(false);

  useEffect(() => {
    isTriggered.current = false;
  }, [success, isSubmitting]);

  useEffect(() => {
    return pct.on('change', (v) => {
      if (done || success || isSubmitting || isTriggered.current) return;
      
      const tick = Math.floor(v / 0.15);
      if (tick > lastTick.current && v < 0.9) {
        lastTick.current = tick;
        haptics.selection();
      }

      if (v >= 0.98 && !done && !isTriggered.current) {
        isTriggered.current = true;
        setDone(true);
        haptics.success();
        onConfirm();
      }
    });
  }, [done, success, isSubmitting, onConfirm]);

  useEffect(() => {
    if (!success && !isSubmitting && done) {
      const timer = setTimeout(() => {
        setDone(false);
        x.set(0);
        lastTick.current = 0;
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, [success, isSubmitting, done, x]);

  return (
    <div
      ref={trackRef}
      className={cn(
        "relative h-[64px] rounded-2xl overflow-hidden select-none border transition-all duration-500",
        success ? "border-emerald-500/50" : "border-white/5 bg-black/20"
      )}
      style={{
        backgroundColor: success ? 'hsl(152 68% 25% / 0.3)' : undefined,
      }}
    >
      <motion.div 
        className="absolute inset-0"
        style={{ backgroundColor: success ? 'transparent' : bgColor }}
      />

      {/* Liquid Glow Trail */}
      <motion.div 
        className={cn(
          "absolute left-0 top-0 bottom-0 transition-opacity duration-300 pointer-events-none blur-xl opacity-30",
          success ? "opacity-0" : ""
        )}
        style={{ 
          width: x,
          background: trailBg,
        }}
      />

      {/* Track Background Text */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        {success ? (
          <motion.div 
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="flex items-center gap-3 text-white font-bold text-sm"
          >
            <div className="h-7 w-7 rounded-full bg-emerald-500 flex items-center justify-center shadow-lg">
              <Check className="h-4 w-4" strokeWidth={4} />
            </div>
            <span>Success</span>
          </motion.div>
        ) : isSubmitting ? (
          <div className="h-5 w-5 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
        ) : (
          <motion.div 
            style={{ opacity: labelOpacity, x: labelX }}
            className="flex items-center gap-2"
          >
            <span className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground/30 shimmer-text italic">
              {label}
            </span>
          </motion.div>
        )}
      </div>

      {/* Sliding Thumb */}
      {!success && !isSubmitting && (
        <motion.div
          drag="x"
          dragConstraints={{ left: 0, right: dragWidth }}
          dragElastic={0.05}
          dragMomentum={false}
          style={{ x }}
          onDragEnd={() => {
            if (pct.get() < 0.98) {
              x.set(0);
            }
          }}
          className={cn(
            "absolute left-[6px] top-[6px] h-[50px] w-[50px] rounded-[14px] flex items-center justify-center",
            "cursor-grab active:cursor-grabbing z-10 shadow-2xl",
          )}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <motion.div 
            className="absolute inset-0 rounded-[14px]"
            style={{ 
              background: thumbBg 
            }}
          />
          <div className="relative flex items-center justify-center">
            {done ? (
              <Unlock className="h-5 w-5 text-white" strokeWidth={2.5} />
            ) : (
              <Lock className="h-5 w-5 text-white/90" strokeWidth={2.5} />
            )}
            
            {/* Shimmer overlay */}
            <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/30 to-transparent rotate-45 -translate-x-full animate-shine pointer-events-none" />
          </div>
          
          {/* Magnet Indicator */}
          <motion.div 
            style={{ opacity: magnetOpacity }}
            className="absolute -right-8 top-1/2 -translate-y-1/2"
          >
            <ChevronRight className="h-4 w-4 text-white" />
          </motion.div>
        </motion.div>
      )}
      
      {/* Progress Notch */}
      <div className="absolute right-4 top-1/2 -translate-y-1/2 h-1 w-1 rounded-full bg-white/10" />
      <div className="absolute right-8 top-1/2 -translate-y-1/2 h-1 w-1 rounded-full bg-white/5" />
    </div>
  );
}
