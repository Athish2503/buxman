import { Toaster } from "@/components/ui/toaster";
import { Capacitor } from "@capacitor/core";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Loader2 } from "lucide-react";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import { storageEngine } from "./lib/storage-engine";

import { SplashScreen } from "./components/splash-screen";
import { useTransactionListener } from "./hooks/useTransactionListener";
import { FinancialPermissionGuidance } from "./components/financial-permission-guidance";
import { permissions } from "./lib/permissions";

const queryClient = new QueryClient();

const App = () => {
  const [isReady, setIsReady] = useState(false);
  const [showSplash, setShowSplash] = useState(() => {
    // Only show splash if it hasn't been shown in this session
    if (typeof window !== 'undefined') {
      return !sessionStorage.getItem('splashShown');
    }
    return true;
  });

  useTransactionListener();

  const [permissionsNeeded, setPermissionsNeeded] = useState(false);

  useEffect(() => {
    storageEngine.init().then(async () => {
      setIsReady(true);
      // Check for financial permissions on startup (mobile only)
      if (Capacitor.isNativePlatform()) {
        const status = await permissions.checkStatus();
        if (!status.financialNotifications || !status.overlay) {
          setPermissionsNeeded(true);
        }
      }
    });
  }, []);

  if (showSplash) {
    return (
      <SplashScreen 
        onComplete={() => {
          sessionStorage.setItem('splashShown', 'true');
          setShowSplash(false);
        }} 
      />
    );
  }

  if (!isReady) {
    return null; // Storage not ready but splash handled the initial view
  }

  if (permissionsNeeded) {
    return <FinancialPermissionGuidance onComplete={() => setPermissionsNeeded(false)} />;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner
          position="top-center"
          toastOptions={{
            classNames: {
              toast: 'glass border border-border/50 shadow-lg text-foreground',
              success: '!text-success',
              error: '!text-destructive',
            }
          }}
        />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
