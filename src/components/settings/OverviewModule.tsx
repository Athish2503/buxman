import { Building, Zap, LayoutGrid, Target, Lock, Database } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ChevronRight } from 'lucide-react';

const ModuleCard = ({ icon: Icon, title, description, onClick, color = 'bg-primary' }: { 
  icon: React.ElementType; title: string; description: string; onClick: () => void; color?: string;
}) => (
  <button 
    onClick={onClick}
    className="w-full flex items-center gap-4 p-4 rounded-3xl border border-border/40 bg-card/40 dark:bg-card/40 backdrop-blur-md hover:border-primary/40 hover:bg-muted/10 transition-all text-left group shadow-sm dark:shadow-none"
  >
    <div className={cn("h-12 w-12 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform", color)}>
      <Icon className="h-6 w-6 text-white" />
    </div>
    <div className="flex-1 min-w-0">
      <h4 className="font-bold text-sm">{title}</h4>
      <p className="text-xs text-muted-foreground truncate">{description}</p>
    </div>
    <ChevronRight className="h-5 w-5 text-muted-foreground/30 group-hover:text-primary transition-colors" />
  </button>
);

interface OverviewModuleProps {
  onNavigate: (tab: any) => void;
}

export function OverviewModule({ onNavigate }: OverviewModuleProps) {
  return (
    <div className="grid grid-cols-1 gap-3 px-1">
      <ModuleCard 
        icon={Building} title="Organization" description="Company & personal billing details" 
        onClick={() => onNavigate('organization')} color="bg-blue-500"
      />
      <ModuleCard 
        icon={Zap} title="Smart Features" description="Auto-detection & notification tools" 
        onClick={() => onNavigate('smart')} color="bg-amber-500"
      />
      <ModuleCard 
        icon={LayoutGrid} title="Categories" description="Manage expense types, icons & visibility" 
        onClick={() => onNavigate('categories')} color="bg-purple-500"
      />
      <ModuleCard 
        icon={Target} title="Budgeting" description="Set spending limits & goals" 
        onClick={() => onNavigate('budgets')} color="bg-emerald-500"
      />
      <ModuleCard 
        icon={Lock} title="Security & System" description="Biometrics, appearance & settings" 
        onClick={() => onNavigate('security')} color="bg-indigo-500"
      />
      <ModuleCard 
        icon={Database} title="Data Management" description="Backup, restore & erase application data" 
        onClick={() => onNavigate('data')} color="bg-rose-500"
      />
      
      <div className="mt-8 mb-4 text-center">
        <p className="text-[10px] font-black tracking-[0.3em] text-muted-foreground/30 uppercase">Buxman v1.1.0</p>
        <p className="text-[9px] text-muted-foreground/20 mt-1 uppercase tracking-tighter">Native Code Revision: 2</p>
      </div>
    </div>
  );
}
