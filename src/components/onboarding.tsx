import { useState } from 'react';
import { Receipt, TrendingUp, Shield, Zap, ChevronRight, ArrowRight } from 'lucide-react';
import { metaService } from '@/lib/recurring';
import { cn } from '@/lib/utils';

interface OnboardingProps {
  onComplete: () => void;
}

const SLIDES = [
  {
    icon: Receipt,
    gradient: 'from-violet-600 to-purple-700',
    glow: 'hsl(262 85% 65%)',
    title: 'Track Every Expense',
    sub: 'Log receipts, categorise spending, and never lose a reimbursement claim again.',
  },
  {
    icon: TrendingUp,
    gradient: 'from-cyan-500 to-blue-600',
    glow: 'hsl(186 95% 52%)',
    title: 'Smart Analytics',
    sub: 'Beautiful charts and budget tracking give you full clarity on where money goes.',
  },
  {
    icon: Shield,
    gradient: 'from-emerald-500 to-teal-600',
    glow: 'hsl(152 68% 50%)',
    title: '100% Private',
    sub: 'Everything stays on your device. No accounts, no cloud, no subscriptions.',
  },
  {
    icon: Zap,
    gradient: 'from-amber-500 to-orange-600',
    glow: 'hsl(38 95% 58%)',
    title: 'Invoice in Seconds',
    sub: 'Export a polished PDF invoice for any date range with one tap. Ready to submit.',
  },
];

export function Onboarding({ onComplete }: OnboardingProps) {
  const [slide, setSlide] = useState(0);
  const last = slide === SLIDES.length - 1;
  const s = SLIDES[slide];
  const Icon = s.icon;

  const next = () => {
    if (last) { metaService.markOnboarded(); onComplete(); }
    else setSlide(p => p + 1);
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-between px-6 py-12 bg-background bg-aurora animate-fade-in"
      style={{ touchAction: 'none' }}
    >
      {/* Skip */}
      {!last && (
        <button
          onClick={() => { metaService.markOnboarded(); onComplete(); }}
          className="self-end text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          Skip
        </button>
      )}

      {/* Illustration */}
      <div className="flex-1 flex flex-col items-center justify-center gap-8 w-full max-w-xs">
        <div
          className="h-32 w-32 rounded-[2rem] flex items-center justify-center shadow-2xl transition-all duration-500"
          style={{
            background: `linear-gradient(135deg, ${s.glow}cc, ${s.glow}66)`,
            boxShadow: `0 0 60px ${s.glow}55, 0 20px 40px ${s.glow}33`,
          }}
          key={slide}
        >
          <Icon className="h-16 w-16 text-white drop-shadow-lg" strokeWidth={1.5} />
        </div>

        <div className="text-center space-y-3 animate-fade-in-up" key={`text-${slide}`}>
          <h1 className="text-2xl font-bold tracking-tight leading-tight">{s.title}</h1>
          <p className="text-sm text-muted-foreground leading-relaxed">{s.sub}</p>
        </div>
      </div>

      {/* Dots */}
      <div className="flex gap-2 mb-6">
        {SLIDES.map((_, i) => (
          <button
            key={i}
            onClick={() => setSlide(i)}
            className={cn(
              'h-1.5 rounded-full transition-all duration-300',
              i === slide ? 'w-8 bg-primary' : 'w-1.5 bg-muted-foreground/30'
            )}
          />
        ))}
      </div>

      {/* CTA */}
      <button
        onClick={next}
        className={cn(
          'w-full h-14 rounded-2xl font-bold text-base text-white flex items-center justify-center gap-2.5',
          'transition-all duration-300 active:scale-[0.98] shadow-glow',
          'bg-gradient-primary hover:opacity-90'
        )}
      >
        {last ? (
          <>
            <Zap className="h-5 w-5" />
            Get Started
          </>
        ) : (
          <>
            Next
            <ArrowRight className="h-5 w-5" />
          </>
        )}
      </button>
    </div>
  );
}
