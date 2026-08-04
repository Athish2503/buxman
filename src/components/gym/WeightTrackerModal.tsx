import React, { useState } from 'react';
import { Scale, Check, Calendar, Activity } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { gymService } from '@/lib/gym-storage';
import { toast } from 'sonner';
import { haptics } from '@/lib/haptics';

interface WeightTrackerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const WeightTrackerModal: React.FC<WeightTrackerModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const today = new Date().toISOString().split('T')[0];
  const [date, setDate] = useState(today);
  const [weightKg, setWeightKg] = useState('');
  const [bodyFat, setBodyFat] = useState('');
  const [chestCm, setChestCm] = useState('');
  const [waistCm, setWaistCm] = useState('');
  const [armsCm, setArmsCm] = useState('');
  const [notes, setNotes] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const weightNum = parseFloat(weightKg);
    if (!weightNum || weightNum <= 0) {
      toast.error('Please enter a valid weight');
      return;
    }

    gymService.addBodyMetric({
      date,
      weightKg: weightNum,
      bodyFatPercentage: bodyFat ? parseFloat(bodyFat) : undefined,
      chestCm: chestCm ? parseFloat(chestCm) : undefined,
      waistCm: waistCm ? parseFloat(waistCm) : undefined,
      armsCm: armsCm ? parseFloat(armsCm) : undefined,
      notes: notes.trim() || undefined,
    });

    haptics.success();
    toast.success('Body weight logged!');
    onSuccess();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md bg-background/95 backdrop-blur-xl border-border/60 p-5 rounded-2xl shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <Scale className="w-5 h-5 text-emerald-500" />
            Log Body Weight & Metrics
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Track daily weigh-ins and body measurements over time.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* Date Picker */}
          <div>
            <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" /> Date
            </label>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="mt-1 bg-muted/40 rounded-xl"
              required
            />
          </div>

          {/* Weight & Body Fat Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Weight (KG)</label>
              <Input
                type="number"
                step="0.1"
                placeholder="75.5"
                value={weightKg}
                onChange={(e) => setWeightKg(e.target.value)}
                className="mt-1 bg-muted/40 rounded-xl font-bold text-emerald-400"
                required
                autoFocus
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Body Fat % (Optional)</label>
              <Input
                type="number"
                step="0.1"
                placeholder="15.0"
                value={bodyFat}
                onChange={(e) => setBodyFat(e.target.value)}
                className="mt-1 bg-muted/40 rounded-xl"
              />
            </div>
          </div>

          {/* Measurements Collapsible/Optional */}
          <div className="bg-muted/20 border border-border/40 p-3 rounded-xl space-y-3">
            <div className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-emerald-400" /> Body Measurements (CM)
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-[11px] text-muted-foreground">Chest</label>
                <Input
                  type="number"
                  placeholder="102"
                  value={chestCm}
                  onChange={(e) => setChestCm(e.target.value)}
                  className="mt-0.5 h-8 text-xs bg-background/60 rounded-lg"
                />
              </div>
              <div>
                <label className="text-[11px] text-muted-foreground">Waist</label>
                <Input
                  type="number"
                  placeholder="82"
                  value={waistCm}
                  onChange={(e) => setWaistCm(e.target.value)}
                  className="mt-0.5 h-8 text-xs bg-background/60 rounded-lg"
                />
              </div>
              <div>
                <label className="text-[11px] text-muted-foreground">Arms</label>
                <Input
                  type="number"
                  placeholder="38"
                  value={armsCm}
                  onChange={(e) => setArmsCm(e.target.value)}
                  className="mt-0.5 h-8 text-xs bg-background/60 rounded-lg"
                />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="text-xs font-medium text-muted-foreground">Notes</label>
            <Input
              placeholder="Morning empty stomach, after cardio, etc."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="mt-1 bg-muted/40 rounded-xl text-xs"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              className="flex-1 rounded-xl"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl shadow-lg shadow-emerald-500/20"
            >
              <Check className="w-4 h-4 mr-2" />
              Save Metric
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
