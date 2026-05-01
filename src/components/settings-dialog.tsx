import { useEffect, useState } from 'react';
import { Settings as SettingsIcon } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

import { InvoiceSettings, settingsService } from '@/lib/settings';

interface SettingsDialogProps {
  onSaved?: (settings: InvoiceSettings) => void;
}

export function SettingsDialog({ onSaved }: SettingsDialogProps) {
  const [open, setOpen] = useState(false);
  const [settings, setSettings] = useState<InvoiceSettings>(settingsService.get());

  useEffect(() => {
    if (open) setSettings(settingsService.get());
  }, [open]);

  const update = (path: 'billedTo' | 'billedFrom', key: string, value: string) => {
    setSettings((s) => ({ ...s, [path]: { ...s[path], [key]: value } }));
  };

  const handleSave = () => {
    settingsService.save(settings);
    onSaved?.(settings);
    toast.success('Invoice settings saved');
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-9 w-9" aria-label="Settings">
          <SettingsIcon className="h-4.5 w-4.5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Invoice Settings</DialogTitle>
          <DialogDescription>
            These details appear in the "Billed To" and "From" sections of your exported invoice.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          <div className="space-y-3">
            <h3 className="text-xs font-semibold tracking-wider text-muted-foreground">BILLED TO</h3>
            <div className="space-y-2">
              <Label htmlFor="bt-name" className="text-xs">Company / Recipient</Label>
              <Input
                id="bt-name"
                value={settings.billedTo.name}
                onChange={(e) => update('billedTo', 'name', e.target.value)}
                placeholder="Company Name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bt-line2" className="text-xs">Department / Address</Label>
              <Input
                id="bt-line2"
                value={settings.billedTo.line2}
                onChange={(e) => update('billedTo', 'line2', e.target.value)}
                placeholder="Accounts Payable Dept."
              />
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-xs font-semibold tracking-wider text-muted-foreground">FROM (YOU)</h3>
            <div className="space-y-2">
              <Label htmlFor="bf-name" className="text-xs">Your Name</Label>
              <Input
                id="bf-name"
                value={settings.billedFrom.name}
                onChange={(e) => update('billedFrom', 'name', e.target.value)}
                placeholder="Employee Name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bf-line2" className="text-xs">Title / Note</Label>
              <Input
                id="bf-line2"
                value={settings.billedFrom.line2}
                onChange={(e) => update('billedFrom', 'line2', e.target.value)}
                placeholder="Reimbursement Claim"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bf-email" className="text-xs">Email</Label>
              <Input
                id="bf-email"
                type="email"
                value={settings.billedFrom.email}
                onChange={(e) => update('billedFrom', 'email', e.target.value)}
                placeholder="you@example.com"
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleSave} className="bg-gradient-primary text-primary-foreground">Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
