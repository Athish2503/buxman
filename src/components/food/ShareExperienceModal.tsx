import { useState } from 'react';
import { 
  Sparkles, Share2, Download, Copy, Check, 
  MapPin, Calendar, Star, Layers, Utensils, X
} from 'lucide-react';
import { DiningExperience } from '@/types/food';
import { shareService } from '@/lib/share-service';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { haptics } from '@/lib/haptics';

interface ShareExperienceModalProps {
  experience: DiningExperience | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type PremiumThemeId = 'obsidian' | 'ivory' | 'crimson' | 'emerald' | 'critic';

interface ThemeOption {
  id: PremiumThemeId;
  name: string;
  badge: string;
  desc: string;
}

const THEMES: ThemeOption[] = [
  { id: 'obsidian', name: 'Obsidian Glass', badge: 'Ultra Dark', desc: 'Deep cosmic backdrop with vibrant gold & emerald item ratings' },
  { id: 'ivory', name: 'Editorial Ivory', badge: 'Minimalist', desc: 'Warm fine paper texture with sharp high-contrast layouts' },
  { id: 'crimson', name: 'Crimson Reserve', badge: 'Classic', desc: 'Sleek luxury styling with a bold upper crimson statement strip' },
  { id: 'emerald', name: 'Royal Emerald', badge: 'Vibrant', desc: 'Deep forest shades accenting mint typography and soft borders' },
  { id: 'critic', name: 'Critic Highlight', badge: 'Spotlight', desc: 'Minimalist editorial spotlight style focusing on top-rated dishes and overall notes' },
];

const formatDateSafe = (dateStr: string | null | undefined, formatTemplate: string = 'MMMM d, yyyy') => {
  if (!dateStr) return 'Undated';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return 'Undated';
    return format(d, formatTemplate);
  } catch (e) {
    return 'Undated';
  }
};

const RenderFormattedNotes = ({ text, isLightBg = false }: { text: string; isLightBg?: boolean }) => {
  if (!text) return null;
  const lines = text.split('\n');
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      {lines.map((line, i) => {
        let content: React.ReactNode = line;
        let isBullet = false;
        let isQuote = false;
        let isHeading = false;

        if (line.startsWith('## ')) {
          isHeading = true;
          content = line.substring(3);
        } else if (line.startsWith('- ')) {
          isBullet = true;
          content = line.substring(2);
        } else if (line.startsWith('> ')) {
          isQuote = true;
          content = line.substring(2);
        }

        // Parse inline elements (only if it's a string)
        if (typeof content === 'string') {
          let parts: React.ReactNode[] = [content];

          // 1. Highlight: ==text==
          parts = parts.flatMap((part, idx) => {
            if (typeof part !== 'string') return part;
            if (!part.includes('==')) return part;
            const split = part.split('==');
            return split.map((sub, j) => (j % 2 === 1 ? (
              <mark key={`h-${idx}-${j}`} style={{ backgroundColor: isLightBg ? 'rgba(59,130,246,0.15)' : 'rgba(59,130,246,0.3)', color: isLightBg ? '#2563EB' : '#60A5FA', padding: '0 4px', borderRadius: '4px' }}>{sub}</mark>
            ) : sub));
          });

          // 2. Bold: **text**
          parts = parts.flatMap((part, idx) => {
            if (typeof part !== 'string') return part;
            if (!part.includes('**')) return part;
            const split = part.split('**');
            return split.map((sub, j) => (j % 2 === 1 ? <strong key={`b-${idx}-${j}`} style={{ fontWeight: 'bold' }}>{sub}</strong> : sub));
          });

          // 3. Italic: *text*
          parts = parts.flatMap((part, idx) => {
            if (typeof part !== 'string') return part;
            if (!part.includes('*')) return part;
            const split = part.split('*');
            return split.map((sub, j) => (j % 2 === 1 ? <em key={`i-${idx}-${j}`} style={{ fontStyle: 'italic' }}>{sub}</em> : sub));
          });

          content = <>{parts}</>;
        }

        if (isHeading) {
          return <h4 key={i} style={{ fontSize: '13px', fontWeight: 'bold', margin: '6px 0 2px 0' }}>{content}</h4>;
        }
        if (isBullet) {
          return <div key={i} style={{ paddingLeft: '12px', position: 'relative', fontSize: '12px' }}><span style={{ position: 'absolute', left: 0 }}>•</span>{content}</div>;
        }
        if (isQuote) {
          return <div key={i} style={{ borderLeft: '3px solid rgba(255,255,255,0.3)', paddingLeft: '8px', fontStyle: 'italic', fontSize: '12px', margin: '4px 0' }}>{content}</div>;
        }
        return <div key={i} style={{ fontSize: '12px', lineHeight: '16px' }}>{content}</div>;
      })}
    </div>
  );
};

export function ShareExperienceModal({ experience, open, onOpenChange }: ShareExperienceModalProps) {
  const [selectedTheme, setSelectedTheme] = useState<PremiumThemeId>('obsidian');
  const [aspectRatio, setAspectRatio] = useState<'standard' | 'story'>('standard');
  const [copiedText, setCopiedText] = useState(false);

  if (!experience) return null;

  const { restaurantName, visitDate, location, cuisine, dishes = [] } = experience;

  // Extract a background image fallback to provide beautiful ambient backdrops
  const allImages = dishes.flatMap(d => d.images).filter(Boolean);
  const bgPhoto = allImages[0] || 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=1200&q=80';

  const handleThemeSelect = (themeId: PremiumThemeId) => {
    haptics.selection();
    setSelectedTheme(themeId);
  };

  const getFormattedTextString = () => {
    const lines = [
      `🍽️ ${restaurantName}`,
      location?.address ? `📍 ${location.address.split(',')[0]}` : null,
      `📅 ${formatDateSafe(visitDate, 'MMMM d, yyyy')}`,
      ``,
      `✨ ORDERED ITEMS:`
    ];

    dishes.forEach(d => {
      let line = `- ${d.name}`;
      if (d.price) line += ` (₹${d.price})`;
      if (d.rating) line += ` ★ ${d.rating}/5`;
      lines.push(line);
      if (d.notes && d.notes.trim()) {
        lines.push(`  💬 "${d.notes.trim()}"`);
      }
    });

    return lines.filter(l => l !== null).join('\n');
  };

  const handleNativeShareImage = () => {
    haptics.success();
    const safeTitle = restaurantName.replace(/\s+/g, '_');
    // Targets the unscaled off-screen hidden version specifically to bypass ancestor CSS scaling layout text-squish bugs
    shareService.shareAsImage('premium-share-card-capture', safeTitle, 'png', 3);
  };

  const handleDownloadImage = () => {
    haptics.success();
    const safeTitle = restaurantName.replace(/\s+/g, '_');
    shareService.downloadAsImage('premium-share-card-capture', safeTitle, 'png');
  };

  const handleCopyText = async () => {
    haptics.selection();
    await navigator.clipboard.writeText(getFormattedTextString());
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2500);
  };

  // Render highly robust, beautiful visual layout template optimized precisely for clean html2canvas capture
  const renderPremiumCard = (targetId: string) => {
    const isVertical = aspectRatio === 'story';
    const cardWidth = '400px';
    const cardMinHeight = isVertical ? '680px' : '460px';

    // Outer frame guarantees no cropping and uncompromised font layout tracking
    const wrapperStyle: React.CSSProperties = {
      width: cardWidth,
      minHeight: cardMinHeight,
      boxSizing: 'border-box',
      position: 'relative',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      fontFamily: 'sans-serif',
      letterSpacing: '0px',
    };

    // Style map objects configuration
    switch (selectedTheme) {
      case 'obsidian':
        return (
          <div id={targetId} style={{ ...wrapperStyle, backgroundColor: '#0A0A0E', color: '#FFFFFF', padding: '32px', borderRadius: '28px', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 20px 50px rgba(0,0,0,0.8)' }}>
            {/* Cinematic background glow overlay */}
            <div style={{ position: 'absolute', inset: 0, zIndex: 1, opacity: 0.15 }}>
              <img src={bgPhoto} style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'blur(10px)' }} crossOrigin="anonymous" />
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, #0A0A0E 0%, rgba(10,10,14,0.6) 50%, #0A0A0E 100%)' }} />
            </div>

            {/* Foreground elements container mapping absolute stacking isolation */}
            <div style={{ position: 'relative', zIndex: 2, display: 'flex', flexDirection: 'column', flex: 1 }}>
              {/* Header section */}
              <div style={{ marginBottom: '24px', paddingBottom: '16px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#FBBF24', fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '6px' }}>
                  ★ ARCHIVED DINING EXPERIENCE
                </div>
                <h2 style={{ fontSize: '28px', fontWeight: 'bold', lineHeight: '34px', margin: '0 0 8px 0', color: '#FFFFFF', wordBreak: 'break-word' }}>
                  {restaurantName}
                </h2>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '12px', color: 'rgba(255,255,255,0.7)', fontWeight: 'bold' }}>
                  {location?.address && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      📍 {location.address.split(',')[0]}
                    </div>
                  )}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#34D399' }}>
                    📅 {formatDateSafe(visitDate, 'MMMM d, yyyy')}
                  </div>
                </div>
              </div>

              {/* Items List - Strictly accurate facts */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ fontSize: '11px', fontWeight: 'bold', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '1px' }}>
                  ORDERED SELECTIONS:
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {dishes.map((dish, i) => (
                    <div key={i} style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', padding: '12px 14px', borderRadius: '14px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#FFFFFF', wordBreak: 'break-word' }}>
                          • {dish.name}
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                          {dish.price && (
                            <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#34D399', backgroundColor: 'rgba(52,211,153,0.1)', padding: '2px 8px', borderRadius: '8px' }}>
                              ₹{dish.price}
                            </span>
                          )}
                          {dish.rating && (
                            <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#FBBF24', backgroundColor: 'rgba(251,191,36,0.1)', padding: '2px 8px', borderRadius: '8px' }}>
                              ★ {dish.rating}/5
                            </span>
                          )}
                        </div>
                      </div>

                      {dish.notes && dish.notes.trim() && (
                        <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.8)', fontStyle: 'italic' }}>
                          <RenderFormattedNotes text={dish.notes.trim()} isLightBg={false} />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Clean signature footer */}
              <div style={{ marginTop: '32px', paddingTop: '14px', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '9px', fontWeight: 'bold', color: 'rgba(255,255,255,0.3)', letterSpacing: '1px', textTransform: 'uppercase' }}>
                <span>BUXMAN DINING LOG</span>
                <span>AUTHENTIC VERIFIED</span>
              </div>
            </div>
          </div>
        );

      case 'ivory':
        return (
          <div id={targetId} style={{ ...wrapperStyle, backgroundColor: '#FAF9F6', color: '#111827', padding: '32px', borderRadius: '24px', border: '1px solid #E5E7EB', boxShadow: '0 20px 40px rgba(0,0,0,0.1)' }}>
            <div style={{ borderBottom: '2px solid #111827', paddingBottom: '16px', marginBottom: '24px' }}>
              <div style={{ fontSize: '10px', fontWeight: 'bold', color: '#6B7280', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '6px' }}>
                PREMIUM DINING MEMORANDUM
              </div>
              <h2 style={{ fontSize: '28px', fontWeight: 'bold', lineHeight: '34px', margin: '0 0 8px 0', color: '#000000', fontFamily: 'serif' }}>
                {restaurantName}
              </h2>
              
              <div style={{ fontSize: '12px', color: '#4B5563', fontWeight: 'bold', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                {location?.address && <div>📍 {location.address.split(',')[0]}</div>}
                <div style={{ color: '#059669' }}>📅 {formatDateSafe(visitDate, 'MMMM d, yyyy')}</div>
              </div>
            </div>

            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ fontSize: '10px', fontWeight: 'bold', color: '#9CA3AF', letterSpacing: '1px' }}>
                LOGGED ITEMS:
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {dishes.map((dish, i) => (
                  <div key={i} style={{ backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB', padding: '12px 14px', borderRadius: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#111827' }}>
                        {dish.name}
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {dish.price && (
                          <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#059669', backgroundColor: '#D1FAE5', padding: '2px 8px', borderRadius: '6px' }}>
                            ₹{dish.price}
                          </span>
                        )}
                        {dish.rating && (
                          <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#D97706', backgroundColor: '#FEF3C7', padding: '2px 8px', borderRadius: '6px' }}>
                            ★ {dish.rating}/5
                          </span>
                        )}
                      </div>
                    </div>

                    {dish.notes && dish.notes.trim() && (
                      <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #F3F4F6', color: '#374151', fontStyle: 'italic', fontFamily: 'serif' }}>
                        <RenderFormattedNotes text={dish.notes.trim()} isLightBg={true} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div style={{ marginTop: '32px', paddingTop: '12px', borderTop: '1px solid #E5E7EB', textAlign: 'center', fontSize: '9px', fontWeight: 'bold', color: '#9CA3AF', letterSpacing: '1px' }}>
              BUXMAN SECURE ARCHIVE
            </div>
          </div>
        );

      case 'crimson':
        return (
          <div id={targetId} style={{ ...wrapperStyle, backgroundColor: '#0C0A0A', color: '#FFFFFF', padding: 0, borderRadius: '24px', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 20px 50px rgba(220,38,38,0.15)' }}>
            {/* Top Bold Header Block */}
            <div style={{ backgroundColor: '#DC2626', padding: '20px 24px', color: '#FFFFFF' }}>
              <div style={{ fontSize: '9px', fontWeight: 'bold', letterSpacing: '2px', opacity: 0.9, marginBottom: '4px' }}>
                // EXCLUSIVE LOG
              </div>
              <h2 style={{ fontSize: '26px', fontWeight: 'bold', lineHeight: '32px', margin: 0, color: '#FFFFFF' }}>
                {restaurantName}
              </h2>
            </div>

            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', flex: 1 }}>
              <div style={{ marginBottom: '20px', paddingBottom: '16px', borderBottom: '1px solid rgba(255,255,255,0.08)', fontSize: '12px', color: 'rgba(255,255,255,0.7)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {location?.address && <div>📍 {location.address.split(',')[0]}</div>}
                <div style={{ color: '#FCA5A5', fontWeight: 'bold' }}>📅 {formatDateSafe(visitDate, 'MMMM d, yyyy')}</div>
              </div>

              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ fontSize: '10px', fontWeight: 'bold', color: '#9CA3AF', letterSpacing: '1px' }}>
                  ITEMS LOGGED:
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {dishes.map((dish, i) => (
                    <div key={i} style={{ backgroundColor: 'rgba(255,255,255,0.03)', borderLeft: '3px solid #DC2626', padding: '12px', borderRadius: '0 12px 12px 0' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#FFFFFF' }}>
                          {dish.name}
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {dish.price && (
                            <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#FCA5A5' }}>
                              ₹{dish.price}
                            </span>
                          )}
                          {dish.rating && (
                            <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#FECACA' }}>
                              ★ {dish.rating}/5
                            </span>
                          )}
                        </div>
                      </div>

                      {dish.notes && dish.notes.trim() && (
                        <div style={{ marginTop: '6px', color: 'rgba(255,255,255,0.8)' }}>
                          <RenderFormattedNotes text={dish.notes.trim()} isLightBg={false} />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ marginTop: '28px', textAlign: 'center', fontSize: '9px', fontWeight: 'bold', color: 'rgba(255,255,255,0.3)', letterSpacing: '1px' }}>
                BUXMAN CRIMSON RESERVE
              </div>
            </div>
          </div>
        );

      case 'emerald':
        return (
          <div id={targetId} style={{ ...wrapperStyle, backgroundColor: '#02120A', color: '#FFFFFF', padding: '32px', borderRadius: '28px', border: '1px solid rgba(16,185,129,0.2)', boxShadow: '0 20px 50px rgba(2,18,10,0.8)' }}>
            <div style={{ marginBottom: '24px', paddingBottom: '16px', borderBottom: '1px solid rgba(16,185,129,0.2)' }}>
              <div style={{ color: '#34D399', fontSize: '10px', fontWeight: 'bold', letterSpacing: '1px', marginBottom: '6px' }}>
                GARDEN COLLECTION
              </div>
              <h2 style={{ fontSize: '28px', fontWeight: 'bold', lineHeight: '34px', margin: '0 0 8px 0', color: '#FFFFFF' }}>
                {restaurantName}
              </h2>
              <div style={{ fontSize: '12px', color: '#A7F3D0', fontWeight: 'bold', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                {location?.address && <div>📍 {location.address.split(',')[0]}</div>}
                <div>📅 {formatDateSafe(visitDate, 'MMMM d, yyyy')}</div>
              </div>
            </div>

            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ fontSize: '10px', fontWeight: 'bold', color: '#6EE7B7', opacity: 0.7, letterSpacing: '1px' }}>
                VERIFIED DISHES:
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {dishes.map((dish, i) => (
                  <div key={i} style={{ backgroundColor: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.15)', padding: '12px 14px', borderRadius: '14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#FFFFFF' }}>
                        {dish.name}
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {dish.price && (
                          <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#A7F3D0' }}>
                            ₹{dish.price}
                          </span>
                        )}
                        {dish.rating && (
                          <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#6EE7B7', backgroundColor: 'rgba(110,231,183,0.1)', padding: '2px 8px', borderRadius: '6px' }}>
                            ★ {dish.rating}/5
                          </span>
                        )}
                      </div>
                    </div>

                    {dish.notes && dish.notes.trim() && (
                      <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid rgba(16,185,129,0.1)', color: '#D1FAE5', fontStyle: 'italic' }}>
                        <RenderFormattedNotes text={dish.notes.trim()} isLightBg={false} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div style={{ marginTop: '32px', paddingTop: '12px', borderTop: '1px solid rgba(16,185,129,0.1)', textAlign: 'center', fontSize: '9px', fontWeight: 'bold', color: '#059669', letterSpacing: '1px' }}>
              BUXMAN EMERALD
            </div>
          </div>
        );

      case 'critic':
        const highestRating = Math.max(...dishes.map(d => d.rating || 0), 0);
        const bestDishes = dishes.filter(d => (d.rating || 0) === highestRating || d.status === 'liked');
        
        return (
          <div id={targetId} style={{ ...wrapperStyle, backgroundColor: '#090B11', color: '#E2E8F0', padding: '36px', borderRadius: '28px', border: '1px solid rgba(245,158,11,0.2)', boxShadow: '0 20px 50px rgba(245,158,11,0.08)' }}>
            <div style={{ position: 'absolute', top: 0, right: 0, width: '180px', height: '180px', borderRadius: '100px', backgroundColor: 'rgba(245,158,11,0.06)', filter: 'blur(50px)', pointerEvents: 'none' }} />

            <div style={{ display: 'flex', flexDirection: 'column', flex: 1, position: 'relative', zIndex: 2 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '12px' }}>
                <span style={{ fontSize: '9px', fontWeight: 'black', color: '#F59E0B', letterSpacing: '2px', textTransform: 'uppercase' }}>
                  ★ THE CRITIC'S CHOICE
                </span>
                <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', fontWeight: 'bold' }}>
                  {formatDateSafe(visitDate, 'MMM yyyy')}
                </span>
              </div>

              <div style={{ marginBottom: '24px' }}>
                <h2 style={{ fontSize: '32px', fontWeight: 'black', letterSpacing: '-1px', lineHeight: '36px', margin: '0 0 4px 0', color: '#FFFFFF' }}>
                  {restaurantName}
                </h2>
                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', display: 'flex', gap: '8px', alignItems: 'center', fontWeight: 'bold' }}>
                  <span>{cuisine || 'Fine Dining'}</span>
                  {location?.address && (
                    <>
                      <span style={{ width: '4px', height: '4px', borderRadius: '2px', backgroundColor: 'rgba(255,255,255,0.2)' }} />
                      <span>📍 {location.address.split(',')[0]}</span>
                    </>
                  )}
                </div>
              </div>

              <div style={{ backgroundColor: 'rgba(245,158,11,0.03)', border: '1px solid rgba(245,158,11,0.1)', padding: '20px', borderRadius: '18px', marginBottom: '24px' }}>
                <div style={{ fontSize: '9px', fontWeight: 'black', color: '#F59E0B', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '8px' }}>
                  Overall Verdict
                </div>
                <div style={{ color: '#E2E8F0', fontStyle: 'italic', margin: 0 }}>
                  <RenderFormattedNotes text={experience.overallNotes || `Outstanding culinary destination. Each dish reflects careful preparation and vibrant flavor profiles. Highly recommended.`} isLightBg={false} />
                </div>
              </div>

              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ fontSize: '9px', fontWeight: 'black', color: 'rgba(255,255,255,0.4)', letterSpacing: '1px', textTransform: 'uppercase' }}>
                  Standout Selections
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {bestDishes.map((dish, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)', padding: '12px 16px', borderRadius: '14px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#FFFFFF' }}>
                          🏆 {dish.name}
                        </span>
                        {dish.notes && (
                          <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', fontStyle: 'italic' }}>
                            <RenderFormattedNotes text={dish.notes.length > 50 ? `${dish.notes.substring(0, 47)}...` : dish.notes} isLightBg={false} />
                          </span>
                        )}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                        {dish.price && (
                          <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#F59E0B', backgroundColor: 'rgba(245,158,11,0.1)', padding: '2px 6px', borderRadius: '6px' }}>
                            ₹{dish.price}
                          </span>
                        )}
                        {dish.rating && (
                          <span style={{ fontSize: '12px', fontWeight: 'black', color: '#F59E0B' }}>
                            ★ {dish.rating}.0
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                  {bestDishes.length === 0 && (
                    <div style={{ textAlign: 'center', fontSize: '12px', color: 'rgba(255,255,255,0.4)', fontStyle: 'italic' }}>
                      No dishes logged yet
                    </div>
                  )}
                </div>
              </div>

              <div style={{ marginTop: '32px', paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', fontSize: '9px', fontWeight: 'black', color: 'rgba(255,255,255,0.3)', letterSpacing: '1px', textTransform: 'uppercase' }}>
                <span>Buxman Critic Review</span>
                <span>Fidelity Checked</span>
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl bg-background/95 backdrop-blur-3xl border-white/10 rounded-[2.5rem] p-0 overflow-y-auto md:overflow-hidden shadow-2xl flex flex-col md:flex-row max-h-[90vh] md:h-[750px]">
        
        {/* Floating Absolute X Close Button to exit screen instantly */}
        <button 
          onClick={() => onOpenChange(false)}
          className="absolute top-4 right-4 z-50 h-9 w-9 rounded-full bg-background/80 backdrop-blur-md border border-white/10 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-white/10 transition-all shadow-md"
        >
          <X className="h-4.5 w-4.5" />
        </button>

        {/* Hidden off-screen unscaled version specifically dedicated for html2canvas to capture native uncompromised kerning metrics */}
        <div style={{ position: 'absolute', left: '-9999px', top: '-9999px', transform: 'none' }}>
          {renderPremiumCard('premium-share-card-capture')}
        </div>

        {/* Left Side: Premium Live Capture Preview Studio */}
        <div className="w-full md:flex-1 bg-muted/20 p-4 md:p-6 flex flex-col items-center justify-center relative overflow-hidden md:overflow-y-auto border-b md:border-b-0 md:border-r border-border/40 shrink-0">
          <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
            <Badge variant="outline" className="bg-background/80 backdrop-blur-md text-[10px] font-bold uppercase tracking-widest gap-1 border-white/10 py-1">
              <Sparkles className="h-3 w-3 text-amber-400" /> Premium Preview
            </Badge>
          </div>

          {/* Sized perfectly using tailored negative bottom margins to completely eliminate document-flow scale empty gaps */}
          <div className={cn(
            "w-full flex items-center justify-center pt-16 md:pt-8 my-auto scale-[0.6] sm:scale-[0.8] md:scale-100 origin-top md:origin-center transition-all duration-300",
            aspectRatio === 'story' ? "-mb-[260px] sm:-mb-[120px] md:mb-0" : "-mb-[160px] sm:-mb-[80px] md:mb-0"
          )}>
            {renderPremiumCard('premium-share-card-preview')}
          </div>

          <div className="text-[10px] text-muted-foreground/60 font-medium tracking-wide mt-auto pt-4 text-center shrink-0">
            High-fidelity layout powered by native vector-safe typography export
          </div>
        </div>

        {/* Right Side: Options Studio */}
        <div className="w-full md:w-[400px] bg-background flex flex-col md:h-full shrink-0 pt-4 md:pt-0">
          <div className="p-6 border-b border-border/40 shrink-0 pr-16">
            <DialogHeader>
              <DialogTitle className="text-2xl font-black tracking-tight flex items-center gap-2">
                Share Cinematic Card <Share2 className="h-5 w-5 text-primary" />
              </DialogTitle>
            </DialogHeader>
            <p className="text-xs text-muted-foreground mt-1">
              Select an aesthetic template to render your dining facts beautifully.
            </p>
          </div>

          {/* Studio Config Content Area */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Aspect Ratio Sizing Section */}
            <div className="space-y-2">
              <div className="text-xs font-black uppercase tracking-widest text-muted-foreground">Format Layout</div>
              <div className="flex gap-2 bg-muted/40 p-1 rounded-xl border border-border/40">
                <button 
                  onClick={() => setAspectRatio('standard')} 
                  className={cn("flex-1 py-2 rounded-lg text-xs font-bold transition-all", aspectRatio === 'standard' ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}
                >
                  Standard Card
                </button>
                <button 
                  onClick={() => setAspectRatio('story')} 
                  className={cn("flex-1 py-2 rounded-lg text-xs font-bold transition-all", aspectRatio === 'story' ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}
                >
                  9:16 Story
                </button>
              </div>
            </div>

            {/* Themes list selection */}
            <div className="space-y-2">
              <div className="text-xs font-black uppercase tracking-widest text-muted-foreground">Premium Export Styles</div>
              <div className="grid grid-cols-1 gap-3">
                {THEMES.map((theme) => {
                  const isSelected = selectedTheme === theme.id;
                  return (
                    <button
                      key={theme.id}
                      onClick={() => handleThemeSelect(theme.id)}
                      className={cn(
                        "p-3.5 rounded-2xl border text-left transition-all relative flex flex-col gap-1 justify-between group",
                        isSelected ? "bg-primary/5 border-primary shadow-md" : "bg-card/40 border-border/40 hover:border-primary/40"
                      )}
                    >
                      <div className="flex justify-between items-center w-full">
                        <span className="font-bold text-sm tracking-tight">{theme.name}</span>
                        <Badge variant="secondary" className="text-[9px] px-2 py-0.5 font-bold uppercase shrink-0">
                          {theme.badge}
                        </Badge>
                      </div>
                      <span className="text-xs text-muted-foreground leading-snug mt-1">{theme.desc}</span>
                      {isSelected && (
                        <div className="absolute right-3 bottom-3 h-2 w-2 rounded-full bg-primary" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Export action triggers */}
          <div className="p-6 border-t border-border/40 bg-card/20 space-y-3 shrink-0">
            <Button 
              onClick={handleNativeShareImage}
              className="w-full h-12 rounded-2xl bg-primary text-white hover:opacity-95 font-black uppercase tracking-widest text-[11px] gap-2 shadow-glow border-none"
            >
              <Share2 className="h-4.5 w-4.5" /> Share Visual Layout Card
            </Button>

            <div className="grid grid-cols-2 gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleDownloadImage}
                className="h-10 rounded-xl text-xs font-bold gap-1.5 border-border/60 hover:bg-muted/50"
              >
                <Download className="h-3.5 w-3.5" /> Save High-Res Card
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleCopyText}
                className="h-10 rounded-xl text-xs font-bold gap-1.5 border-border/60 hover:bg-muted/50"
              >
                {copiedText ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                {copiedText ? 'Copied' : 'Copy Text'}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
