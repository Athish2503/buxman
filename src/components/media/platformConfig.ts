import { MediaPlatform } from '@/types/media';

export interface PlatformInfo {
  key: MediaPlatform;
  label: string;
  emoji: string;
  color: string;       // Tailwind bg class fragment
  textColor: string;   // Tailwind text class fragment
  borderColor: string; // Tailwind border class fragment
}

export const PLATFORM_CONFIG: Record<MediaPlatform, PlatformInfo> = {
  netflix: {
    key: 'netflix',
    label: 'Netflix',
    emoji: '🔴',
    color: 'bg-red-500/10',
    textColor: 'text-red-400',
    borderColor: 'border-red-500/20',
  },
  prime: {
    key: 'prime',
    label: 'Prime',
    emoji: '🔵',
    color: 'bg-sky-500/10',
    textColor: 'text-sky-400',
    borderColor: 'border-sky-500/20',
  },
  disney: {
    key: 'disney',
    label: 'Disney+',
    emoji: '✨',
    color: 'bg-blue-600/10',
    textColor: 'text-blue-400',
    borderColor: 'border-blue-500/20',
  },
  hbo: {
    key: 'hbo',
    label: 'HBO Max',
    emoji: '🟣',
    color: 'bg-purple-500/10',
    textColor: 'text-purple-400',
    borderColor: 'border-purple-500/20',
  },
  hotstar: {
    key: 'hotstar',
    label: 'Hotstar',
    emoji: '⭐',
    color: 'bg-orange-500/10',
    textColor: 'text-orange-400',
    borderColor: 'border-orange-500/20',
  },
  appletv: {
    key: 'appletv',
    label: 'Apple TV+',
    emoji: '🍎',
    color: 'bg-gray-400/10',
    textColor: 'text-gray-300',
    borderColor: 'border-gray-400/20',
  },
  peacock: {
    key: 'peacock',
    label: 'Peacock',
    emoji: '🦚',
    color: 'bg-emerald-500/10',
    textColor: 'text-emerald-400',
    borderColor: 'border-emerald-500/20',
  },
  theatre: {
    key: 'theatre',
    label: 'Theatre',
    emoji: '🎭',
    color: 'bg-amber-500/10',
    textColor: 'text-amber-400',
    borderColor: 'border-amber-500/20',
  },
  youtube: {
    key: 'youtube',
    label: 'YouTube',
    emoji: '▶️',
    color: 'bg-red-600/10',
    textColor: 'text-red-300',
    borderColor: 'border-red-600/20',
  },
  other: {
    key: 'other',
    label: 'Other',
    emoji: '📺',
    color: 'bg-muted/10',
    textColor: 'text-muted-foreground',
    borderColor: 'border-border/20',
  },
};

export const PLATFORM_LIST: PlatformInfo[] = Object.values(PLATFORM_CONFIG);
