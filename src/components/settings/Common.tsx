import { Button } from '@/components/ui/button';
import { ChevronLeft } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

export const SubModuleHeader = ({ title, onBack }: { title: string; onBack: () => void }) => (
  <div className="flex items-center gap-4 mb-6">
    <Button 
      variant="ghost" 
      size="icon" 
      onClick={onBack}
      className="h-10 w-10 rounded-full bg-muted/30 hover:bg-muted/50"
    >
      <ChevronLeft className="h-5 w-5" />
    </Button>
    <div>
      <h3 className="text-xl font-bold tracking-tight">{title}</h3>
      <p className="text-xs text-muted-foreground">Configure your preferences</p>
    </div>
  </div>
);

export const Field = ({ id, label, value, onChange, placeholder, type = 'text' }: {
  id: string; label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string;
}) => (
  <div className="space-y-2">
    <Label htmlFor={id} className="text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground/70 ml-1">{label}</Label>
    <Input
      id={id}
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className="bg-muted/30 border-border/40 h-11 rounded-xl text-sm focus:bg-muted/50 focus:border-primary/40 transition-all placeholder:text-muted-foreground/30"
    />
  </div>
);
