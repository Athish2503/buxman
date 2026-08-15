import { Toaster } from "@/components/ui/toaster";
import { Capacitor } from "@capacitor/core";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Index from "./pages/Index";
import Diagnostics from "./pages/Diagnostics";
import NotFound from "./pages/NotFound";
import { storageEngine } from "./lib/storage-engine";

import { SplashScreen } from "./components/splash-screen";
import { useTransactionListener } from "./hooks/useTransactionListener";
import { FinancialPermissionGuidance } from "./components/financial-permission-guidance";
import { permissions } from "./lib/permissions";
import { ThemeEngine } from "./components/ThemeEngine";
import { walletService } from "./lib/modules-storage";
import { Onboarding } from "./components/onboarding";
import { metaService } from "./lib/recurring";

import { googleDriveService } from "./lib/google-drive";

const queryClient = new QueryClient();

const App = () => {
  const [isReady, setIsReady]   = useState(false);
  const [showSplash, setShowSplash] = useState(true); // always show splash on mount
  const [onboardingDone, setOnboardingDone] = useState(true);
  const [permissionsNeeded, setPermissionsNeeded] = useState(false);

  useTransactionListener();

  useEffect(() => {
    // Init storage in parallel with splash
    storageEngine.init().then(async () => {
      // Intercept and handle Google Drive redirect token callback
      googleDriveService.handleRedirectCallback();

      // Sync wallet reminders
      walletService.syncReminders();

      const onboarded = metaService.get().onboardingDone;
      setOnboardingDone(onboarded);
      setIsReady(true);
      
      if (onboarded && Capacitor.isNativePlatform()) {
        const status = await permissions.checkStatus();
        if (!status.financialNotifications || !status.overlay) {
          setPermissionsNeeded(true);
        }
      }
    });
  }, []);

  // Splash screen — always shown on fresh mount, disappears after ~2s
  if (showSplash) {
    return (
      <SplashScreen
        onComplete={() => setShowSplash(false)}
      />
    );
  }

  // By the time splash completes (~2.5s), storage should be ready.
  // If not (very slow device), show a minimal spinner instead of blank.
  if (!isReady) {
    return (
      <div
        className="fixed inset-0 flex items-center justify-center"
        style={{ background: 'hsl(225 22% 5%)' }}
      >
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 rounded-2xl bg-gradient-brand flex items-center justify-center animate-pulse-glow">
            <img src="/logo.png" alt="Buxman" className="h-6 w-6 object-contain" />
          </div>
          <div className="w-32 h-[2px] bg-white/6 rounded-full overflow-hidden relative">
            <div
              className="absolute top-0 bottom-0 w-1/2 bg-gradient-brand animate-shimmer"
              style={{ backgroundSize: '200% 100%' }}
            />
          </div>
        </div>
      </div>
    );
  }

  // Show revamped onboarding if not complete
  if (!onboardingDone) {
    return <Onboarding onComplete={() => setOnboardingDone(true)} />;
  }

  if (permissionsNeeded) {
    return <FinancialPermissionGuidance onComplete={() => setPermissionsNeeded(false)} />;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <ThemeEngine />
        <Toaster />
        <Sonner
          position="top-center"
          toastOptions={{
            classNames: {
              toast:   'glass border border-border/50 shadow-lg text-foreground',
              success: '!text-success',
              error:   '!text-destructive',
            }
          }}
        />
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/diagnostics" element={<Diagnostics />} />
            <Route path="/dashboard" element={<Navigate to="/" replace />} />
            <Route path="/expenses" element={<Navigate to="/" replace />} />
            <Route path="/settings" element={<Navigate to="/" replace />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
