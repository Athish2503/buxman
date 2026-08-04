import React, { useState } from 'react';
import { Camera, Image as ImageIcon, Eye, EyeOff, Trash2, Columns, Calendar, Tag, Plus, Check, Sparkles } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { Camera as CapCamera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ProgressPhoto, PoseTag } from '@/types/gym';
import { gymService } from '@/lib/gym-storage';
import { toast } from 'sonner';
import { haptics } from '@/lib/haptics';

export const ProgressPhotoGallery: React.FC = () => {
  const [photos, setPhotos] = useState<ProgressPhoto[]>(() => gymService.getProgressPhotos());
  const [isBlurred, setIsBlurred] = useState<boolean>(true);
  const [selectedPose, setSelectedPose] = useState<string>('ALL');

  // Add Photo State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [photoDataUri, setPhotoDataUri] = useState<string>('');
  const [poseTag, setPoseTag] = useState<PoseTag>('Front');
  const [notes, setNotes] = useState('');

  // Comparison Tool State
  const [isCompareOpen, setIsCompareOpen] = useState(false);
  const [photoA, setPhotoA] = useState<ProgressPhoto | null>(null);
  const [photoB, setPhotoB] = useState<ProgressPhoto | null>(null);

  const refreshPhotos = () => {
    setPhotos(gymService.getProgressPhotos());
  };

  const handleCapturePhoto = async () => {
    if (Capacitor.isNativePlatform()) {
      try {
        const image = await CapCamera.getPhoto({
          quality: 85,
          allowEditing: false,
          resultType: CameraResultType.DataUrl,
          source: CameraSource.Camera,
        });
        if (image.dataUrl) {
          setPhotoDataUri(image.dataUrl);
          setIsAddModalOpen(true);
        }
      } catch (err) {
        toast.error('Could not capture photo');
      }
    } else {
      // Trigger Web File Upload
      const fileInput = document.createElement('input');
      fileInput.type = 'file';
      fileInput.accept = 'image/*';
      fileInput.onchange = (e: any) => {
        const file = e.target?.files?.[0];
        if (file) {
          const reader = new FileReader();
          reader.onloadend = () => {
            setPhotoDataUri(reader.result as string);
            setIsAddModalOpen(true);
          };
          reader.readAsDataURL(file);
        }
      };
      fileInput.click();
    }
  };

  const handleSavePhoto = () => {
    if (!photoDataUri) return;
    gymService.addProgressPhoto({
      date: new Date().toISOString().split('T')[0],
      photoUri: photoDataUri,
      pose: poseTag,
      notes: notes.trim() || undefined,
    });
    haptics.success();
    toast.success('Progress photo saved!');
    refreshPhotos();
    setIsAddModalOpen(false);
    setPhotoDataUri('');
    setNotes('');
  };

  const handleDeletePhoto = (id: string) => {
    gymService.deleteProgressPhoto(id);
    toast.success('Photo removed');
    refreshPhotos();
  };

  const filteredPhotos = photos.filter(
    (p) => selectedPose === 'ALL' || p.pose === selectedPose
  );

  return (
    <div className="space-y-4">
      {/* Header Actions */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={handleCapturePhoto}
            className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs shadow-md shadow-emerald-500/20"
          >
            <Camera className="w-3.5 h-3.5 mr-1.5" />
            Add Progress Photo
          </Button>

          {photos.length >= 2 && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setPhotoA(photos[photos.length - 1]);
                setPhotoB(photos[0]);
                setIsCompareOpen(true);
              }}
              className="border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10 rounded-xl text-xs"
            >
              <Columns className="w-3.5 h-3.5 mr-1.5" />
              Compare Progress
            </Button>
          )}
        </div>

        {/* Blur / Privacy Lock Toggle */}
        <button
          onClick={() => setIsBlurred(!isBlurred)}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground bg-card/60 border border-border/40 px-2.5 py-1.5 rounded-xl transition-colors"
        >
          {isBlurred ? (
            <>
              <EyeOff className="w-3.5 h-3.5 text-amber-400" />
              <span>Privacy Blur: ON</span>
            </>
          ) : (
            <>
              <Eye className="w-3.5 h-3.5 text-emerald-400" />
              <span>Privacy Blur: OFF</span>
            </>
          )}
        </button>
      </div>

      {/* Pose Filter Tabs */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {['ALL', 'Front', 'Back', 'Side', 'Flex'].map((pose) => (
          <Badge
            key={pose}
            variant={selectedPose === pose ? 'default' : 'outline'}
            className="cursor-pointer text-xs rounded-lg whitespace-nowrap"
            onClick={() => setSelectedPose(pose)}
          >
            {pose}
          </Badge>
        ))}
      </div>

      {/* Photos Grid */}
      {filteredPhotos.length === 0 ? (
        <div className="text-center py-12 bg-card/40 border border-border/40 rounded-2xl p-6">
          <ImageIcon className="w-10 h-10 text-muted-foreground mx-auto mb-2 opacity-50" />
          <h4 className="text-sm font-semibold text-foreground">No progress photos logged yet</h4>
          <p className="text-xs text-muted-foreground max-w-xs mx-auto mt-1">
            Snap body progress photos over time to visually track your body transformation.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {filteredPhotos.map((photo) => (
            <div
              key={photo.id}
              className="group relative bg-card border border-border/50 rounded-2xl overflow-hidden aspect-[3/4] flex flex-col"
            >
              <img
                src={photo.photoUri}
                alt={`Progress ${photo.pose}`}
                className={`w-full h-full object-cover transition-all duration-300 ${
                  isBlurred ? 'blur-md hover:blur-none scale-105' : ''
                }`}
              />

              {/* Photo Overlay Badge */}
              <div className="absolute top-2 left-2 right-2 flex items-center justify-between pointer-events-none">
                <span className="text-[10px] font-bold bg-background/80 backdrop-blur-md px-2 py-0.5 rounded-md text-foreground border border-border/40">
                  {photo.pose}
                </span>
                <span className="text-[10px] bg-black/60 text-white backdrop-blur-md px-2 py-0.5 rounded-md">
                  {photo.date}
                </span>
              </div>

              {/* Delete Hover Button */}
              <button
                onClick={() => handleDeletePhoto(photo.id)}
                className="absolute bottom-2 right-2 w-7 h-7 rounded-full bg-destructive/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add Photo Details Dialog */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="max-w-sm bg-background/95 backdrop-blur-xl border-border/60 p-5 rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Save Progress Photo</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Tag pose and details for this photo entry.
            </DialogDescription>
          </DialogHeader>

          {photoDataUri && (
            <div className="w-full h-48 rounded-xl overflow-hidden border border-border/50">
              <img src={photoDataUri} alt="Preview" className="w-full h-full object-cover" />
            </div>
          )}

          <div className="space-y-3 pt-2">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Pose Tag</label>
              <div className="grid grid-cols-4 gap-1.5 mt-1">
                {(['Front', 'Back', 'Side', 'Flex'] as PoseTag[]).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPoseTag(p)}
                    className={`py-1.5 text-xs font-medium rounded-xl border transition-all ${
                      poseTag === p
                        ? 'bg-emerald-500 text-white border-emerald-400'
                        : 'bg-muted/40 border-border/40 text-muted-foreground'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button variant="ghost" onClick={() => setIsAddModalOpen(false)} className="flex-1 rounded-xl">
                Cancel
              </Button>
              <Button
                onClick={handleSavePhoto}
                className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl"
              >
                <Check className="w-4 h-4 mr-1.5" /> Save
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Side by Side Comparison Dialog */}
      <Dialog open={isCompareOpen} onOpenChange={setIsCompareOpen}>
        <DialogContent className="max-w-lg bg-background/95 backdrop-blur-xl border-border/60 p-5 rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-400" /> Progress Photo Comparison
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Compare two photos side-by-side to visually measure body transformation.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-3 py-2">
            {/* Photo A */}
            <div className="space-y-2">
              <div className="text-xs font-semibold text-center text-muted-foreground">Before</div>
              <div className="w-full h-56 rounded-xl overflow-hidden border border-border/50 bg-card">
                {photoA ? (
                  <img src={photoA.photoUri} alt="Before" className="w-full h-full object-cover" />
                ) : (
                  <div className="flex items-center justify-center h-full text-xs text-muted-foreground">Select Photo</div>
                )}
              </div>
              {photoA && (
                <div className="text-[11px] text-center text-emerald-400 font-mono">{photoA.date} ({photoA.pose})</div>
              )}
            </div>

            {/* Photo B */}
            <div className="space-y-2">
              <div className="text-xs font-semibold text-center text-emerald-400">After</div>
              <div className="w-full h-56 rounded-xl overflow-hidden border border-border/50 bg-card">
                {photoB ? (
                  <img src={photoB.photoUri} alt="After" className="w-full h-full object-cover" />
                ) : (
                  <div className="flex items-center justify-center h-full text-xs text-muted-foreground">Select Photo</div>
                )}
              </div>
              {photoB && (
                <div className="text-[11px] text-center text-emerald-400 font-mono">{photoB.date} ({photoB.pose})</div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
