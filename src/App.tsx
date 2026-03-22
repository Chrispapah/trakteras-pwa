import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider, onlineManager } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { toast } from "sonner";

import { OfflineBanner } from "@/components/pwa/OfflineBanner";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";

import Index from "./pages/Index";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import { ProtectedRoute } from "./components/ProtectedRoute";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      gcTime: 1000 * 60 * 60 * 24,
      retry: (failureCount) => navigator.onLine && failureCount < 2,
      networkMode: "offlineFirst",
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60 * 5,
    },
  },
});

function AppShell() {
  const { isOnline } = useNetworkStatus();
  const hasMountedRef = useRef(false);

  useEffect(() => {
    return onlineManager.setEventListener((setOnline) => {
      const updateOnlineState = () => setOnline(navigator.onLine);

      window.addEventListener("online", updateOnlineState);
      window.addEventListener("offline", updateOnlineState);
      updateOnlineState();

      return () => {
        window.removeEventListener("online", updateOnlineState);
        window.removeEventListener("offline", updateOnlineState);
      };
    });
  }, []);

  useEffect(() => {
    const handleNeedRefresh = () => {
      toast.info("Υπάρχει νέα έκδοση της εφαρμογής.", {
        action: {
          label: "Ανανέωση",
          onClick: () => window.location.reload(),
        },
        duration: 120000,
      });
    };

    const handleOfflineReady = () => {
      toast.success("Η εφαρμογή είναι έτοιμη για χρήση εκτός σύνδεσης.");
    };

    window.addEventListener("trakteras:pwa-update", handleNeedRefresh);
    window.addEventListener("trakteras:pwa-offline-ready", handleOfflineReady);

    return () => {
      window.removeEventListener("trakteras:pwa-update", handleNeedRefresh);
      window.removeEventListener("trakteras:pwa-offline-ready", handleOfflineReady);
    };
  }, []);

  useEffect(() => {
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      return;
    }

    toast[isOnline ? "success" : "warning"](
      isOnline
        ? "Η σύνδεση επανήλθε. Τα δεδομένα θα συγχρονιστούν ξανά."
        : "Η σύνδεση χάθηκε. Θα εμφανίζονται τα τελευταία αποθηκευμένα δεδομένα."
    );
  }, [isOnline]);

  return (
    <>
      <BrowserRouter>
        <Routes>
          <Route path="/auth" element={<Auth />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Index />
              </ProtectedRoute>
            }
          />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
      <OfflineBanner isOnline={isOnline} />
    </>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AppShell />
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
