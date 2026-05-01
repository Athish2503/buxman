import { useState, useRef } from 'react';
import { X, ZoomIn, ZoomOut, RotateCw, Download, Share2, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { haptics } from '@/lib/haptics';
import { toast } from 'sonner';

interface ImageViewerProps {
  src: string;
  isOpen: boolean;
  onClose: () => void;
  onDelete?: () => void;
  title?: string;
}

export function ImageViewer({ src, isOpen, onClose, onDelete, title }: ImageViewerProps) {
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const isDragging = useRef(false);
  const startPos = useRef({ x: 0, y: 0 });

  const handleZoomIn = () => {
    haptics.light();
    setScale(s => Math.min(s + 0.5, 4));
  };

  const handleZoomOut = () => {
    haptics.light();
    setScale(s => {
      const next = Math.max(s - 0.5, 1);
      if (next === 1) setPosition({ x: 0, y: 0 });
      return next;
    });
  };

  const handleRotate = () => {
    haptics.light();
    setRotation(r => (r + 90) % 360);
  };

  const handleReset = () => {
    setScale(1);
    setRotation(0);
    setPosition({ x: 0, y: 0 });
  };

  const handleDelete = () => {
    if (!onDelete) return;
    haptics.heavy();
    onDelete();
    toast.success('Deleted from Wallet');
    onClose();
  };

  const handleMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
    if (scale === 1) return;
    isDragging.current = true;
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    startPos.current = { x: clientX - position.x, y: clientY - position.y };
  };

  const handleMouseMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDragging.current || scale === 1) return;
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    setPosition({
      x: clientX - startPos.current.x,
      y: clientY - startPos.current.y
    });
  };

  const handleMouseUp = () => {
    isDragging.current = false;
  };

  return (
    <Dialog open={isOpen} onOpenChange={open => !open && onClose()}>
      <DialogContent className="max-w-[100vw] h-[100vh] p-0 bg-black/95 border-none shadow-none flex flex-col items-center justify-center overflow-hidden">
        <div className="sr-only">
          <DialogTitle>{title || 'Receipt Image Viewer'}</DialogTitle>
          <DialogDescription>Full screen view of the receipt with zoom and rotate controls.</DialogDescription>
        </div>

        {/* Header Controls */}
        <div className="absolute top-0 left-0 right-0 z-50 p-4 pt-8 flex items-center justify-between bg-gradient-to-b from-black/80 to-transparent">
          <div className="flex flex-col">
            <h3 className="text-white font-bold text-sm truncate max-w-[150px]">{title || 'Receipt View'}</h3>
            <p className="text-white/60 text-[10px]">{Math.round(scale * 100)}% Zoom</p>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2">
            {onDelete && (
              <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/20" onClick={handleDelete}>
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
            <Button variant="ghost" size="icon" className="text-white hover:bg-white/20" onClick={handleRotate}>
              <RotateCw className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="text-white hover:bg-white/20" onClick={handleZoomOut} disabled={scale === 1}>
              <ZoomOut className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="text-white hover:bg-white/20" onClick={handleZoomIn} disabled={scale === 4}>
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full bg-white/10 text-white hover:bg-white/20 ml-1" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Image Container */}
        <div 
          className="w-full h-full flex items-center justify-center touch-none overflow-hidden"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchStart={handleMouseDown}
          onTouchMove={handleMouseMove}
          onTouchEnd={handleMouseUp}
        >
          <div
            style={{
              transform: `translate(${position.x}px, ${position.y}px) scale(${scale}) rotate(${rotation}deg)`,
              transition: isDragging.current ? 'none' : 'transform 0.2s ease-out'
            }}
            className="relative max-w-full max-h-full"
          >
            <img 
              src={src} 
              alt="Receipt Full View" 
              className="max-w-[95vw] max-h-[85vh] object-contain select-none pointer-events-none shadow-2xl"
              onDoubleClick={handleReset}
            />
          </div>
        </div>

        {/* Bottom Tip */}
        <div className="absolute bottom-6 left-0 right-0 text-center pointer-events-none">
          <p className="text-white/40 text-[10px] uppercase tracking-widest font-medium">
            {scale > 1 ? 'Drag to pan · Double tap to reset' : 'Pinch or use buttons to zoom'}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
