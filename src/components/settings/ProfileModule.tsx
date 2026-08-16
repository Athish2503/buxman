import { useState } from 'react';
import { AppSettings } from '@/types/expense';
import { SubModuleHeader, Field } from './Common';
import { User, Sparkles, Check, AtSign, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { AVATAR_ICON_OPTIONS, UserAvatarIcon, getAvatarOption } from '@/lib/avatar-icons.tsx';

interface ProfileModuleProps {
  settings: AppSettings;
  updateSettings: (updates: Partial<AppSettings>) => void;
  onBack: () => void;
}

export function ProfileModule({ settings, updateSettings, onBack }: ProfileModuleProps) {
  const profile = settings.userProfile || {
    name: '',
    nickname: '',
    avatarIcon: 'Zap',
    roleTagline: 'Personal Account',
  };

  const [name, setName] = useState(profile.name || '');
  const [nickname, setNickname] = useState(profile.nickname || '');
  const [avatarIcon, setAvatarIcon] = useState(profile.avatarIcon || 'Zap');
  const [roleTagline, setRoleTagline] = useState(profile.roleTagline || 'Personal Account');
  const [email, setEmail] = useState(settings.billedFrom.email || '');
  const [upiId, setUpiId] = useState(settings.upiId || '');

  const handleSave = () => {
    const trimmedName = name.trim();
    const trimmedNick = nickname.trim() || trimmedName.split(' ')[0] || 'User';

    updateSettings({
      userProfile: {
        name: trimmedName,
        nickname: trimmedNick,
        avatarIcon,
        roleTagline: roleTagline.trim() || 'Personal Account',
      },
      billedFrom: {
        ...settings.billedFrom,
        name: trimmedName || settings.billedFrom.name,
        email: email.trim(),
      },
      upiId: upiId.trim(),
    });

    toast.success('Profile updated successfully!');
  };

  const activeOption = getAvatarOption(avatarIcon);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
      <SubModuleHeader title="Personal Profile" onBack={onBack} />

      {/* Live Profile Card Preview */}
      <div className="p-6 rounded-3xl bg-gradient-to-br from-primary/20 via-card to-card border border-primary/30 shadow-lg relative overflow-hidden flex flex-col sm:flex-row items-center gap-5">
        <div className="relative">
          <UserAvatarIcon 
            iconId={avatarIcon} 
            className="h-20 w-20 rounded-2xl border-2 text-3xl shadow-inner animate-pulse-glow" 
            iconClassName="h-10 w-10"
          />
          <div className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-emerald-500 border-2 border-card flex items-center justify-center">
            <Check className="h-3 w-3 text-white stroke-[3]" />
          </div>
        </div>

        <div className="flex-1 text-center sm:text-left min-w-0 space-y-1">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-primary/10 border border-primary/20 text-[10px] font-black tracking-widest text-primary uppercase">
            <Sparkles className="h-3 w-3" /> {activeOption.label} Persona
          </div>
          <h3 className="text-xl font-bold tracking-tight text-foreground truncate">
            {nickname || name || 'Your Name'}
          </h3>
          <p className="text-xs text-muted-foreground truncate">
            {name ? `${name} • ` : ''}{roleTagline || 'Personal Account'}
          </p>
        </div>
      </div>

      {/* Profile Form */}
      <div className="p-6 rounded-3xl bg-card border border-border/50 space-y-5 shadow-sm">
        <div className="flex items-center gap-2 border-b border-border/40 pb-3">
          <User className="h-4 w-4 text-primary" />
          <h4 className="text-xs font-black uppercase tracking-wider text-muted-foreground">Identity & Greeting</h4>
        </div>

        {/* Vector Icon Selector */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-semibold text-foreground">Custom Avatar Icon</Label>
            <span className="text-[10px] font-bold text-primary uppercase tracking-widest">{activeOption.label}</span>
          </div>

          <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
            {AVATAR_ICON_OPTIONS.map((opt) => {
              const isSelected = avatarIcon === opt.id;
              const IconComp = opt.icon;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setAvatarIcon(opt.id)}
                  title={opt.label}
                  className={cn(
                    "p-2.5 rounded-2xl border flex flex-col items-center justify-center gap-1 transition-all active:scale-95",
                    isSelected
                      ? cn("border-primary ring-2 ring-primary/40 shadow-md scale-105", opt.bgGradient, opt.textColor)
                      : "border-border/40 bg-card/60 hover:bg-muted/40 text-muted-foreground hover:text-foreground"
                  )}
                >
                  <IconComp className={cn("h-5 w-5", isSelected ? opt.textColor : "text-muted-foreground")} />
                  <span className="text-[9px] font-bold truncate max-w-full">{opt.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          <Field
            id="user-full-name"
            label="Full Name"
            value={name}
            onChange={setName}
            placeholder="Alex Morgan"
          />
          <Field
            id="user-nickname"
            label="Preferred Greeting Name"
            value={nickname}
            onChange={setNickname}
            placeholder="Alex"
          />
        </div>

        <Field
          id="user-role-tagline"
          label="Tagline / Persona"
          value={roleTagline}
          onChange={setRoleTagline}
          placeholder="Product Designer • Freelance"
        />

        <div className="flex items-center gap-2 border-b border-border/40 pb-3 pt-3">
          <AtSign className="h-4 w-4 text-indigo-400" />
          <h4 className="text-xs font-black uppercase tracking-wider text-muted-foreground">Contact & Payments</h4>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field
            id="user-email"
            label="Email Address"
            type="email"
            value={email}
            onChange={setEmail}
            placeholder="alex@example.com"
          />
          <Field
            id="user-upi"
            label="UPI ID (For split payouts)"
            value={upiId}
            onChange={setUpiId}
            placeholder="alex@okaxis"
          />
        </div>

        <div className="pt-2">
          <Button
            onClick={handleSave}
            className="w-full h-11 rounded-2xl bg-primary text-primary-foreground font-bold shadow-md hover:opacity-90 active:scale-[0.99] transition-all flex items-center justify-center gap-2"
          >
            <ShieldCheck className="h-4 w-4" />
            Save Profile Settings
          </Button>
        </div>
      </div>
    </div>
  );
}
