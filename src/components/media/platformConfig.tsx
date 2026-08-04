import React from 'react';
import { MediaPlatform } from '@/types/media';

export interface PlatformInfo {
  key: MediaPlatform;
  label: string;
  emoji: string;
  color: string;       // Tailwind bg class fragment
  textColor: string;   // Tailwind text class fragment
  borderColor: string; // Tailwind border class fragment
  icon: React.FC<{ className?: string }>;
}

// ── Official Brand SVG Icons ──────────────────────────────────────────────

export function NetflixIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M5.5 2V22L10 22V11.5L14.5 22H19V2H14.5V12.5L10 2H5.5Z" fill="#E50914" />
      <path d="M14.5 2L10 22H14.5V2Z" fill="#B81D24" />
    </svg>
  );
}

export function PrimeIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M16.5 15.5C13.8 17.5 9.5 17.8 6 16.2C5.3 15.9 4.6 16.5 4.8 17.2C5.5 19 10.5 20.8 16.8 17.2C17.5 16.8 17.3 15.5 16.5 15.5Z" fill="#00A8E1" />
      <path d="M17.8 14.5C17.5 14.3 17 14.5 17.1 14.9C17.6 15.9 18.5 17.2 19.3 17.5C19.6 17.6 19.9 17.3 19.7 17C19.1 16 18.2 15 17.8 14.5Z" fill="#00A8E1" />
      <path d="M11 5H6.5V7.5H8.2V14.5H11V5ZM17.5 7.5C15.3 7.5 13.8 9 13.8 11.2C13.8 13.4 15.3 14.9 17.5 14.9C19.7 14.9 21.2 13.4 21.2 11.2C21.2 9 19.7 7.5 17.5 7.5ZM17.5 12.8C16.5 12.8 15.9 12 15.9 11.2C15.9 10.4 16.5 9.6 17.5 9.6C18.5 9.6 19.1 10.4 19.1 11.2C19.1 12 18.5 12.8 17.5 12.8Z" fill="#00A8E1" />
    </svg>
  );
}

export function DisneyIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M12 2C6.48 2 2 6.48 2 12S6.48 22 12 22 22 17.52 22 12 17.52 2 12 2ZM13.2 16.8C10.5 16.8 8 15.5 7 13.5C8.5 14 10.2 14 11.8 13.5C13.8 12.5 14.8 10.5 16.8 10.5C18.8 10.5 19.3 11.5 20.8 12.5C21.3 12.8 21.8 13.1 22.3 13.3C21.3 15.5 18.8 16.8 16.3 16.8H13.2Z" fill="#113CCF" />
      <circle cx="16.5" cy="8.5" r="1.5" fill="#38BDF8" />
    </svg>
  );
}

export function HboIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <rect width="24" height="24" rx="5" fill="#5822B4" />
      <path d="M4.5 7.5H7.5V11.5H9.5V7.5H12.5V16.5H9.5V13.5H7.5V16.5H4.5V7.5ZM16.5 7.5H13.5V16.5H16.5C18.7 16.5 20.5 14.7 20.5 12.5V11.5C20.5 9.3 18.7 7.5 16.5 7.5ZM17.5 13.5C17.5 14.1 17.1 14.5 16.5 14.5H15.5V9.5H16.5C17.1 9.5 17.5 9.9 17.5 10.5V13.5Z" fill="#FFFFFF" />
    </svg>
  );
}

export function HotstarIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M12 2L14.7 8.3L21.5 9.1L16.4 13.7L17.9 20.4L12 17L6.1 20.4L7.6 13.7L2.5 9.1L9.3 8.3L12 2Z" fill="#F59E0B" />
      <path d="M12 5V15.5L15.6 17.6L14.7 13.5L17.8 10.7L13.6 10.2L12 5Z" fill="#FBBF24" />
    </svg>
  );
}

export function AppleTvIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.09c.67-.82 1.12-1.96.99-3.09-.97.04-2.14.65-2.83 1.46-.62.72-1.16 1.88-1.01 3 .08 0 2.16-.54 2.85-1.37z" />
    </svg>
  );
}

export function PeacockIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <circle cx="6" cy="12" r="3" fill="#10B981" />
      <circle cx="10" cy="7" r="3" fill="#3B82F6" />
      <circle cx="14" cy="7" r="3" fill="#8B5CF6" />
      <circle cx="18" cy="12" r="3" fill="#EC4899" />
      <circle cx="14" cy="17" r="3" fill="#EF4444" />
      <circle cx="10" cy="17" r="3" fill="#F59E0B" />
      <circle cx="12" cy="12" r="2.5" fill="#FFFFFF" />
    </svg>
  );
}

export function TheatreIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M19.5 3H4.5C3.67 3 3 3.67 3 4.5V19.5C3 20.33 3.67 21 4.5 21H19.5C20.33 21 21 20.33 21 19.5V4.5C21 3.67 20.33 3 19.5 3ZM8.5 18H6.5V16H8.5V18ZM8.5 13H6.5V11H8.5V13ZM8.5 8H6.5V6H8.5V8ZM17.5 18H15.5V16H17.5V18ZM17.5 13H15.5V11H17.5V13ZM17.5 8H15.5V6H17.5V8Z" fill="#F59E0B" />
    </svg>
  );
}

export function YoutubeIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M21.58 7.19C21.35 6.33 20.67 5.65 19.81 5.42C18.25 5 12 5 12 5C12 5 5.75 5 4.19 5.42C3.33 5.65 2.65 6.33 2.42 7.19C2 8.75 2 12 2 12C2 12 2 15.25 2.42 16.81C2.65 17.67 3.33 18.35 4.19 18.58C5.75 19 12 19 12 19C12 19 18.25 19 19.81 18.58C20.67 18.35 21.35 17.67 21.58 16.81C22 15.25 22 12 22 12C22 12 22 8.75 21.58 7.19Z" fill="#FF0000" />
      <path d="M9.75 15.02L15.5 12L9.75 8.98V15.02Z" fill="#FFFFFF" />
    </svg>
  );
}

export function OtherPlatformIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect x="2" y="7" width="20" height="15" rx="2" ry="2" />
      <polyline points="17 2 12 7 7 2" />
    </svg>
  );
}

// ── Platform Configurations ───────────────────────────────────────────────

export const PLATFORM_CONFIG: Record<MediaPlatform, PlatformInfo> = {
  netflix: {
    key: 'netflix',
    label: 'Netflix',
    emoji: '🔴',
    color: 'bg-red-500/10',
    textColor: 'text-red-400',
    borderColor: 'border-red-500/20',
    icon: NetflixIcon,
  },
  prime: {
    key: 'prime',
    label: 'Prime Video',
    emoji: '🔵',
    color: 'bg-sky-500/10',
    textColor: 'text-sky-400',
    borderColor: 'border-sky-500/20',
    icon: PrimeIcon,
  },
  disney: {
    key: 'disney',
    label: 'Disney+',
    emoji: '✨',
    color: 'bg-blue-600/10',
    textColor: 'text-blue-400',
    borderColor: 'border-blue-500/20',
    icon: DisneyIcon,
  },
  hbo: {
    key: 'hbo',
    label: 'HBO Max',
    emoji: '🟣',
    color: 'bg-purple-500/10',
    textColor: 'text-purple-400',
    borderColor: 'border-purple-500/20',
    icon: HboIcon,
  },
  hotstar: {
    key: 'hotstar',
    label: 'Hotstar',
    emoji: '⭐',
    color: 'bg-amber-500/10',
    textColor: 'text-amber-400',
    borderColor: 'border-amber-500/20',
    icon: HotstarIcon,
  },
  appletv: {
    key: 'appletv',
    label: 'Apple TV+',
    emoji: '🍎',
    color: 'bg-gray-400/10',
    textColor: 'text-gray-300',
    borderColor: 'border-gray-400/20',
    icon: AppleTvIcon,
  },
  peacock: {
    key: 'peacock',
    label: 'Peacock',
    emoji: '🦚',
    color: 'bg-emerald-500/10',
    textColor: 'text-emerald-400',
    borderColor: 'border-emerald-500/20',
    icon: PeacockIcon,
  },
  theatre: {
    key: 'theatre',
    label: 'Theatre',
    emoji: '🎭',
    color: 'bg-amber-500/10',
    textColor: 'text-amber-400',
    borderColor: 'border-amber-500/20',
    icon: TheatreIcon,
  },
  youtube: {
    key: 'youtube',
    label: 'YouTube',
    emoji: '▶️',
    color: 'bg-red-600/10',
    textColor: 'text-red-300',
    borderColor: 'border-red-600/20',
    icon: YoutubeIcon,
  },
  other: {
    key: 'other',
    label: 'Other',
    emoji: '📺',
    color: 'bg-muted/10',
    textColor: 'text-muted-foreground',
    borderColor: 'border-border/20',
    icon: OtherPlatformIcon,
  },
};

export const PLATFORM_LIST: PlatformInfo[] = Object.values(PLATFORM_CONFIG);
