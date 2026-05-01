import { useState, useEffect } from 'react';
import { motion, useScroll, useSpring, useTransform } from 'framer-motion';
import { RefreshCw } from 'lucide-react';
import { haptics } from '@/lib/haptics';

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: React.ReactNode;
}

export function PullToRefresh({ onRefresh, children }: PullToRefreshProps) {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [startY, setStartY] = useState(0);

  const pullThreshold = 80;

  const handleTouchStart = (e: React.TouchEvent) => {
    if (window.scrollY === 0) {
      setStartY(e.touches[0].pageY);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (window.scrollY === 0 && startY !== 0) {
      const currentY = e.touches[0].pageY;
      const distance = Math.max(0, currentY - startY);
      
      if (distance > 0) {
        // Apply resistance
        const dampening = 0.4;
        const newDistance = distance * dampening;
        setPullDistance(newDistance);
        
        if (newDistance > pullThreshold && pullDistance <= pullThreshold) {
          haptics.selection();
        }
      }
    }
  };

  const handleTouchEnd = async () => {
    if (pullDistance > pullThreshold && !isRefreshing) {
      setIsRefreshing(true);
      haptics.medium();
      await onRefresh();
      setIsRefreshing(false);
    }
    setPullDistance(0);
    setStartY(0);
  };

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className="relative overflow-hidden"
    >
      <motion.div
        style={{
          height: isRefreshing ? 50 : pullDistance,
          opacity: isRefreshing ? 1 : pullDistance / pullThreshold,
        }}
        className="flex items-center justify-center overflow-hidden bg-primary/5"
      >
        <motion.div
          animate={isRefreshing ? { rotate: 360 } : { rotate: (pullDistance / pullThreshold) * 180 }}
          transition={isRefreshing ? { repeat: Infinity, duration: 1, ease: "linear" } : {}}
        >
          <RefreshCw className={isRefreshing ? "text-primary h-5 w-5" : "text-muted-foreground h-5 w-5"} />
        </motion.div>
      </motion.div>
      
      <motion.div
        animate={{ y: isRefreshing ? 50 : pullDistance }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      >
        {children}
      </motion.div>
    </div>
  );
}
