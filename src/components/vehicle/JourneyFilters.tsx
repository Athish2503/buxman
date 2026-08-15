import React from 'react';
import { DateFilterOption } from './roadway-utils';
import { haptics } from '@/lib/haptics';

interface JourneyFiltersProps {
  filter: DateFilterOption;
  onChange: (filter: DateFilterOption) => void;
}

const FILTER_OPTIONS: { id: DateFilterOption; label: string }[] = [
  { id: '7D', label: '7D' },
  { id: '30D', label: '30D' },
  { id: '6M', label: '6M' },
  { id: '1Y', label: '1Y' },
  { id: 'ALL', label: 'ALL' },
];

export const JourneyFilters: React.FC<JourneyFiltersProps> = ({ filter, onChange }) => {
  return (
    <div className="flex items-center justify-center gap-1.5 p-1 bg-slate-900/80 backdrop-blur-md rounded-2xl border border-slate-800 shadow-xl">
      {FILTER_OPTIONS.map(opt => {
        const isActive = filter === opt.id;
        return (
          <button
            key={opt.id}
            onClick={() => {
              haptics.selection();
              onChange(opt.id);
            }}
            className={`px-3 py-1.5 rounded-xl text-[10px] font-black tracking-widest uppercase transition-all duration-200 ${
              isActive
                ? 'bg-sky-500 text-slate-950 shadow-md font-extrabold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
};
