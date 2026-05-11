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
    }, 1800);

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
          <div className="flex flex-col items-center gap-6">
            {/* Minimal Logo Container */}
            <motion.div
              initial={{ opacity: 0, scale: 0.5, rotate: -180, filter: 'blur(10px)' }}
              animate={{ opacity: 1, scale: 1, rotate: 0, filter: 'blur(0px)' }}
              transition={{ 
                duration: 1.2, 
                ease: [0.16, 1, 0.3, 1],
              }}
              className="relative"
            >
              <motion.div
                animate={{ 
                  scale: [1, 1.05, 1],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
                className="h-24 w-24 rounded-3xl flex items-center justify-center shadow-2xl"
                style={{
                  background: 'linear-gradient(145deg, #4f46e5, #3730a3)',
                  boxShadow: '0 20px 40px rgba(0,0,0,0.4), 0 0 20px rgba(79, 70, 229, 0.2)',
                }}
              >
                <img
                  src="/logo.png"
                  alt="Buxman"
                  className="h-12 w-12 object-contain"
                />
              </motion.div>
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
