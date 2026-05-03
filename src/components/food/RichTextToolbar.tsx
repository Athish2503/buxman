import { Bold, Italic, List, Heading2, Quote, Highlighter } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RichTextToolbarProps {
  onAction: (action: 'bold' | 'italic' | 'list' | 'heading' | 'quote' | 'highlight') => void;
  className?: string;
}

export function RichTextToolbar({ onAction, className }: RichTextToolbarProps) {
  const buttons = [
    { icon: Bold, action: 'bold', label: 'Bold' },
    { icon: Italic, action: 'italic', label: 'Italic' },
    { icon: Heading2, action: 'heading', label: 'Heading' },
    { icon: List, action: 'list', label: 'Bullet List' },
    { icon: Quote, action: 'quote', label: 'Quote' },
    { icon: Highlighter, action: 'highlight', label: 'Highlight' },
  ] as const;

  return (
    <div className={cn("flex items-center gap-1 p-1 bg-muted/50 rounded-lg border border-border/40", className)}>
      {buttons.map((btn) => (
        <button
          key={btn.action}
          type="button"
          onClick={() => onAction(btn.action)}
          className="h-8 w-8 flex items-center justify-center rounded-md hover:bg-background/80 hover:text-primary transition-all text-muted-foreground"
          title={btn.label}
        >
          <btn.icon className="h-4 w-4" />
        </button>
      ))}
    </div>
  );
}
