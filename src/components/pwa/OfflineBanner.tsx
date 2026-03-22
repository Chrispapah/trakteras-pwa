import { WifiOff } from "lucide-react";

import { cn } from "@/lib/utils";

interface OfflineBannerProps {
  isOnline: boolean;
  className?: string;
}

export function OfflineBanner({ isOnline, className }: OfflineBannerProps) {
  if (isOnline) return null;

  return (
    <div
      className={cn(
        "fixed inset-x-3 bottom-3 z-50 rounded-xl border border-border bg-card/95 px-4 py-3 shadow-card backdrop-blur-sm",
        className
      )}
      role="status"
      aria-live="polite"
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 rounded-full bg-destructive/10 p-2 text-destructive">
          <WifiOff className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground">Είσαι εκτός σύνδεσης</p>
          <p className="text-sm text-muted-foreground">
            Η εφαρμογή παραμένει ανοιχτή με τα τελευταία αποθηκευμένα δεδομένα, αλλά οι ενέργειες που
            χρειάζονται Supabase δεν θα εκτελούνται μέχρι να επανέλθει το δίκτυο.
          </p>
        </div>
      </div>
    </div>
  );
}
