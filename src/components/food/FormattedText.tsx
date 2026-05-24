import { cn } from '@/lib/utils';

export function FormattedText({ text, className }: { text: string; className?: string }) {
  if (!text) return null;

  const lines = text.split('\n');
  
  return (
    <div className={cn("prose prose-sm dark:prose-invert max-w-none space-y-2", className)}>
      {lines.map((line, i) => {
        let isHeading = false;
        let isBullet = false;
        let isQuote = false;
        let rawLine = line;

        if (line.startsWith('## ')) {
          isHeading = true;
          rawLine = line.substring(3);
        } else if (line.startsWith('- ')) {
          isBullet = true;
          rawLine = line.substring(2);
        } else if (line.startsWith('> ')) {
          isQuote = true;
          rawLine = line.substring(2);
        }

        // Parse inline elements (bold, italic, highlight)
        let parts: React.ReactNode[] = [rawLine];

        // 1. Highlight: ==text==
        parts = parts.flatMap((part, idx) => {
          if (typeof part !== 'string') return part;
          if (!part.includes('==')) return part;
          const split = part.split('==');
          return split.map((sub, j) => (j % 2 === 1 ? <mark key={`h-${idx}-${j}`} className="bg-primary/20 text-primary px-1 rounded font-medium">{sub}</mark> : sub));
        });

        // 2. Bold: **text**
        parts = parts.flatMap((part, idx) => {
          if (typeof part !== 'string') return part;
          if (!part.includes('**')) return part;
          const split = part.split('**');
          return split.map((sub, j) => (j % 2 === 1 ? <strong key={`b-${idx}-${j}`} className="font-bold">{sub}</strong> : sub));
        });

        // 3. Italic: *text*
        parts = parts.flatMap((part, idx) => {
          if (typeof part !== 'string') return part;
          if (!part.includes('*')) return part;
          const split = part.split('*');
          return split.map((sub, j) => (j % 2 === 1 ? <em key={`i-${idx}-${j}`} className="italic">{sub}</em> : sub));
        });

        const content = <>{parts}</>;

        if (isHeading) {
          return <h2 key={i} className="text-lg font-bold mt-4 mb-2">{content}</h2>;
        }

        if (isBullet) {
          return <li key={i} className="ml-4 list-disc leading-relaxed">{content}</li>;
        }

        if (isQuote) {
          return <blockquote key={i} className="border-l-4 border-primary/40 pl-4 italic my-2 leading-relaxed">{content}</blockquote>;
        }

        return <p key={i} className="leading-relaxed">{content}</p>;
      })}
    </div>
  );
}
