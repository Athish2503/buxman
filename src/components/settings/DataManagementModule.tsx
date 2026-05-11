import { ShieldAlert, Database, ChevronRight, Receipt, Fuel, Camera, Car } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { storageEngine } from '@/lib/storage-engine';
import { SubModuleHeader } from './Common';
import { Input } from '@/components/ui/input';

interface DataManagementModuleProps {
  onBack: () => void;
  setShowExportOptions: (show: boolean) => void;
  setShowConfirm: (confirm: any) => void;
  advDeleteType: string | null;
  setAdvDeleteType: (type: string | null) => void;
  advDeleteDays: string;
  setAdvDeleteDays: (days: string) => void;
  advDeleteStart: string;
  setAdvDeleteStart: (start: string) => void;
  advDeleteEnd: string;
  setAdvDeleteEnd: (end: string) => void;
  executeAdvancedDelete: (type: string) => void;
}

export function DataManagementModule({
  onBack,
  setShowExportOptions,
  setShowConfirm,
  advDeleteType,
  setAdvDeleteType,
  advDeleteDays,
  setAdvDeleteDays,
  advDeleteStart,
  setAdvDeleteStart,
  advDeleteEnd,
  setAdvDeleteEnd,
  executeAdvancedDelete
}: DataManagementModuleProps) {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
      <SubModuleHeader title="Data Management" onBack={onBack} />
      
      <div className="space-y-4">
        <div className="bg-amber-500/10 border border-amber-500/20 p-5 rounded-3xl flex items-start gap-3 relative overflow-hidden group">
          <div className="absolute -right-4 -bottom-4 opacity-10 rotate-12 transition-transform group-hover:scale-110">
            <ShieldAlert className="h-20 w-20 text-amber-500" />
          </div>
          <ShieldAlert className="h-6 w-6 text-amber-500 shrink-0 relative z-10" />
          <div className="relative z-10">
            <h4 className="text-sm font-bold text-amber-600 dark:text-amber-500">Local-Only Storage</h4>
            <p className="text-[11px] text-amber-700 dark:text-amber-200/70 leading-relaxed mt-1">
              Your data never leaves this device. This means erasing it is permanent. 
              Always backup (export) your data before doing a reset.
            </p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 gap-2">
           <div className="p-6 rounded-[2.5rem] bg-white dark:bg-card/30 border border-border/50 dark:border-border/40 space-y-6 relative overflow-hidden shadow-sm dark:shadow-none">
             <div className="flex items-center gap-4">
               <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center shadow-inner">
                 <Database className="h-6 w-6 text-primary" />
               </div>
               <div>
                 <h4 className="text-sm font-bold">Secure Ecosystem Sync</h4>
                 <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest mt-0.5">Backup & Recovery Hub</p>
               </div>
             </div>
 
             <div className="grid grid-cols-2 gap-3">
               <Button 
                 variant="outline" 
                 className="h-20 flex-col rounded-3xl border-primary/20 bg-primary/5 hover:bg-primary/10 text-primary gap-1 font-bold transition-all group"
                 onClick={() => setShowExportOptions(true)}
               >
                 <ChevronRight className="h-5 w-5 rotate-90 group-hover:translate-y-1 transition-transform" />
                 <span className="text-[10px] uppercase tracking-widest">Export All</span>
               </Button>
 
               <div className="relative">
                  <input 
                    id="import-data-input"
                    type="file" 
                    accept=".json,.csv"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      
                      const format = file.name.endsWith('.csv') ? 'csv' : 'json';
                      toast.info(`Processing ${format.toUpperCase()} backup file...`);
                      const reader = new FileReader();
                      
                      reader.onload = async (event) => {
                        try {
                          const content = event.target?.result as string;
                          if (!content) throw new Error('File is empty');
                          
                          const m = await import('@/lib/data-migration');
                          const success = await m.dataMigrationService.importData(content, format);
                          
                          e.target.value = '';
                          
                          if (success) {
                            setShowConfirm({
                              title: 'Restore Complete!',
                              description: 'Your data has been successfully imported. The application needs to reload to apply changes.',
                              variant: 'info',
                              onConfirm: () => {
                                toast.info('Reloading app...');
                                setTimeout(() => window.location.reload(), 500);
                              }
                            });
                          } else {
                            toast.error('Import Failed', { description: 'The file format is incorrect or incompatible.' });
                          }
                        } catch (err) {
                          console.error('Import error:', err);
                          toast.error('Error parsing file');
                          e.target.value = '';
                        }
                      };
                      
                      reader.onerror = () => {
                        toast.error('Failed to read file');
                        e.target.value = '';
                      };
                      
                      reader.readAsText(file);
                    }}
                  />
                  <Button 
                    variant="outline"
                    className="h-20 w-full flex-col rounded-3xl border border-dashed border-border/60 hover:border-primary/40 hover:bg-muted/50 flex items-center justify-center gap-1 transition-all group"
                    onClick={async () => {
                      const { Capacitor } = await import('@capacitor/core');
                      if (Capacitor.isNativePlatform()) {
                        toast.info('Opening file picker...');
                        const m = await import('@/lib/data-migration');
                        const success = await m.dataMigrationService.pickAndImportData();
                        if (success) {
                          setShowConfirm({
                            title: 'Restore Complete!',
                            description: 'Your data has been successfully imported. The application needs to reload to apply changes.',
                            variant: 'info',
                            onConfirm: () => {
                              toast.info('Reloading app...');
                              setTimeout(() => window.location.reload(), 500);
                            }
                          });
                        } else {
                          toast.error('Import cancelled or failed');
                        }
                      } else {
                        document.getElementById('import-data-input')?.click();
                      }
                    }}
                  >
                    <ChevronRight className="h-5 w-5 -rotate-90 group-hover:-translate-y-1 transition-transform" />
                    <span className="text-[10px] uppercase tracking-widest font-black text-muted-foreground">Import Data</span>
                  </Button>
                </div>
             </div>
           </div>
 
           <div className="mt-4 px-2">
             <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 mb-4 ml-1">Advanced Selective Eraser</p>
             <div className="space-y-2">
               {[
                 { label: 'Expenses', icon: Receipt, type: 'expenses' },
                 { label: 'Fuel Logs', icon: Fuel, type: 'fuel' },
                 { label: 'Wallet', icon: Camera, type: 'wallet' },
                 { label: 'Vehicles', icon: Car, type: 'mileage' }
               ].map(item => (
                 <div key={item.type} className="group flex flex-col gap-2">
                    <div className="flex items-center gap-3 p-4 rounded-2xl bg-white dark:bg-card/30 border border-border/50 dark:border-border/40 transition-all hover:border-destructive/40">
                      <div className="h-10 w-10 rounded-xl bg-muted/30 flex items-center justify-center">
                        <item.icon className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs font-bold">{item.label}</p>
                        <p className="text-[10px] text-muted-foreground">Selective wipe or date-range delete</p>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-destructive hover:bg-destructive/10 h-8 rounded-lg font-black text-[9px] uppercase tracking-widest"
                        onClick={() => setAdvDeleteType(advDeleteType === item.type ? null : item.type)}
                      >
                        {advDeleteType === item.type ? 'Cancel' : 'Manage'}
                      </Button>
                    </div>
                    
                    {advDeleteType === item.type && (
                      <div className="p-4 rounded-2xl bg-destructive/5 border border-destructive/10 animate-in slide-in-from-top-2 duration-200 mb-2">
                         <div className="space-y-4">
                           <div>
                             <p className="text-[9px] font-black uppercase tracking-widest text-destructive mb-2">Delete mode</p>
                             <div className="grid grid-cols-2 gap-2">
                               <Button 
                                 variant="outline" 
                                 className={cn("h-9 text-[10px] rounded-xl border-destructive/20", !advDeleteStart && "bg-destructive/10 border-destructive/40")}
                                 onClick={() => { setAdvDeleteStart(''); setAdvDeleteEnd(''); }}
                               >
                                 Days Older Than
                               </Button>
                               <Button 
                                 variant="outline" 
                                 className={cn("h-9 text-[10px] rounded-xl border-destructive/20", advDeleteStart && "bg-destructive/10 border-destructive/40")}
                                 onClick={() => { if (!advDeleteStart) setAdvDeleteStart(new Date().toISOString().split('T')[0]); }}
                               >
                                 Date Range
                               </Button>
                             </div>
                           </div>

                           {!advDeleteStart ? (
                             <div className="flex items-center gap-3">
                               <Input 
                                 type="number" 
                                 value={advDeleteDays} 
                                 onChange={e => setAdvDeleteDays(e.target.value)}
                                 className="h-9 bg-white dark:bg-black/20 border-destructive/20 text-xs text-center font-bold w-20 rounded-xl"
                               />
                               <span className="text-xs text-muted-foreground">Days old</span>
                             </div>
                           ) : (
                             <div className="grid grid-cols-2 gap-2">
                               <Input 
                                 type="date" 
                                 value={advDeleteStart} 
                                 onChange={e => setAdvDeleteStart(e.target.value)}
                                 className="h-9 bg-white dark:bg-black/20 border-destructive/20 text-[10px] rounded-xl"
                               />
                               <Input 
                                 type="date" 
                                 value={advDeleteEnd} 
                                 onChange={e => setAdvDeleteEnd(e.target.value)}
                                 className="h-9 bg-white dark:bg-black/20 border-destructive/20 text-[10px] rounded-xl"
                               />
                             </div>
                           )}

                           <Button 
                             className="w-full h-10 rounded-xl bg-destructive text-white font-black uppercase tracking-widest text-[10px] shadow-lg shadow-destructive/20"
                             onClick={() => executeAdvancedDelete(item.type)}
                           >
                             Confirm Wipe
                           </Button>
                         </div>
                      </div>
                    )}
                 </div>
               ))}
             </div>
           </div>
        </div>
      </div>
    </div>
  );
}
