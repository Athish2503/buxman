import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';

export function SplashScreen({ onComplete }: { onComplete: () => void }) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onComplete, 800); // Snappier exit
    }, 2000); // Faster duration

    return () => clearTimeout(timer);
  }, [onComplete]);

  const letters = "BUXMAN".split("");

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.05, filter: 'blur(10px)' }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#050507] overflow-hidden"
        >
          {/* Animated Background Mesh */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <motion.div 
              animate={{ 
                scale: [1, 1.2, 1],
                rotate: [0, 90, 0],
              }}
              transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
              className="absolute -top-1/2 -left-1/2 w-full h-full bg-primary/10 blur-[120px] rounded-full"
            />
            <motion.div 
              animate={{ 
                scale: [1, 1.3, 1],
                rotate: [0, -90, 0],
              }}
              transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
              className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-secondary/10 blur-[120px] rounded-full"
            />
          </div>

          <div className="relative flex flex-col items-center">
            {/* Logo Core with Rotating Rings */}
            <div className="relative mb-12">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                className="absolute -inset-12 rounded-full border border-primary/20 border-dashed"
              />
              <motion.div
                animate={{ rotate: -360 }}
                transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
                className="absolute -inset-8 rounded-full border border-secondary/20 border-dotted"
              />
              
              <motion.div
                initial={{ scale: 0, rotate: -180, opacity: 0 }}
                animate={{ scale: 1, rotate: 0, opacity: 1 }}
                transition={{ 
                  type: "spring",
                  damping: 12,
                  stiffness: 100,
                  delay: 0.1
                }}
                className="relative h-28 w-28 rounded-3xl bg-gradient-to-br from-white/10 to-transparent backdrop-blur-2xl border border-white/20 shadow-2xl flex items-center justify-center overflow-hidden group"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-transparent to-secondary/20 opacity-50" />
                <motion.img 
                  src="/logo.png" 
                  alt="Buxman" 
                  initial={{ filter: "brightness(0)" }}
                  animate={{ filter: "brightness(1.2)" }}
                  transition={{ delay: 0.5, duration: 1 }}
                  className="h-16 w-16 object-contain relative z-10"
                />
                <motion.div 
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
                  animate={{ left: ['-100%', '100%'] }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: "linear", delay: 1 }}
                />
              </motion.div>
            </div>

            {/* Staggered Text Reveal */}
            <div className="flex gap-1.5 mb-2">
              {letters.map((letter, i) => (
                <motion.span
                  key={i}
                  initial={{ y: 20, opacity: 0, filter: 'blur(10px)' }}
                  animate={{ y: 0, opacity: 1, filter: 'blur(0px)' }}
                  transition={{ 
                    delay: 0.4 + (i * 0.08),
                    duration: 0.5,
                    ease: [0.22, 1, 0.36, 1]
                  }}
                  className="text-4xl font-black tracking-tight text-white"
                >
                  {letter}
                </motion.span>
              ))}
            </div>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.4 }}
              transition={{ delay: 1.2, duration: 1 }}
              className="text-[10px] font-bold tracking-[0.4em] text-white uppercase"
            >
              The Next Gen Workspace
            </motion.p>
          </div>

          {/* Minimalist Loader */}
          <div className="absolute bottom-24 flex flex-col items-center gap-4">
             <div className="w-48 h-[2px] bg-white/5 rounded-full overflow-hidden">
               <motion.div
                 initial={{ left: "-100%" }}
                 animate={{ left: "100%" }}
                 transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                 className="absolute top-0 bottom-0 w-1/2 bg-gradient-to-r from-transparent via-primary to-transparent"
               />
             </div>
             <motion.span 
               initial={{ opacity: 0 }}
               animate={{ opacity: [0, 1, 0] }}
               transition={{ duration: 1.5, repeat: Infinity }}
               className="text-[9px] font-medium text-muted-foreground uppercase tracking-widest"
             >
               Initializing Core
             </motion.span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

