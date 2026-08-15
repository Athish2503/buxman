import React from 'react';
import { Play, Pause, RotateCcw } from 'lucide-react';
import { haptics } from '@/lib/haptics';

interface JourneyPlaybackProps {
  isPlaying: boolean;
  isCompleted: boolean;
  onPlay: () => void;
  onPause: () => void;
  onReplay: () => void;
}

export const JourneyPlayback: React.FC<JourneyPlaybackProps> = ({
  isPlaying,
  isCompleted,
  onPlay,
  onPause,
  onReplay,
}) => {
  return (
    <div className="flex items-center gap-2">
      {isPlaying ? (
        <button
          onClick={() => {
            haptics.light();
            onPause();
          }}
          className="h-9 px-4 rounded-xl bg-slate-800/90 border border-slate-700 text-slate-200 text-xs font-bold flex items-center gap-2 shadow-lg active:scale-95 transition-all"
        >
          <Pause className="h-3.5 w-3.5 text-amber-400 fill-amber-400" />
          Pause
        </button>
      ) : isCompleted ? (
        <button
          onClick={() => {
            haptics.light();
            onReplay();
          }}
          className="h-9 px-4 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-bold flex items-center gap-2 shadow-lg active:scale-95 transition-all"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Replay Journey
        </button>
      ) : (
        <button
          onClick={() => {
            haptics.light();
            onPlay();
          }}
          className="h-9 px-4 rounded-xl bg-sky-500/20 border border-sky-500/30 text-sky-300 text-xs font-bold flex items-center gap-2 shadow-lg active:scale-95 transition-all"
        >
          <Play className="h-3.5 w-3.5 fill-sky-300" />
          Play Journey
        </button>
      )}
    </div>
  );
};
