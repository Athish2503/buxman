import { useState, useEffect } from 'react';
import { Reorder, motion } from 'framer-motion';
import { GripVertical, Save } from 'lucide-react';
import { SubModuleHeader } from './Common';
import { settingsService } from '@/lib/settings';
import { NAV_ITEMS_CONFIG, Tab } from '@/lib/nav-config';
import { cn } from '@/lib/utils';
import { haptics } from '@/lib/haptics';
import { toast } from 'sonner';

interface NavigationSettingsModuleProps {
  onBack: () => void;
}

export function NavigationSettingsModule({ onBack }: NavigationSettingsModuleProps) {
  const [items, setItems] = useState<Tab[]>([]);

  useEffect(() => {
    const settings = settingsService.get();
    if (settings.navOrder && settings.navOrder.length > 0) {
      setItems(settings.navOrder as Tab[]);
    } else {
      setItems(Object.keys(NAV_ITEMS_CONFIG) as Tab[]);
    }
  }, []);

  const handleSave = () => {
    const settings = settingsService.get();
    settings.navOrder = items;
    settingsService.save(settings);
    haptics.success();
    toast.success('Navigation layout saved');
    onBack();
  };

  const handleReorder = (newOrder: Tab[]) => {
    setItems(newOrder);
    haptics.selection();
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
      <SubModuleHeader title="Navigation Layout" onBack={onBack} />
      
      <div className="bg-surface-2 p-5 rounded-3xl border border-white/5 space-y-4">
        <div className="space-y-1 mb-6">
          <h3 className="text-sm font-bold">Customize Menu</h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Drag to reorder. The first 4 items appear in the bottom navigation bar. 
            The rest will be available in the "More" overflow menu.
          </p>
        </div>

        <Reorder.Group 
          axis="y" 
          values={items} 
          onReorder={handleReorder} 
          className="space-y-2 relative"
        >
          {items.map((item, index) => {
            const config = NAV_ITEMS_CONFIG[item];
            if (!config) return null;
            
            const isMainMenu = index < 4;
            
            return (
              <Reorder.Item 
                key={item} 
                value={item}
                className="relative z-10"
              >
                {index === 0 && (
                  <div className="px-2 pb-2 pt-1 flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-widest text-primary">Main Menu (Bottom Bar)</span>
                  </div>
                )}
                {index === 4 && (
                  <div className="px-2 pb-2 pt-4 flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">More Menu (Overflow)</span>
                    <div className="h-px bg-border/50 flex-1 ml-4" />
                  </div>
                )}
                
                <div className={cn(
                  "flex items-center gap-3 p-3 rounded-2xl border transition-colors",
                  isMainMenu 
                    ? "bg-card border-white/10 shadow-sm" 
                    : "bg-muted/30 border-transparent border-dashed"
                )}>
                  <div className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                    isMainMenu ? "bg-primary/10 text-primary" : "bg-background/50 text-muted-foreground"
                  )}>
                    <config.icon className="w-5 h-5" />
                  </div>
                  
                  <div className="flex-1">
                    <p className={cn("text-sm font-bold", isMainMenu ? "text-foreground" : "text-muted-foreground")}>{config.label}</p>
                    <p className="text-[10px] text-muted-foreground/60">{isMainMenu ? 'Visible on home' : 'Hidden in more'}</p>
                  </div>
                  
                  <div className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground/40 cursor-grab active:cursor-grabbing hover:bg-white/5 transition-colors">
                    <GripVertical className="w-4 h-4" />
                  </div>
                </div>
              </Reorder.Item>
            );
          })}
        </Reorder.Group>
      </div>

      <button
        onClick={handleSave}
        className="w-full py-4 rounded-2xl bg-gradient-primary text-white font-bold text-sm shadow-glow flex items-center justify-center gap-2 press-scale"
      >
        <Save className="w-4 h-4" /> Save Layout
      </button>
    </div>
  );
}
