import React from 'react';
import { 
  User, ShieldCheck, Zap, Crown, Sparkles, Briefcase, 
  Flame, Terminal, Compass, Target, Award, Smile, 
  Rocket, Star, Gem, Coffee, LucideIcon 
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface AvatarIconOption {
  id: string;
  label: string;
  icon: LucideIcon;
  bgGradient: string;
  borderColor: string;
  textColor: string;
}

export const AVATAR_ICON_OPTIONS: AvatarIconOption[] = [
  { id: 'Zap', label: 'Pro', icon: Zap, bgGradient: 'from-amber-500/20 to-orange-500/20', borderColor: 'border-amber-500/40', textColor: 'text-amber-400' },
  { id: 'Crown', label: 'VIP', icon: Crown, bgGradient: 'from-yellow-500/20 to-amber-500/20', borderColor: 'border-yellow-500/40', textColor: 'text-yellow-400' },
  { id: 'ShieldCheck', label: 'Secure', icon: ShieldCheck, bgGradient: 'from-emerald-500/20 to-teal-500/20', borderColor: 'border-emerald-500/40', textColor: 'text-emerald-400' },
  { id: 'Sparkles', label: 'Creative', icon: Sparkles, bgGradient: 'from-purple-500/20 to-pink-500/20', borderColor: 'border-purple-500/40', textColor: 'text-purple-400' },
  { id: 'Rocket', label: 'Vanguard', icon: Rocket, bgGradient: 'from-sky-500/20 to-blue-500/20', borderColor: 'border-sky-500/40', textColor: 'text-sky-400' },
  { id: 'Flame', label: 'Focus', icon: Flame, bgGradient: 'from-rose-500/20 to-orange-500/20', borderColor: 'border-rose-500/40', textColor: 'text-rose-400' },
  { id: 'Briefcase', label: 'Executive', icon: Briefcase, bgGradient: 'from-blue-500/20 to-indigo-500/20', borderColor: 'border-blue-500/40', textColor: 'text-blue-400' },
  { id: 'Terminal', label: 'Developer', icon: Terminal, bgGradient: 'from-emerald-500/20 to-cyan-500/20', borderColor: 'border-cyan-500/40', textColor: 'text-cyan-400' },
  { id: 'Compass', label: 'Explorer', icon: Compass, bgGradient: 'from-teal-500/20 to-emerald-500/20', borderColor: 'border-teal-500/40', textColor: 'text-teal-400' },
  { id: 'Target', label: 'Goal Setter', icon: Target, bgGradient: 'from-red-500/20 to-rose-500/20', borderColor: 'border-red-500/40', textColor: 'text-red-400' },
  { id: 'Award', label: 'Achiever', icon: Award, bgGradient: 'from-indigo-500/20 to-purple-500/20', borderColor: 'border-indigo-500/40', textColor: 'text-indigo-400' },
  { id: 'Gem', label: 'Precious', icon: Gem, bgGradient: 'from-cyan-500/20 to-blue-500/20', borderColor: 'border-cyan-500/40', textColor: 'text-cyan-400' },
  { id: 'User', label: 'Personal', icon: User, bgGradient: 'from-primary/20 to-primary/10', borderColor: 'border-primary/40', textColor: 'text-primary' },
  { id: 'Star', label: 'Star', icon: Star, bgGradient: 'from-yellow-400/20 to-amber-400/20', borderColor: 'border-yellow-400/40', textColor: 'text-yellow-300' },
  { id: 'Coffee', label: 'Casual', icon: Coffee, bgGradient: 'from-amber-700/20 to-orange-700/20', borderColor: 'border-amber-600/40', textColor: 'text-amber-500' },
  { id: 'Smile', label: 'Friendly', icon: Smile, bgGradient: 'from-emerald-400/20 to-green-500/20', borderColor: 'border-emerald-400/40', textColor: 'text-emerald-300' },
];

export function getAvatarOption(id?: string): AvatarIconOption {
  return AVATAR_ICON_OPTIONS.find(o => o.id === id) || AVATAR_ICON_OPTIONS[0]; // Zap default
}

interface UserAvatarProps {
  iconId?: string;
  className?: string;
  iconClassName?: string;
}

export function UserAvatarIcon({ iconId, className, iconClassName }: UserAvatarProps) {
  const option = getAvatarOption(iconId);
  const IconComponent = option.icon;

  return (
    <div 
      className={cn(
        "rounded-2xl bg-gradient-to-br border flex items-center justify-center shadow-sm shrink-0",
        option.bgGradient,
        option.borderColor,
        option.textColor,
        className || "h-10 w-10 text-xl"
      )}
    >
      <IconComponent className={cn("h-5 w-5", iconClassName)} />
    </div>
  );
}
