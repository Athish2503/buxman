import { useState, useEffect, useRef } from 'react';
import { motion, useMotionValue, useTransform, AnimatePresence, animate } from 'framer-motion';
import { Check, ChevronRight, ArrowRight, Sparkles, Zap } from 'lucide-react';
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
  label = 'Swipe to Log',
}: SwipeToAddProps) {
  const [done, setDone] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  
  const THUMB_SIZE = 54;
  const PADDING = 6;
  
  const [dragWidth, setDragWidth] = useState(200);
  useEffect(() => {
    if (trackRef.current) {
      const width = trackRef.current.offsetWidth - THUMB_SIZE - PADDING * 2;
      setDragWidth(width);
    }
  }, []);

  const pct = useTransform(x, [0, dragWidth], [0, 1]);
  
  // Dynamic styling
  const currentHue = useTransform(pct, [0, 1], [262, 186]);
  const bgColor = useTransform(pct, [0, 1], [
    'rgba(0, 0, 0, 0.4)',
    'rgba(139, 92, 246, 0.1)'
  ]);

  const labelOpacity = useTransform(pct, [0, 0.3], [1, 0]);
  const labelBlur = useTransform(pct, [0, 0.3], [0, 4]);
  const thumbBg = useTransform(currentHue, h => `linear-gradient(135deg, hsl(${h} 85% 65%), hsl(${h + 40} 85% 55%))`);
  const arrowRotate = useTransform(pct, [0, 1], [0, 360]);
  const arrowScale = useTransform(pct, [0, 0.8, 1], [1, 0.8, 1.2]);

  const isTriggered = useRef(false);

  useEffect(() => {
    const unsubscribe = pct.on('change', (v) => {
      if (v >= 0.99 && !isTriggered.current && !success && !isSubmitting) {
        isTriggered.current = true;
        setDone(true);
        haptics.success();
        onConfirm();
      }
    });
    return () => unsubscribe();
  }, [onConfirm, success, isSubmitting]);

  // Handle reset after success/failure
  useEffect(() => {
    if (!success && !isSubmitting && done) {
      const timer = setTimeout(() => {
        setDone(false);
        isTriggered.current = false;
        animate(x, 0, { type: 'spring', stiffness: 300, damping: 30 });
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [success, isSubmitting, done, x]);

  const handleDragEnd = () => {
    const currentPct = pct.get();
    if (currentPct > 0.5) {
      // Auto-complete if more than half
      animate(x, dragWidth, { 
        type: 'spring', 
        stiffness: 400, 
        damping: 30,
        onComplete: () => {
          if (!isTriggered.current) {
            isTriggered.current = true;
            setDone(true);
            haptics.success();
            onConfirm();
          }
        }
      });
    } else {
      // Snap back
      animate(x, 0, { type: 'spring', stiffness: 400, damping: 30 });
    }
  };

  return (
    <div
      ref={trackRef}
      className={cn(
        "relative h-[68px] rounded-[2rem] overflow-hidden select-none border-2 transition-all duration-700",
        success ? "border-emerald-500/50 shadow-[0_0_30px_rgba(16,185,129,0.2)]" : "border-white/5 bg-black/40 shadow-inner"
      )}
    >
      <motion.div className="absolute inset-0" style={{ backgroundColor: success ? 'rgba(16, 185, 129, 0.1)' : bgColor }} />

      {/* Progress Glow */}
      <motion.div 
        className="absolute left-0 top-0 bottom-0 blur-2xl opacity-20 pointer-events-none"
        style={{ width: x, background: thumbBg }}
      />

      {/* Track Label */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <AnimatePresence mode="wait">
          {success ? (
            <motion.div 
              key="success"
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="flex items-center gap-3 text-emerald-400 font-black text-xs uppercase tracking-[0.2em]"
            >
              <Check className="h-5 w-5" strokeWidth={4} />
              <span>Logged Successfully</span>
            </motion.div>
          ) : isSubmitting ? (
            <motion.div 
              key="submitting"
              className="flex items-center gap-3"
            >
              <div className="h-5 w-5 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
              <span className="text-[10px] font-black uppercase tracking-widest text-primary/60">Processing...</span>
            </motion.div>
          ) : (
            <motion.div 
              key="label"
              style={{ opacity: labelOpacity, filter: `blur(${labelBlur}px)` }}
              className="flex items-center gap-3"
            >
              <Zap className="h-3 w-3 text-white/20 animate-pulse" />
              <span className="text-[11px] font-black uppercase tracking-[0.3em] text-white/20 shimmer-text italic">
                {label}
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Sliding Thumb */}
      {!success && !isSubmitting && (
        <motion.div
          drag="x"
          dragConstraints={{ left: 0, right: dragWidth }}
          dragElastic={0}
          dragMomentum={false}
          style={{ x }}
          onDragStart={() => haptics.light()}
          onDragEnd={handleDragEnd}
          className={cn(
            "absolute left-[6px] top-[6px] h-[52px] w-[52px] rounded-[1.4rem] flex items-center justify-center",
            "cursor-grab active:cursor-grabbing z-10 shadow-2xl transition-shadow",
            "bg-white/10 backdrop-blur-xl border border-white/20"
          )}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98, boxShadow: "0 0 20px rgba(255,255,255,0.2)" }}
        >
          <motion.div 
            className="absolute inset-0 rounded-[1.4rem] opacity-90"
            style={{ background: thumbBg }}
          />
          
          <motion.div className="relative flex items-center justify-center" style={{ rotate: arrowRotate, scale: arrowScale }}>
            <AnimatePresence mode="wait">
              {done ? (
                <motion.div key="sparkles" initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-white">
                  <Sparkles className="h-6 w-6 fill-white" />
                </motion.div>
              ) : (
                <motion.div key="arrow" initial={{ x: -5, opacity: 0 }} animate={{ x: 0, opacity: 1 }} className="text-white">
                  <ArrowRight className="h-6 w-6" strokeWidth={3} />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      )}

      {/* Visual Magnetism Indicators */}
      <div className="absolute right-4 top-1/2 -translate-y-1/2 flex gap-1.5 opacity-20 pointer-events-none">
        <ChevronRight className="h-4 w-4 text-white animate-pulse" />
        <ChevronRight className="h-4 w-4 text-white animate-pulse delay-75" />
      </div>
    </div>
  );
}
