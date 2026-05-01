import { useState, useEffect, useRef } from 'react';
import { Check } from 'lucide-react';
import { haptics } from '@/lib/haptics';

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
  const [pct, setPct]         = useState(0);      // 0-1 progress
  const [dragging, setDragging] = useState(false);
  const [done, setDone]       = useState(false);
  const startX = useRef(0);
  const trackW = useRef(0);
  const THUMB  = 52; // thumb width in px
  const THRESH = 0.82;
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
      // If we are "done" but not submitting/success, it means validation failed or something went wrong.
      // Reset after a short delay so the user can see it reached the end.
      const timer = setTimeout(reset, 1000);
      return () => clearTimeout(timer);
    }
  }, [success, isSubmitting, done]);

  useEffect(() => { if (!success && !isSubmitting && !done) reset(); }, [success, isSubmitting]);

  const begin = (clientX: number) => {
    if (done || isSubmitting) return;
    startX.current = clientX;
    trackW.current = (trackRef.current?.clientWidth ?? 200) - THUMB - 8;
    setDragging(true);
  };
  const move = (clientX: number) => {
    if (!dragging) return;
    const delta = clientX - startX.current;
    const raw   = Math.min(Math.max(delta / trackW.current, 0), 1);
    setPct(raw);
    
    const tick = Math.floor(raw / 0.15);
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
    if (!done) { setDragging(false); setPct(0); lastTick.current = 0; }
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

  const fillOpacity = Math.max(0.15, pct);

  return (
    <div
      ref={trackRef}
      className="relative h-[52px] rounded-2xl overflow-hidden select-none cursor-grab active:cursor-grabbing"
      style={{
        background: success
          ? 'linear-gradient(135deg, #10b981, #06b6d4)'
          : `linear-gradient(135deg, hsl(262 85% 65% / ${fillOpacity}), hsl(186 95% 52% / ${fillOpacity * 0.6}))`,
        boxShadow: success ? '0 0 24px hsl(152 68% 50% / 0.5)' : '0 0 24px hsl(262 85% 65% / 0.3)',
        border: '1px solid hsl(262 85% 65% / 0.35)',
        transition: success ? 'background 0.4s, box-shadow 0.4s' : undefined,
      }}
    >
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        {success ? (
          <span className="flex items-center gap-2 text-white font-bold text-sm">
            <Check className="h-4 w-4" strokeWidth={3} /> Success!
          </span>
        ) : isSubmitting ? (
          <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        ) : (
          <span
            className="text-sm font-bold tracking-wide"
            style={{ color: `hsl(220 15% 94% / ${0.4 + pct * 0.6})` }}
          >
            {label}
          </span>
        )}
      </div>

      {!success && !isSubmitting && (
        <div
          ref={thumbRef}
          onMouseDown={onMouseDown}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          className="absolute left-1 top-1 h-11 w-11 rounded-xl bg-white shadow-xl flex items-center justify-center text-primary cursor-grab active:scale-95 transition-transform"
          style={{ transform: `translateX(${pct * trackW.current}px)` }}
        >
          <div className="flex gap-0.5">
            <div className="h-3 w-0.5 rounded-full bg-primary/30" />
            <div className="h-3 w-0.5 rounded-full bg-primary/60" />
            <div className="h-3 w-0.5 rounded-full bg-primary/30" />
          </div>
        </div>
      )}
    </div>
  );
}
