import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';

export function SplashScreen({ onComplete }: { onComplete: () => void }) {
  const [isVisible, setVisible] = useState(true);

  useEffect(() => {
    // Professional apps usually have a short, consistent splash duration
    const timer = setTimeout(() => {
      setVisible(false);
      // Wait for exit animation before calling onComplete
      setTimeout(onComplete, 500);
    }, 2100);

    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4, ease: "easeInOut" }}
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center"
          style={{ background: 'hsl(225 22% 5%)' }}
        >
          <div className="flex items-center gap-4.5">
            {/* App Icon Sliding In */}
            <motion.div
              initial={{ x: -60, opacity: 0, scale: 0.8 }}
              animate={{ x: 0, opacity: 1, scale: 1 }}
              transition={{ 
                duration: 0.8, 
                ease: [0.16, 1, 0.3, 1],
              }}
              className="h-16 w-16 rounded-2xl flex items-center justify-center shadow-2xl relative"
              style={{
                background: 'linear-gradient(145deg, #4f46e5, #3730a3)',
                boxShadow: '0 20px 40px rgba(0,0,0,0.4), 0 0 20px rgba(79, 70, 229, 0.3)',
              }}
            >
              <img
                src="/logo.png"
                alt="Logo"
                className="h-8 w-8 object-contain"
              />
            </motion.div>

            {/* Buxman Text Popping Up */}
            <motion.div
              initial={{ scale: 0.4, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              transition={{ 
                duration: 0.6, 
                delay: 0.15,
                type: "spring",
                stiffness: 300,
                damping: 20
              }}
              className="flex flex-col justify-center"
            >
              <span className="text-3xl font-display font-black tracking-tight text-white leading-none">
                BUXMAN
              </span>
              <motion.span 
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.6 }}
                transition={{ delay: 0.4 }}
                className="text-[9px] font-bold text-indigo-400 tracking-widest uppercase mt-1 block"
              >
                TRACK EXPENSES IN A TAP
              </motion.span>
            </motion.div>
          </div>

          {/* Simple Bottom Loading Indicator */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="absolute bottom-16 flex flex-col items-center gap-3"
          >
            <div className="w-32 h-[2px] bg-white/5 rounded-full overflow-hidden">
              <motion.div
                initial={{ x: '-100%' }}
                animate={{ x: '100%' }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                className="h-full w-1/3 bg-indigo-500"
              />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
