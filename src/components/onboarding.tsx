import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Camera, Bell, Mic, Fingerprint, CheckCircle2, ArrowRight, ShieldCheck, 
  Lock, Sparkles, Coins, Info, Smartphone, Eye, Volume2, Landmark, Check
} from 'lucide-react';
import { permissions } from '@/lib/permissions';
import { settingsService } from '@/lib/settings';
import { metaService } from '@/lib/recurring';
import { biometrics } from '@/lib/biometrics';
import { haptics } from '@/lib/haptics';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { LocalNotifications } from '@capacitor/local-notifications';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import confetti from 'canvas-confetti';

interface OnboardingProps {
  onComplete: () => void;
}

const STEPS = [
  { id: 'welcome', label: 'Welcome' },
  { id: 'core_perms', label: 'System Access' },
  { id: 'auto_perms', label: 'Autopilot' },
  { id: 'voice_perm', label: 'Smart Dictation' },
  { id: 'preferences', label: 'Settings' },
  { id: 'complete', label: 'Complete' }
];

const CURRENCIES = [
  { code: 'INR', symbol: '₹', label: 'Indian Rupee' },
  { code: 'USD', symbol: '$', label: 'US Dollar' },
  { code: 'EUR', symbol: '€', label: 'Euro' },
  { code: 'GBP', symbol: '£', label: 'British Pound' },
  { code: 'CAD', symbol: '$', label: 'Canadian Dollar' },
  { code: 'AUD', symbol: '$', label: 'Australian Dollar' },
];

export function Onboarding({ onComplete }: OnboardingProps) {
  const [currentStepIdx, setCurrentStepIdx] = useState(0);
  const [loading, setLoading] = useState(false);
  
  // Real platform statuses
  const [realStatus, setRealStatus] = useState({
    camera: false,
    notifications: false,
    listener: false,
    overlay: false,
    microphone: false
  });

  // Track previous status to detect transitions and trigger haptics
  const prevStatusRef = useRef({
    camera: false,
    notifications: false,
    listener: false,
    overlay: false,
    microphone: false
  });

  // Web Mock Statuses (to allow full testing in the web browser/dashboard preview)
  const [webMockStatus, setWebMockStatus] = useState({
    camera: false,
    notifications: false,
    listener: false,
    overlay: false,
    microphone: false
  });

  // Settings State
  const [selectedCurrency, setSelectedCurrency] = useState('INR');
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);

  // Load initial settings and check permissions
  const queryAllPermissions = async () => {
    try {
      const status = await permissions.checkStatus();
      const nextStatus = {
        camera: status.camera,
        notifications: status.notifications,
        listener: status.financialNotifications,
        overlay: status.overlay,
        microphone: status.microphone
      };

      // Check if any permission was newly granted
      let newlyGranted = false;
      const prev = prevStatusRef.current;
      if (nextStatus.camera && !prev.camera) newlyGranted = true;
      if (nextStatus.notifications && !prev.notifications) newlyGranted = true;
      if (nextStatus.listener && !prev.listener) newlyGranted = true;
      if (nextStatus.overlay && !prev.overlay) newlyGranted = true;
      if (nextStatus.microphone && !prev.microphone) newlyGranted = true;

      if (newlyGranted) {
        haptics.success();
        // Play success audio chime if available
        import('@/lib/audio').then(({ audio }) => {
          audio.success();
        }).catch(() => {});
      }

      // Update refs and state
      prevStatusRef.current = nextStatus;
      setRealStatus(nextStatus);
    } catch (e) {
      console.error('Failed to query permission statuses', e);
    }
  };

  useEffect(() => {
    // 1. Initial permission check
    queryAllPermissions();

    // 2. Poll permission statuses every 1 second to catch real-time system changes
    const pollInterval = setInterval(() => {
      queryAllPermissions();
    }, 1000);

    // 3. Listen to app state change (e.g., returning from settings)
    let appStateListener: any = null;
    if (Capacitor.isNativePlatform()) {
      appStateListener = App.addListener('appStateChange', ({ isActive }) => {
        if (isActive) {
          queryAllPermissions();
        }
      });
    }

    // 4. Biometrics availability check
    biometrics.isAvailable().then(available => {
      setBiometricAvailable(available);
    });

    // 5. Default currency from settings
    const settings = settingsService.get();
    if (settings.currency) {
      setSelectedCurrency(settings.currency);
    }

    return () => {
      clearInterval(pollInterval);
      if (appStateListener) {
        appStateListener.then((l: any) => l.remove());
      }
    };
  }, []);

  // Determine actual status based on platform
  const isNative = Capacitor.isNativePlatform();
  const isCameraGranted = isNative ? realStatus.camera : webMockStatus.camera;
  const isNotificationsGranted = isNative ? realStatus.notifications : webMockStatus.notifications;
  const isListenerGranted = isNative ? realStatus.listener : webMockStatus.listener;
  const isOverlayGranted = isNative ? realStatus.overlay : webMockStatus.overlay;
  const isMicrophoneGranted = isNative ? realStatus.microphone : webMockStatus.microphone;

  // Haptic feedbacks wrapper
  const playTick = () => haptics.selection();
  const playSuccess = () => haptics.success();
  const playWarning = () => haptics.medium();

  // Step 2 Core Permissions trigger
  const requestCamera = async () => {
    playTick();
    if (isNative) {
      try {
        await permissions.requestAll(); // requests camera & photos inside permissions.ts
        await queryAllPermissions();
      } catch (err) {
        toast.error('Could not grant camera access');
      }
    } else {
      setWebMockStatus(prev => ({ ...prev, camera: true }));
      toast.success('Camera permission simulated!');
      playSuccess();
    }
  };

  const requestNotifications = async () => {
    playTick();
    if (isNative) {
      try {
        await LocalNotifications.requestPermissions();
        await queryAllPermissions();
      } catch (err) {
        toast.error('Could not grant notification access');
      }
    } else {
      setWebMockStatus(prev => ({ ...prev, notifications: true }));
      toast.success('Notifications permission simulated!');
      playSuccess();
    }
  };

  // Step 3 Android settings triggers
  const requestNotificationListener = async () => {
    playTick();
    if (isNative) {
      try {
        await permissions.requestNotificationListener();
      } catch (err) {
        toast.error('Could not open listener settings');
      }
    } else {
      setWebMockStatus(prev => ({ ...prev, listener: true }));
      toast.success('Notification Listener simulated!');
      playSuccess();
    }
  };

  const requestOverlayPermission = async () => {
    playTick();
    if (isNative) {
      try {
        await permissions.requestOverlayPermission();
      } catch (err) {
        toast.error('Could not open overlay settings');
      }
    } else {
      setWebMockStatus(prev => ({ ...prev, overlay: true }));
      toast.success('Overlay permission simulated!');
      playSuccess();
    }
  };

  // Step 4 Microphone trigger
  const requestMicrophone = async () => {
    playTick();
    if (isNative) {
      try {
        await permissions.requestMicrophonePermission();
        await queryAllPermissions();
      } catch (err) {
        toast.error('Could not grant microphone access');
      }
    } else {
      setWebMockStatus(prev => ({ ...prev, microphone: true }));
      toast.success('Microphone permission simulated!');
      playSuccess();
    }
  };

  // Toggle biometric setting
  const toggleBiometricLock = async () => {
    playTick();
    if (!biometricEnabled) {
      const success = await biometrics.authenticate();
      if (success) {
        setBiometricEnabled(true);
        toast.success('Biometrics verified & enabled!');
        playSuccess();
      } else {
        toast.error('Authentication failed');
        playWarning();
      }
    } else {
      setBiometricEnabled(false);
      toast.success('Biometric lock disabled');
    }
  };

  // Navigation Logic
  const handleNext = () => {
    playTick();
    
    // Check if next step is autopilot but on iOS -> Skip directly to voice
    let nextIdx = currentStepIdx + 1;
    if (nextIdx === 2 && isNative && Capacitor.getPlatform() === 'ios') {
      nextIdx = 3;
    }

    if (nextIdx < STEPS.length) {
      setCurrentStepIdx(nextIdx);
      if (STEPS[nextIdx].id === 'complete') {
        // Trigger confetti on the complete page
        setTimeout(() => {
          confetti({
            particleCount: 120,
            spread: 80,
            origin: { y: 0.65 },
            colors: ['#8b5cf6', '#10b981', '#f59e0b', '#ec4899']
          });
        }, 150);
      }
    }
  };

  const handleBack = () => {
    playTick();
    let prevIdx = currentStepIdx - 1;
    
    // Skip Android settings step backward if on iOS native
    if (prevIdx === 2 && isNative && Capacitor.getPlatform() === 'ios') {
      prevIdx = 1;
    }

    if (prevIdx >= 0) {
      setCurrentStepIdx(prevIdx);
    }
  };

  const handleFinish = () => {
    setLoading(true);
    playSuccess();
    
    // Save currency to settings
    const currentSettings = settingsService.get();
    settingsService.save({
      ...currentSettings,
      currency: selectedCurrency,
      biometricLock: biometricEnabled
    });

    // Mark onboarded
    metaService.markOnboarded();
    
    setTimeout(() => {
      setLoading(false);
      onComplete();
    }, 600);
  };

  const currentStep = STEPS[currentStepIdx];

  // Helper to check if step requirements are met to enable next button
  const isStepValid = () => {
    if (currentStep.id === 'core_perms') {
      // Core permissions recommended but can proceed if they explicitly click next
      return true;
    }
    return true;
  };

  return (
    <div 
      className="fixed inset-0 z-[9999] flex flex-col justify-between overflow-hidden bg-background bg-aurora"
      style={{ background: 'hsl(225 22% 5%)' }}
    >
      {/* Background Animated Orb */}
      <div 
        className="absolute top-0 right-0 w-[80vw] h-[80vw] rounded-full blur-[100px] pointer-events-none opacity-40 transition-all duration-700"
        style={{
          background: currentStep.id === 'welcome' 
            ? 'radial-gradient(circle, hsl(258 88% 66% / 0.25) 0%, transparent 70%)'
            : currentStep.id === 'core_perms'
            ? 'radial-gradient(circle, hsl(200 90% 50% / 0.25) 0%, transparent 70%)'
            : currentStep.id === 'auto_perms'
            ? 'radial-gradient(circle, hsl(162 72% 45% / 0.25) 0%, transparent 70%)'
            : currentStep.id === 'voice_perm'
            ? 'radial-gradient(circle, hsl(15 90% 60% / 0.25) 0%, transparent 70%)'
            : 'radial-gradient(circle, hsl(280 85% 65% / 0.25) 0%, transparent 70%)',
          transform: 'translate(20%, -20%)'
        }}
      />

      {/* Progress Indicator Header */}
      <div className="safe-area-top w-full px-6 pt-12 z-10 flex flex-col gap-3">
        <div className="flex justify-between items-center text-[10px] uppercase font-black tracking-widest text-muted-foreground">
          <span>Onboarding Progress</span>
          <span>Step {currentStepIdx + 1} of {STEPS.length}</span>
        </div>
        <div className="flex gap-1.5 h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
          {STEPS.map((step, idx) => {
            const isCompleted = idx < currentStepIdx;
            const isActive = idx === currentStepIdx;
            return (
              <div 
                key={step.id} 
                className={cn(
                  "h-full rounded-full transition-all duration-500 flex-1",
                  isCompleted ? "bg-emerald-500" : isActive ? "bg-primary animate-pulse-glow" : "bg-white/10"
                )}
              />
            );
          })}
        </div>
      </div>

      {/* Main Slide Section */}
      <div className="flex-1 flex flex-col justify-center px-6 overflow-y-auto py-8 z-10 no-scrollbar">
        <div className="w-full max-w-md mx-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep.id}
              initial={{ opacity: 0, x: 25, scale: 0.98 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: -25, scale: 0.98 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-col gap-6"
            >
              
              {/* Render step welcome */}
              {currentStep.id === 'welcome' && (
                <div className="space-y-6 text-center">
                  <div className="relative mx-auto w-24 h-24 flex items-center justify-center">
                    <motion.div 
                      animate={{ scale: [1, 1.1, 1], rotate: [0, 180, 360] }}
                      transition={{ duration: 15, repeat: Infinity, ease: 'linear' }}
                      className="absolute inset-0 bg-primary/20 blur-xl rounded-full" 
                    />
                    <div className="relative h-20 w-20 rounded-[28px] bg-gradient-brand flex items-center justify-center shadow-glow">
                      <img src="/logo.png" alt="Buxman" className="h-12 w-12 object-contain animate-float-y" />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h1 className="text-[34px] font-display font-black leading-tight tracking-tight">
                      Welcome to <span className="text-gradient">Buxman</span>
                    </h1>
                    <p className="text-sm text-muted-foreground leading-relaxed px-4">
                      The ultra-premium, local-first finance manager that respects your privacy. No cloud. No accounts. 100% Offline.
                    </p>
                  </div>

                  {/* Feature highlights */}
                  <div className="grid gap-3.5 text-left pt-4">
                    <div className="p-4 rounded-2xl glass-card flex gap-4 items-start border-white/5">
                      <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                        <ShieldCheck className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-foreground">Secure Privacy First</h3>
                        <p className="text-xs text-muted-foreground">Every dollar, category, and receipt stays encrypted locally on your system.</p>
                      </div>
                    </div>

                    <div className="p-4 rounded-2xl glass-card flex gap-4 items-start border-white/5">
                      <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0">
                        <Sparkles className="h-5 w-5 text-emerald-500" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-foreground">Banking Autopilot</h3>
                        <p className="text-xs text-muted-foreground">Android smart parser logs expenditures directly from banking alerts & SMS updates.</p>
                      </div>
                    </div>

                    <div className="p-4 rounded-2xl glass-card flex gap-4 items-start border-white/5">
                      <div className="h-10 w-10 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0">
                        <Volume2 className="h-5 w-5 text-amber-500" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-foreground">Smart Speech Input</h3>
                        <p className="text-xs text-muted-foreground">Dictate transactions directly with natural voice recognition support.</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Render step Core system permissions */}
              {currentStep.id === 'core_perms' && (
                <div className="space-y-6">
                  <div className="space-y-2 text-center">
                    <div className="h-14 w-14 rounded-2xl bg-sky-500/10 flex items-center justify-center mx-auto text-sky-400 border border-sky-500/20">
                      <Smartphone className="h-7 w-7" />
                    </div>
                    <h2 className="text-2xl font-display font-black">Enable System Features</h2>
                    <p className="text-sm text-muted-foreground leading-relaxed px-4">
                      Allow access to these core system features to unlock receipt imports and notifications.
                    </p>
                  </div>

                  <div className="space-y-3.5">
                    {/* Camera */}
                    <div className={cn(
                      "p-4 rounded-2xl border transition-all duration-300 flex items-center justify-between text-left",
                      isCameraGranted ? "bg-emerald-500/10 border-emerald-500/30" : "bg-card/50 border-white/5"
                    )}>
                      <div className="flex gap-4 items-center">
                        <div className={cn(
                          "h-11 w-11 rounded-xl flex items-center justify-center shrink-0",
                          isCameraGranted ? "bg-emerald-500/20 text-emerald-500" : "bg-white/5 text-muted-foreground"
                        )}>
                          <Camera className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-sm font-bold">Camera & Photos</p>
                          <p className="text-[11px] text-muted-foreground leading-normal max-w-[200px]">Capture paper receipts & attach bill documents.</p>
                        </div>
                      </div>
                      <button 
                        onClick={requestCamera}
                        disabled={isCameraGranted}
                        className={cn(
                          "px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all press-scale shrink-0",
                          isCameraGranted 
                            ? "bg-emerald-500/20 text-emerald-500 border border-emerald-500/20 cursor-default" 
                            : "bg-white/10 hover:bg-white/15 text-white"
                        )}
                      >
                        {isCameraGranted ? "Allowed" : "Allow"}
                      </button>
                    </div>

                    {/* Notifications */}
                    <div className={cn(
                      "p-4 rounded-2xl border transition-all duration-300 flex items-center justify-between text-left",
                      isNotificationsGranted ? "bg-emerald-500/10 border-emerald-500/30" : "bg-card/50 border-white/5"
                    )}>
                      <div className="flex gap-4 items-center">
                        <div className={cn(
                          "h-11 w-11 rounded-xl flex items-center justify-center shrink-0",
                          isNotificationsGranted ? "bg-emerald-500/20 text-emerald-500" : "bg-white/5 text-muted-foreground"
                        )}>
                          <Bell className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-sm font-bold">Reminders & Alerts</p>
                          <p className="text-[11px] text-muted-foreground leading-normal max-w-[200px]">Receive notifications for budgets and claim limits.</p>
                        </div>
                      </div>
                      <button 
                        onClick={requestNotifications}
                        disabled={isNotificationsGranted}
                        className={cn(
                          "px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all press-scale shrink-0",
                          isNotificationsGranted 
                            ? "bg-emerald-500/20 text-emerald-500 border border-emerald-500/20 cursor-default" 
                            : "bg-white/10 hover:bg-white/15 text-white"
                        )}
                      >
                        {isNotificationsGranted ? "Allowed" : "Allow"}
                      </button>
                    </div>
                  </div>

                  <div className="p-3 bg-white/5 rounded-2xl flex items-center gap-3 border border-white/5">
                    <Info className="h-4 w-4 text-sky-400 shrink-0" />
                    <p className="text-[10px] text-muted-foreground leading-normal">
                      We highly recommend enabling these settings. You can still skip them and configure them in settings later.
                    </p>
                  </div>
                </div>
              )}

              {/* Render step Autopilot (Android specific) */}
              {currentStep.id === 'auto_perms' && (
                <div className="space-y-6">
                  <div className="space-y-2 text-center">
                    <div className="h-14 w-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center mx-auto text-emerald-400 border border-emerald-500/20">
                      <Landmark className="h-7 w-7 animate-pulse-glow" />
                    </div>
                    <h2 className="text-2xl font-display font-black">Enable Auto Expense Logging</h2>
                    <p className="text-sm text-muted-foreground leading-relaxed px-4">
                      {isNative ? 'Android specific:' : '[Simulated Android Panel]'} Allow Buxman to read alerts from banking and transaction apps to log entries automatically.
                    </p>
                  </div>

                  <div className="space-y-3.5">
                    {/* Notification listener */}
                    <div className={cn(
                      "p-4 rounded-2xl border transition-all duration-300 flex items-center justify-between text-left",
                      isListenerGranted ? "bg-emerald-500/10 border-emerald-500/30" : "bg-card/50 border-white/5"
                    )}>
                      <div className="flex gap-4 items-center">
                        <div className={cn(
                          "h-11 w-11 rounded-xl flex items-center justify-center shrink-0",
                          isListenerGranted ? "bg-emerald-500/20 text-emerald-500" : "bg-white/5 text-muted-foreground"
                        )}>
                          <Eye className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-sm font-bold">Transaction Reader</p>
                          <p className="text-[11px] text-muted-foreground leading-normal max-w-[200px]">Read banking notifications and SMS in real-time.</p>
                        </div>
                      </div>
                      <button 
                        onClick={requestNotificationListener}
                        disabled={isListenerGranted}
                        className={cn(
                          "px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all press-scale shrink-0",
                          isListenerGranted 
                            ? "bg-emerald-500/20 text-emerald-500 border border-emerald-500/20 cursor-default" 
                            : "bg-white/10 hover:bg-white/15 text-white"
                        )}
                      >
                        {isListenerGranted ? "Active" : "Enable"}
                      </button>
                    </div>

                    {/* Overlay popup */}
                    <div className={cn(
                      "p-4 rounded-2xl border transition-all duration-300 flex items-center justify-between text-left",
                      isOverlayGranted ? "bg-emerald-500/10 border-emerald-500/30" : "bg-card/50 border-white/5"
                    )}>
                      <div className="flex gap-4 items-center">
                        <div className={cn(
                          "h-11 w-11 rounded-xl flex items-center justify-center shrink-0",
                          isOverlayGranted ? "bg-emerald-500/20 text-emerald-500" : "bg-white/5 text-muted-foreground"
                        )}>
                          <Sparkles className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-sm font-bold">Quick Log Popup</p>
                          <p className="text-[11px] text-muted-foreground leading-normal max-w-[200px]">Display a log assistant popup immediately when spending is detected.</p>
                        </div>
                      </div>
                      <button 
                        onClick={requestOverlayPermission}
                        disabled={isOverlayGranted}
                        className={cn(
                          "px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all press-scale shrink-0",
                          isOverlayGranted 
                            ? "bg-emerald-500/20 text-emerald-500 border border-emerald-500/20 cursor-default" 
                            : "bg-white/10 hover:bg-white/15 text-white"
                        )}
                      >
                        {isOverlayGranted ? "Active" : "Enable"}
                      </button>
                    </div>
                  </div>

                  {!isNative && (
                    <div className="px-3.5 py-2.5 bg-yellow-500/10 text-yellow-400 text-[10px] rounded-xl border border-yellow-500/20 text-center">
                      Running in Browser: Native permissions are mocked for testing.
                    </div>
                  )}

                  {isNative && (
                    <div className="p-3 bg-white/5 rounded-2xl text-[10px] text-muted-foreground leading-normal text-center animate-pulse">
                      Waiting for permissions. Once configured in settings, return to Buxman to automatically update.
                    </div>
                  )}
                </div>
              )}

              {/* Render step Smart Dictation */}
              {currentStep.id === 'voice_perm' && (
                <div className="space-y-6">
                  <div className="space-y-2 text-center">
                    <div className="h-14 w-14 rounded-2xl bg-amber-500/10 flex items-center justify-center mx-auto text-amber-400 border border-amber-500/20">
                      <Mic className="h-7 w-7" />
                    </div>
                    <h2 className="text-2xl font-display font-black">Enable Smart Dictation</h2>
                    <p className="text-sm text-muted-foreground leading-relaxed px-4">
                      Capture expenses instantly by talking to your app. Example: "Logged 15 dollars for coffee".
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div className={cn(
                      "p-5 rounded-3xl border transition-all duration-500 text-center flex flex-col items-center gap-4 cursor-pointer",
                      isMicrophoneGranted 
                        ? "bg-emerald-500/10 border-emerald-500/30" 
                        : "bg-card/50 border-white/5 hover:border-white/10 active:scale-[0.98] card-interactive"
                    )}
                      onClick={!isMicrophoneGranted ? requestMicrophone : undefined}
                    >
                      <div className={cn(
                        "h-16 w-16 rounded-2xl flex items-center justify-center shrink-0 transition-all duration-300",
                        isMicrophoneGranted ? "bg-emerald-500/20 text-emerald-500 scale-105" : "bg-white/5 text-muted-foreground"
                      )}>
                        <Mic className="h-8 w-8" />
                      </div>
                      <div className="space-y-1">
                        <p className="font-bold text-base">Speech-to-Text Access</p>
                        <p className="text-xs text-muted-foreground max-w-[240px] mx-auto">
                          Requests microphone access to process voice recording inputs locally.
                        </p>
                      </div>

                      {isMicrophoneGranted ? (
                        <div className="flex items-center gap-1.5 text-xs text-emerald-500 font-bold bg-emerald-500/15 py-1.5 px-3 rounded-full">
                          <Check className="h-3.5 w-3.5" />
                          <span>Voice Commands Enabled</span>
                        </div>
                      ) : (
                        <button className="h-11 px-6 rounded-xl bg-primary text-white font-bold text-xs uppercase tracking-wider shadow-glow">
                          Grant Microphone Access
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Render step Personalization (Currency, Biometrics) */}
              {currentStep.id === 'preferences' && (
                <div className="space-y-6">
                  <div className="space-y-2 text-center">
                    <div className="h-14 w-14 rounded-2xl bg-violet-500/10 flex items-center justify-center mx-auto text-violet-400 border border-violet-500/20">
                      <Coins className="h-7 w-7" />
                    </div>
                    <h2 className="text-2xl font-display font-black">Configure Preferences</h2>
                    <p className="text-sm text-muted-foreground leading-relaxed px-4">
                      Set up your default operating currency and enable hardware security features.
                    </p>
                  </div>

                  <div className="space-y-4">
                    {/* Currency selector */}
                    <div className="space-y-2 text-left">
                      <label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Base Currency</label>
                      <div className="grid grid-cols-3 gap-2">
                        {CURRENCIES.map(curr => {
                          const isSelected = selectedCurrency === curr.code;
                          return (
                            <button
                              key={curr.code}
                              onClick={() => { playTick(); setSelectedCurrency(curr.code); }}
                              className={cn(
                                "p-3.5 rounded-2xl border flex flex-col items-center justify-center gap-1 text-center transition-all duration-300",
                                isSelected 
                                  ? "bg-primary/15 border-primary shadow-glow text-white" 
                                  : "bg-card/40 border-white/5 hover:border-white/10 text-muted-foreground hover:text-foreground"
                              )}
                            >
                              <span className="text-lg font-black font-display leading-none">{curr.symbol}</span>
                              <span className="text-[10px] font-black uppercase tracking-wider">{curr.code}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Biometric lock if available */}
                    {biometricAvailable && (
                      <div className="space-y-2 text-left pt-2">
                        <label className="text-xs font-black uppercase tracking-widest text-muted-foreground">App Protection</label>
                        <div 
                          onClick={toggleBiometricLock}
                          className={cn(
                            "p-4 rounded-2xl border transition-all duration-300 flex items-center justify-between cursor-pointer card-interactive",
                            biometricEnabled ? "bg-primary/10 border-primary/45" : "bg-card/50 border-white/5"
                          )}
                        >
                          <div className="flex gap-3 items-center">
                            <div className={cn(
                              "h-10 w-10 rounded-xl flex items-center justify-center shrink-0",
                              biometricEnabled ? "bg-primary/20 text-primary" : "bg-white/5 text-muted-foreground"
                            )}>
                              <Fingerprint className="h-5 w-5" />
                            </div>
                            <div>
                              <p className="text-sm font-bold">Biometric Screen Lock</p>
                              <p className="text-[10px] text-muted-foreground">Lock Buxman on startup.</p>
                            </div>
                          </div>
                          {/* Toggle Switch */}
                          <div className={cn(
                            "w-12 h-6.5 rounded-full p-0.5 transition-all duration-300",
                            biometricEnabled ? "bg-primary" : "bg-white/10"
                          )}>
                            <motion.div 
                              layout 
                              className="h-5.5 w-5.5 rounded-full bg-white shadow-md"
                              animate={{ x: biometricEnabled ? 20 : 0 }}
                              transition={{ type: "spring", stiffness: 500, damping: 30 }}
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Render step success finish */}
              {currentStep.id === 'complete' && (
                <div className="space-y-6 text-center">
                  <div className="relative mx-auto w-24 h-24 flex items-center justify-center">
                    <motion.div 
                      animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }}
                      transition={{ duration: 3, repeat: Infinity }}
                      className="absolute inset-0 bg-emerald-500/25 blur-2xl rounded-full" 
                    />
                    <div className="relative h-20 w-20 rounded-[28px] bg-gradient-brand flex items-center justify-center shadow-glow animate-pulse-success">
                      <CheckCircle2 className="h-10 w-10 text-white animate-scale-bounce" strokeWidth={2.5} />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h2 className="text-3xl font-display font-black leading-tight tracking-tight">
                      Onboarding Complete!
                    </h2>
                    <p className="text-sm text-muted-foreground leading-relaxed px-4">
                      Your local workspace has been successfully personalized. You're ready to log expenses, check budget goals, and view analytics.
                    </p>
                  </div>

                  {/* Summary of configurations */}
                  <div className="p-4 rounded-3xl glass-card border-white/5 text-left max-w-sm mx-auto space-y-3">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-muted-foreground">Currency</span>
                      <span className="font-bold text-foreground">{selectedCurrency} ({CURRENCIES.find(c=>c.code===selectedCurrency)?.symbol})</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-muted-foreground">Biometrics Lock</span>
                      <span className={cn("font-bold", biometricEnabled ? "text-emerald-500" : "text-muted-foreground")}>
                        {biometricEnabled ? "Enabled" : "Disabled"}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-muted-foreground">System Permissions</span>
                      <span className="text-emerald-500 font-bold">Configured</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-muted-foreground">Privacy Protection</span>
                      <span className="text-emerald-500 font-bold flex items-center gap-1">
                        <Lock className="h-3 w-3" />
                        <span>100% Local</span>
                      </span>
                    </div>
                  </div>
                </div>
              )}

            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Navigation CTA Bar */}
      <div className="px-6 pb-12 pt-4 bg-gradient-to-t from-background/95 via-background/80 to-transparent z-10 flex flex-col gap-4">
        {currentStep.id === 'complete' ? (
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={handleFinish}
            disabled={loading}
            className="relative w-full h-[58px] rounded-2xl font-display font-black text-base text-white flex items-center justify-center gap-2 overflow-hidden shadow-glow"
            style={{ background: 'linear-gradient(135deg, hsl(145 65% 48%), hsl(162 72% 45%))' }}
          >
            {loading ? (
              <div className="w-5 h-5 rounded-full border-2 border-white/30 border-t-white animate-spin shrink-0" />
            ) : (
              <>
                <span>Enter Dashboard</span>
                <ArrowRight className="h-5 w-5" />
              </>
            )}
            
            {/* Shimmer sweep */}
            <motion.div
              className="absolute inset-0 w-1/3 bg-gradient-to-r from-transparent via-white/20 to-transparent"
              animate={{ left: ['-40%', '140%'] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: 'linear', repeatDelay: 1 }}
            />
          </motion.button>
        ) : (
          <div className="flex gap-3">
            {currentStepIdx > 0 && (
              <button
                onClick={handleBack}
                className="h-[58px] px-6 rounded-2xl border border-white/10 hover:bg-white/5 font-display font-bold text-sm text-muted-foreground hover:text-foreground transition-all duration-200 press-scale"
              >
                Back
              </button>
            )}
            
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={handleNext}
              disabled={!isStepValid()}
              className="flex-1 h-[58px] rounded-2xl font-display font-black text-base text-white flex items-center justify-center gap-2 overflow-hidden bg-gradient-brand shadow-glow disabled:opacity-50"
            >
              <span>Continue</span>
              <ArrowRight className="h-5 w-5" />

              {/* Shimmer sweep */}
              <motion.div
                className="absolute inset-0 w-1/3 bg-gradient-to-r from-transparent via-white/15 to-transparent"
                animate={{ left: ['-40%', '140%'] }}
                transition={{ duration: 3, repeat: Infinity, ease: 'linear', repeatDelay: 2 }}
              />
            </motion.button>
          </div>
        )}

        {/* Small skip description if not completed */}
        {currentStep.id !== 'complete' && currentStep.id !== 'welcome' && (
          <button 
            onClick={handleNext}
            className="text-[11px] text-muted-foreground/60 hover:text-primary transition-all duration-200 text-center hover:underline"
          >
            Skip this step for now
          </button>
        )}
      </div>
    </div>
  );
}
