import { useState, useEffect } from 'react';
import { 
  ShieldAlert, Database, ChevronRight, Receipt, Fuel, Camera, Car,
  Cloud, CloudOff, Settings, Key, UploadCloud, DownloadCloud, LogOut,
  X, RefreshCw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { storageEngine } from '@/lib/storage-engine';
import { SubModuleHeader } from './Common';
import { Input } from '@/components/ui/input';
import { googleDriveService } from '@/lib/google-drive';
import { settingsService } from '@/lib/settings';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';

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
  const [settings, setSettings] = useState(() => settingsService.get());
  const [isConnected, setIsConnected] = useState(() => !!googleDriveService.getAccessToken());
  const [isSyncing, setIsSyncing] = useState(false);
  const [customClientId, setCustomClientId] = useState(settings.googleDriveClientId || '');
  const [showConfig, setShowConfig] = useState(false);

  // Backups listing states
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [backups, setBackups] = useState<any[]>([]);
  const [isLoadingBackups, setIsLoadingBackups] = useState(false);

  // Helper formatting functions
  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleString(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short'
      });
    } catch {
      return dateStr;
    }
  };

  const formatSize = (bytes: number) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  useEffect(() => {
    const handleUpdate = () => {
      const updatedSettings = settingsService.get();
      setSettings(updatedSettings);
      setCustomClientId(updatedSettings.googleDriveClientId || '');
      setIsConnected(!!googleDriveService.getAccessToken());
    };
    
    const handleRestoreReady = () => {
      const dataStr = localStorage.getItem('google_drive_pending_restore_data');
      if (!dataStr) return;
      
      setShowConfirm({
        title: 'Restore Backup from Google Drive?',
        description: 'This will OVERWRITE your current local data with the downloaded backup. This action cannot be undone.',
        variant: 'warning',
        onConfirm: async () => {
          try {
            const m = await import('@/lib/data-migration');
            const success = await m.dataMigrationService.importData(dataStr, 'json');
            localStorage.removeItem('google_drive_pending_restore_data');
            
            if (success) {
              setShowConfirm({
                title: 'Restore Complete!',
                description: 'Your data has been successfully imported from Google Drive. The application needs to reload to apply changes.',
                variant: 'info',
                onConfirm: () => {
                  toast.info('Reloading app...');
                  setTimeout(() => window.location.reload(), 500);
                }
              });
            } else {
              toast.error('Import Failed', { description: 'The downloaded backup file is invalid.' });
            }
          } catch (e) {
            toast.error('Failed to import backup data');
          }
        }
      });
    };

    const handleOpenRestore = async () => {
      setShowRestoreModal(true);
      setIsLoadingBackups(true);
      try {
        const list = await googleDriveService.listBackups();
        setBackups(list || []);
      } catch (err) {
        toast.error('Failed to load backup files');
      } finally {
        setIsLoadingBackups(false);
      }
    };

    window.addEventListener('settings-updated', handleUpdate);
    window.addEventListener('google-drive-status-updated', handleUpdate);
    window.addEventListener('google-drive-restore-ready', handleRestoreReady);
    window.addEventListener('google-drive-open-restore-modal', handleOpenRestore);
    
    // Check for pending restore data (e.g. if we just redirected back)
    handleRestoreReady();

    return () => {
      window.removeEventListener('settings-updated', handleUpdate);
      window.removeEventListener('google-drive-status-updated', handleUpdate);
      window.removeEventListener('google-drive-restore-ready', handleRestoreReady);
      window.removeEventListener('google-drive-open-restore-modal', handleOpenRestore);
    };
  }, [setShowConfirm]);

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
          {/* Google Drive Cloud Backup */}
          <div className="p-6 rounded-[2.5rem] bg-white dark:bg-card/30 border border-border/50 dark:border-border/40 space-y-6 relative overflow-hidden shadow-sm dark:shadow-none">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className={cn(
                  "h-12 w-12 rounded-2xl flex items-center justify-center shadow-inner transition-colors",
                  isConnected ? "bg-emerald-500/10 text-emerald-500" : "bg-muted/30 text-muted-foreground"
                )}>
                  {isConnected ? <Cloud className="h-6 w-6" /> : <CloudOff className="h-6 w-6" />}
                </div>
                <div>
                  <h4 className="text-sm font-bold">Google Drive Backup</h4>
                  <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest mt-0.5">
                    {isConnected ? `Linked to ${settings.googleDriveLinkedEmail}` : 'Cloud Storage Integration'}
                  </p>
                </div>
              </div>
              
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowConfig(!showConfig)}
                className={cn("rounded-full hover:bg-muted/50 transition-transform duration-200", showConfig && "rotate-45")}
              >
                <Settings className="h-4 w-4 text-muted-foreground" />
              </Button>
            </div>

            {/* Custom Client ID Config Drawer */}
            {showConfig && (
              <div className="p-4 rounded-2xl bg-muted/20 border border-border/40 space-y-4 animate-in slide-in-from-top-2 duration-200">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Key className="h-3.5 w-3.5" />
                  <span className="text-[10px] font-black uppercase tracking-widest">OAuth Configuration</span>
                </div>
                
                <p className="text-[10px] text-muted-foreground leading-relaxed">
                  Buxman is a client-side offline app. To integrate Google Drive backup, you must configure a Google OAuth Client ID. Leaving it blank uses the pre-configured developer ID.
                </p>

                <div className="flex gap-2">
                  <Input
                    type="text"
                    placeholder="Paste Client ID here (ends in .apps.googleusercontent.com)"
                    value={customClientId}
                    onChange={(e) => setCustomClientId(e.target.value)}
                    className="h-9 bg-white dark:bg-black/20 text-xs rounded-xl flex-1"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9 rounded-xl font-bold px-4 text-xs shrink-0"
                    onClick={() => {
                      const updated = {
                        ...settings,
                        googleDriveClientId: customClientId.trim()
                      };
                      settingsService.save(updated);
                      toast.success('Google Client ID saved');
                      setShowConfig(false);
                    }}
                  >
                    Save
                  </Button>
                </div>

                {settings.googleDriveClientId && (
                  <Button
                    variant="link"
                    className="p-0 h-auto text-[10px] text-destructive font-bold uppercase tracking-wider block"
                    onClick={() => {
                      const updated = {
                        ...settings,
                        googleDriveClientId: ''
                      };
                      settingsService.save(updated);
                      setCustomClientId('');
                      toast.info('Reset to default Client ID');
                      setShowConfig(false);
                    }}
                  >
                    Reset to default client ID
                  </Button>
                )}

                <div className="text-[10.5px] text-muted-foreground bg-muted/30 p-4 rounded-xl space-y-2 border border-border/10 leading-relaxed text-left">
                  <p className="font-bold text-foreground flex items-center gap-1.5">
                    <Key className="h-3.5 w-3.5 text-primary" /> Setup Guide (Fix "Client Not Found"):
                  </p>
                  <p className="text-[9.5px]">
                    Google OAuth client IDs are tied to domain locations. Creating your own is free and keeps your database completely private.
                  </p>
                  <ol className="list-decimal list-inside space-y-1.5 text-[9.5px]">
                    <li>Go to the <a href="https://console.cloud.google.com/" target="_blank" rel="noreferrer" className="text-primary hover:underline font-bold">Google Cloud Console</a>.</li>
                    <li>Create a new project (e.g. <i>"Buxman Sync"</i>).</li>
                    <li><b>Enable Google Drive API</b>: In the top search bar, search for <b>"Google Drive API"</b> &rarr; click on it &rarr; click the blue <b>Enable</b> button.</li>
                    <li>Configure the <b>OAuth Consent Screen</b> (set <i>User Type</i> to <i>External</i>, add the scope <code>.../auth/drive.file</code>, and add your test user email under Test Users).</li>
                    <li>Navigate to <b>Credentials</b> &rarr; <b>Create Credentials</b> &rarr; <b>OAuth Client ID</b>.</li>
                    <li>Select <b>Web Application</b> as the type.</li>
                    <li>Under <b>Authorized Redirect URIs</b>, you MUST add exactly:
                      <div className="font-mono bg-card/60 p-2 rounded mt-1.5 text-[9px] flex items-center justify-between border border-border/40">
                        <span className="text-foreground">{window.location.origin}/</span>
                        <button 
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(window.location.origin + '/');
                            toast.success('Redirect URI copied to clipboard!');
                          }}
                          className="text-primary font-bold uppercase tracking-wider text-[8px] hover:underline shrink-0"
                        >
                          Copy URI
                        </button>
                      </div>
                    </li>
                    <li>Save, copy the generated <b>Client ID</b> (ends in <i>.apps.googleusercontent.com</i>), paste it in the field above, and click <b>Save</b>.</li>
                  </ol>

                  {/* Access Blocked warning note */}
                  <div className="mt-3 p-3 bg-amber-500/10 border border-amber-500/20 text-amber-500 rounded-xl space-y-1">
                    <p className="font-bold flex items-center gap-1.5 text-[9.5px] uppercase tracking-wide">
                      <ShieldAlert className="h-3.5 w-3.5 shrink-0" /> Fixing "Access Blocked / Error 403"
                    </p>
                    <p className="text-[9px] leading-relaxed font-normal">
                      Since your new Google App is in <i>"Testing"</i> status, Google restricts access. You must manually add your email to get access:
                    </p>
                    <p className="text-[9px] leading-relaxed font-normal pl-2 border-l border-amber-500/30">
                      In the Google Cloud Console &rarr; open <b>OAuth Consent Screen</b> &rarr; scroll down to <b>Test Users</b> &rarr; click <b>Add Users</b> &rarr; type in your Gmail address (e.g. <i>hathish113@gmail.com</i>) &rarr; click <b>Save</b>.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {isConnected ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between text-xs border-t border-border/20 pt-4">
                  <span className="text-muted-foreground">Last Cloud Backup:</span>
                  <span className="font-mono font-bold text-foreground">
                    {settings.googleDriveLastBackup 
                      ? new Date(settings.googleDriveLastBackup).toLocaleString() 
                      : 'Never'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Button
                    variant="outline"
                    disabled={isSyncing}
                    className="h-16 rounded-3xl border-emerald-500/20 bg-emerald-500/5 hover:bg-emerald-500/10 text-emerald-500 gap-1.5 font-bold transition-all flex items-center justify-center"
                    onClick={async () => {
                      setIsSyncing(true);
                      try {
                        await googleDriveService.backup();
                      } finally {
                        setIsSyncing(false);
                      }
                    }}
                  >
                    <UploadCloud className={cn("h-4 w-4", isSyncing && "animate-pulse")} />
                    <span className="text-[10px] uppercase tracking-widest">Backup Now</span>
                  </Button>

                  <Button
                    variant="outline"
                    disabled={isSyncing}
                    className="h-16 rounded-3xl border-border/60 hover:border-emerald-500/40 hover:bg-muted/50 gap-1.5 font-bold transition-all flex items-center justify-center text-muted-foreground hover:text-foreground"
                    onClick={async () => {
                      setIsSyncing(true);
                      try {
                        await googleDriveService.restore();
                      } finally {
                        setIsSyncing(false);
                      }
                    }}
                  >
                    <DownloadCloud className="h-4 w-4" />
                    <span className="text-[10px] uppercase tracking-widest">Restore Now</span>
                  </Button>
                </div>

                <div className="flex justify-end pt-2">
                  <Button
                    variant="ghost"
                    className="text-[10px] text-destructive hover:text-destructive/80 hover:bg-destructive/10 h-8 rounded-xl font-bold uppercase tracking-wider gap-1 px-3"
                    onClick={() => {
                      setShowConfirm({
                        title: 'Disconnect Google Drive?',
                        description: 'This will log you out from your Google account. Your local data will remain unaffected.',
                        variant: 'destructive',
                        onConfirm: () => {
                          googleDriveService.signOut();
                        }
                      });
                    }}
                  >
                    <LogOut className="h-3 w-3" />
                    Disconnect Account
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Connect to your Google account to securely store backup files in your personal Google Drive folder. Data is encrypted and private.
                </p>
                <Button
                  className="w-full h-12 rounded-3xl bg-gradient-primary text-white font-bold transition-all uppercase tracking-widest text-[10px] shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
                  onClick={() => {
                    googleDriveService.connect();
                  }}
                >
                  <Cloud className="h-4 w-4" />
                  Connect Google Drive
                </Button>
              </div>
            )}
          </div>
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

     {showRestoreModal && createPortal(
       <AnimatePresence>
         <motion.div 
           initial={{ opacity: 0 }}
           animate={{ opacity: 1 }}
           exit={{ opacity: 0 }}
           className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-background/80 backdrop-blur-md text-foreground"
         >
           <motion.div 
             initial={{ scale: 0.9, opacity: 0, y: 20 }}
             animate={{ scale: 1, opacity: 1, y: 0 }}
             exit={{ scale: 0.9, opacity: 0, y: 20 }}
             className="w-full max-w-md bg-card border border-border shadow-2xl rounded-[2.5rem] overflow-hidden"
           >
             <div className="p-8 space-y-6 max-h-[85vh] flex flex-col">
               <div className="flex items-center justify-between border-b border-border/20 pb-4">
                 <div className="flex items-center gap-3">
                   <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
                     <DownloadCloud className="h-5 w-5" />
                   </div>
                   <div>
                     <h3 className="text-lg font-black tracking-tight text-left">Select Backup</h3>
                     <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest text-left">Choose restore point</p>
                   </div>
                 </div>
                 <Button 
                   variant="ghost" 
                   size="icon" 
                   onClick={() => setShowRestoreModal(false)}
                   className="rounded-full"
                 >
                   <X className="h-5 w-5" />
                 </Button>
               </div>

               <div className="flex-1 overflow-y-auto min-h-[200px] max-h-[40vh] pr-1 custom-scrollbar">
                 {isLoadingBackups ? (
                   <div className="flex flex-col items-center justify-center py-12 gap-3">
                     <RefreshCw className="h-8 w-8 text-primary animate-spin" />
                     <p className="text-xs text-muted-foreground font-medium">Fetching backup list...</p>
                   </div>
                 ) : backups.length === 0 ? (
                   <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
                     <CloudOff className="h-8 w-8 text-muted-foreground/60" />
                     <div className="space-y-1">
                       <p className="text-sm font-bold">No backups found</p>
                       <p className="text-xs text-muted-foreground">No backups found in "Buxman_Backups" folder.</p>
                     </div>
                     <Button
                       variant="outline"
                       size="sm"
                       className="rounded-xl mt-2 h-9 text-xs font-bold gap-1.5"
                       onClick={async () => {
                         setIsLoadingBackups(true);
                         try {
                           const list = await googleDriveService.listBackups();
                           setBackups(list || []);
                         } finally {
                           setIsLoadingBackups(false);
                         }
                       }}
                     >
                       <RefreshCw className="h-3.5 w-3.5" /> Retry Search
                     </Button>
                   </div>
                 ) : (
                   <div className="space-y-2">
                     {backups.map((file) => (
                       <div 
                         key={file.id} 
                         className="flex items-center justify-between p-4 rounded-2xl bg-white dark:bg-card/50 border border-border/50 hover:border-primary/40 hover:bg-surface-2 transition-all group"
                       >
                         <div className="flex items-start gap-3 min-w-0 flex-1 pr-2 text-left">
                           <div className="h-9 w-9 rounded-lg bg-muted/40 flex items-center justify-center text-muted-foreground group-hover:text-primary transition-colors shrink-0">
                             <Database className="h-4.5 w-4.5" />
                           </div>
                           <div className="min-w-0">
                             <p className="text-xs font-bold truncate text-foreground">
                               {formatDate(file.modifiedTime)}
                             </p>
                             <p className="text-[9px] text-muted-foreground truncate font-mono mt-0.5">
                               {file.name} • {formatSize(Number(file.size))}
                             </p>
                           </div>
                         </div>

                         <Button
                           size="sm"
                           className="rounded-xl bg-primary hover:bg-primary/90 text-white text-[10px] font-bold uppercase tracking-widest shrink-0"
                           onClick={() => {
                             setShowRestoreModal(false);
                             googleDriveService.restore(file.id);
                           }}
                         >
                           Restore
                         </Button>
                       </div>
                     ))}
                   </div>
                 )}
               </div>

               <div className="border-t border-border/20 pt-4 flex gap-3">
                 <Button
                   variant="outline"
                   className="w-full h-12 rounded-2xl font-bold"
                   onClick={() => setShowRestoreModal(false)}
                 >
                   Cancel
                 </Button>
               </div>
             </div>
           </motion.div>
         </motion.div>
       </AnimatePresence>,
       document.body
     )}
    </div>
  );
}
