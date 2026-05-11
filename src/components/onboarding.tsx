import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Receipt, TrendingUp, Shield, Zap, ArrowRight, CheckCircle2 } from 'lucide-react';
import { metaService } from '@/lib/recurring';
import { cn } from '@/lib/utils';
import { haptics } from '@/lib/haptics';

interface OnboardingProps { onComplete: () => void; }

const SLIDES = [
  {
    icon: Receipt,
    gradient: 'from-violet-500 to-purple-700',
    bg: 'hsl(258 88% 66%)',
    accent: 'hsl(280 85% 65%)',
    title: 'Track Expenses',
    sub: 'Log receipts, manage spending, and track reimbursements in one place.',
    tag: 'EXPENSES',
  },
  {
    icon: TrendingUp,
    gradient: 'from-cyan-500 to-blue-600',
    bg: 'hsl(200 90% 50%)',
    accent: 'hsl(220 85% 58%)',
    title: 'Reports & Analytics',
    sub: 'View charts and track your budget to understand where your money goes.',
    tag: 'REPORTS',
  },
  {
    icon: Shield,
    gradient: 'from-emerald-500 to-teal-600',
    bg: 'hsl(162 72% 45%)',
    accent: 'hsl(180 72% 42%)',
    title: '100% Private',
    sub: 'Everything stays on your device. No accounts. No cloud. No subscriptions. Ever.',
    tag: 'PRIVACY',
  },
  {
    icon: Zap,
    gradient: 'from-amber-400 to-orange-600',
    bg: 'hsl(42 95% 52%)',
    accent: 'hsl(25 90% 52%)',
    title: 'Quick Export',
    sub: 'Create PDF reports or CSV files for any date range with a single tap.',
    tag: 'EXPORT',
  },
];

export function Onboarding({ onComplete }: OnboardingProps) {
  const [slide, setSlide] = useState(0);
  const last = slide === SLIDES.length - 1;
  const s = SLIDES[slide];
  const Icon = s.icon;

  const next = () => {
    if (last) {
      haptics.success();
      metaService.markOnboarded();
      onComplete();
    } else {
      haptics.selection();
      setSlide(p => p + 1);
    }
  };

  const skip = () => { metaService.markOnboarded(); onComplete(); };

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col overflow-hidden"
      style={{ background: 'hsl(225 22% 5%)' }}>

      {/* Animated background blob */}
      <AnimatePresence mode="wait">
        <motion.div
          key={slide}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 1.1 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="absolute top-0 right-0 w-[75vw] h-[75vw] rounded-full blur-[90px] pointer-events-none"
          style={{ background: `radial-gradient(circle, ${s.bg}30, transparent 70%)`, transform: 'translate(25%, -25%)' }}
        />
      </AnimatePresence>

      {/* Header */}
      <div className="flex items-center justify-between px-6 pt-14">
        {/* Progress dots */}
        <div className="flex gap-1.5">
          {SLIDES.map((_, i) => (
            <motion.div
              key={i}
              animate={{
                width: i === slide ? 24 : 6,
                background: i === slide ? s.bg : 'hsl(225 16% 22%)',
                opacity: i < slide ? 0.5 : 1,
              }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="h-1.5 rounded-full"
            />
          ))}
        </div>
        {!last && (
          <button onClick={skip} className="text-xs text-muted-foreground font-semibold px-3 py-1.5 rounded-xl hover:bg-surface-2 transition-colors">
            Skip
          </button>
        )}
      </div>

      {/* Slide Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={slide}
            initial={{ opacity: 0, y: 30, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 1.02 }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col items-center text-center w-full max-w-sm"
          >
            {/* Icon */}
            <div
              className="h-28 w-28 rounded-[32px] flex items-center justify-center mb-8 relative"
              style={{
                background: `linear-gradient(145deg, ${s.bg}cc, ${s.accent}88)`,
                boxShadow: `0 0 60px ${s.bg}55, 0 24px 48px ${s.bg}30, inset 0 1px 0 rgba(255,255,255,0.15)`,
                border: `1px solid ${s.bg}40`,
              }}
            >
              <Icon className="h-14 w-14 text-white drop-shadow-lg" strokeWidth={1.5} />
              {/* Pulse ring */}
              <motion.div
                className="absolute inset-0 rounded-[32px]"
                style={{ border: `1.5px solid ${s.bg}60` }}
                animate={{ scale: [1, 1.12, 1], opacity: [0.8, 0, 0.8] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
              />
            </div>

            {/* Tag */}
            <div
              className="px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest mb-4 border"
              style={{ color: s.bg, background: `${s.bg}18`, borderColor: `${s.bg}35` }}
            >
              {s.tag}
            </div>

            <h1 className="text-[30px] font-display font-black text-white leading-tight tracking-tight mb-4">
              {s.title}
            </h1>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">
              {s.sub}
            </p>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* CTA */}
      <div className="px-6 pb-14">
        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={next}
          className="relative w-full h-[56px] rounded-2xl font-display font-bold text-base text-white flex items-center justify-center gap-2.5 overflow-hidden shadow-glow"
          style={{ background: `linear-gradient(135deg, ${s.bg}, ${s.accent})` }}
        >
          {/* Shine */}
          <motion.div
            className="absolute inset-0 w-1/3 bg-gradient-to-r from-transparent via-white/20 to-transparent"
            animate={{ left: ['-40%', '140%'] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'linear', repeatDelay: 2 }}
          />
          {last ? (
            <>
              <CheckCircle2 className="h-5 w-5" />
              Get Started
            </>
          ) : (
            <>
              Continue
              <ArrowRight className="h-5 w-5" />
            </>
          )}
        </motion.button>
      </div>
    </div>
  );
}
