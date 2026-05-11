import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';

export function SplashScreen({ onComplete }: { onComplete: () => void }) {
  const [phase, setPhase]       = useState<'logo' | 'text' | 'exit'>('logo');
  const [isVisible, setVisible] = useState(true);

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('text'), 500);
    const t2 = setTimeout(() => setPhase('exit'),  1900);
    const t3 = setTimeout(() => { setVisible(false); setTimeout(onComplete, 650); }, 2100);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [onComplete]);

  const letters = 'BUXMAN'.split('');

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.04, filter: 'blur(16px)' }}
          transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center overflow-hidden"
          style={{ background: 'hsl(225 22% 4%)' }}
        >
          {/* Ambient blobs */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <motion.div
              animate={{ scale: [1, 1.15, 1], rotate: [0, 60, 0] }}
              transition={{ duration: 18, repeat: Infinity, ease: 'linear' }}
              className="absolute -top-1/3 -left-1/4 w-[70vw] h-[70vw] rounded-full bg-primary/15 blur-[100px]"
            />
            <motion.div
              animate={{ scale: [1, 1.2, 1], rotate: [0, -80, 0] }}
              transition={{ duration: 22, repeat: Infinity, ease: 'linear' }}
              className="absolute -bottom-1/3 -right-1/4 w-[60vw] h-[60vw] rounded-full bg-secondary/12 blur-[100px]"
            />
          </div>

          {/* Logo card */}
          <div className="relative flex flex-col items-center">
            <motion.div
              initial={{ scale: 0.5, opacity: 0, rotate: -20 }}
              animate={{ scale: 1, opacity: 1, rotate: 0 }}
              transition={{ type: 'spring', damping: 14, stiffness: 130, delay: 0.05 }}
              className="relative mb-10"
            >
              {/* Outer glow rings */}
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
                className="absolute -inset-6 rounded-full border border-primary/25 border-dashed"
              />
              <motion.div
                animate={{ rotate: -360 }}
                transition={{ duration: 14, repeat: Infinity, ease: 'linear' }}
                className="absolute -inset-3 rounded-full border border-secondary/20 border-dotted"
              />

              {/* Logo box */}
              <div
                className="relative h-28 w-28 rounded-[32px] flex items-center justify-center"
                style={{
                  background: 'linear-gradient(145deg, hsl(258 88% 28%), hsl(280 85% 18%))',
                  boxShadow: '0 0 60px hsl(258 88% 66% / 0.45), 0 24px 48px hsl(0 0% 0% / 0.6), inset 0 1px 0 hsl(255 100% 100% / 0.12)',
                  border: '1px solid hsl(258 88% 50% / 0.3)',
                }}
              >
                <motion.img
                  src="/logo.png"
                  alt="Buxman"
                  initial={{ scale: 0.7, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.25, type: 'spring', damping: 12 }}
                  className="h-14 w-14 object-contain relative z-10"
                />
                {/* Shine */}
                <motion.div
                  className="absolute top-0 left-0 right-0 bottom-0 rounded-[32px] overflow-hidden"
                >
                  <motion.div
                    className="absolute top-0 bottom-0 w-2/5 bg-gradient-to-r from-transparent via-white/10 to-transparent"
                    animate={{ left: ['-60%', '160%'] }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'linear', repeatDelay: 1 }}
                  />
                </motion.div>
              </div>
            </motion.div>

            {/* Letter reveal */}
            <div className="flex gap-1.5 mb-2.5">
              {letters.map((letter, i) => (
                <motion.span
                  key={i}
                  initial={{ y: 24, opacity: 0, filter: 'blur(8px)' }}
                  animate={phase !== 'logo' ? { y: 0, opacity: 1, filter: 'blur(0px)' } : {}}
                  transition={{ delay: i * 0.07, duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                  className="text-[42px] font-display font-black text-white leading-none tracking-[-0.02em]"
                >
                  {letter}
                </motion.span>
              ))}
            </div>

            <motion.p
              initial={{ opacity: 0 }}
              animate={phase === 'text' ? { opacity: 0.45 } : {}}
              transition={{ delay: 0.5, duration: 0.8 }}
              className="text-[10px] font-bold tracking-[0.38em] text-white uppercase"
            >
              Smart Expense Hub
            </motion.p>
          </div>

          {/* Bottom progress bar */}
          <div className="absolute bottom-20 flex flex-col items-center gap-3">
            <div className="w-40 h-[2px] bg-white/6 rounded-full overflow-hidden relative">
              <motion.div
                initial={{ x: '-100%' }}
                animate={{ x: '100%' }}
                transition={{ duration: 1.8, ease: 'linear', repeat: Infinity }}
                className="absolute inset-0 w-1/2 bg-gradient-to-r from-transparent via-primary to-transparent"
              />
            </div>
            <motion.span
              animate={{ opacity: [0, 0.5, 0] }}
              transition={{ duration: 1.4, repeat: Infinity }}
              className="text-[9px] font-semibold text-white/30 uppercase tracking-[0.3em]"
            >
              Loading
            </motion.span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
