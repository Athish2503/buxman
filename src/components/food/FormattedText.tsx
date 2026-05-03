import { cn } from '@/lib/utils';

export function FormattedText({ text, className }: { text: string; className?: string }) {
  if (!text) return null;

  // Simple markdown-to-HTML-ish parser
  const lines = text.split('\n');
  
  return (
    <div className={cn("prose prose-sm dark:prose-invert max-w-none space-y-2", className)}>
      {lines.map((line, i) => {
        let content: React.ReactNode = line;
        
        // Bold
        if (line.includes('**')) {
          const parts = line.split('**');
          content = parts.map((part, j) => (j % 2 === 1 ? <strong key={j}>{part}</strong> : part));
        }
        
        // Italic
        if (typeof content === 'string' && line.includes('*')) {
          const parts = line.split('*');
          content = parts.map((part, j) => (j % 2 === 1 ? <em key={j}>{part}</em> : part));
        }

        // Headings
        if (line.startsWith('## ')) {
          return <h2 key={i} className="text-lg font-bold mt-4 mb-2">{line.replace('## ', '')}</h2>;
        }

        // Bullets
        if (line.startsWith('- ')) {
          return <li key={i} className="ml-4">{line.replace('- ', '')}</li>;
        }

        // Quote
        if (line.startsWith('> ')) {
          return <blockquote key={i} className="border-l-4 border-primary/40 pl-4 italic my-2">{line.replace('> ', '')}</blockquote>;
        }

        // Highlight
        if (typeof content === 'string' && line.includes('==')) {
          const parts = line.split('==');
          content = parts.map((part, j) => (j % 2 === 1 ? <mark key={j} className="bg-primary/20 text-primary px-1 rounded">{part}</mark> : part));
        }

        return <p key={i} className="leading-relaxed">{content}</p>;
      })}
    </div>
  );
}
