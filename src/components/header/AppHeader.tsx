import { Button } from '@/components/ui/button';
import { Calendar, Bell, Sun, Cloud, Trash2, LogOut, CloudRain, Snowflake, CloudLightning, CloudDrizzle, CloudFog, CloudSun, Loader2, Droplets, Wind, Download } from 'lucide-react';
import { Reminder } from '@/types';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useWeather } from '@/hooks/useWeather';
import { usePwaInstall } from '@/hooks/usePwaInstall';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { parseDbDate } from '@/lib/utils';
import { toast } from 'sonner';

interface AppHeaderProps {
  selectedAssetName?: string;
  selectedAssetColor?: string;
  upcomingReminders: (Reminder & { assetName: string; assetColor?: string })[];
  onToggleCalendar: () => void;
  showCalendar: boolean;
  onClearChat: () => void;
  onSignOut?: () => void;
  userEmail?: string;
}

export function AppHeader({
  selectedAssetName,
  selectedAssetColor,
  upcomingReminders,
  onToggleCalendar,
  showCalendar,
  onClearChat,
  onSignOut,
  userEmail,
}: AppHeaderProps) {
  const { weather, loading: weatherLoading, isCached, updatedAt } = useWeather();
  const { canInstall, installApp } = usePwaInstall();
  const { isOnline } = useNetworkStatus();

  const WeatherIcon = ({ iconName }: { iconName: string }) => {
    const iconClass = "w-4 h-4";
    switch (iconName) {
      case 'sun': return <Sun className={`${iconClass} text-accent`} />;
      case 'cloud-sun': return <CloudSun className={`${iconClass} text-accent`} />;
      case 'cloud-fog': return <CloudFog className={`${iconClass} text-muted-foreground`} />;
      case 'cloud-drizzle': return <CloudDrizzle className={`${iconClass} text-muted-foreground`} />;
      case 'cloud-rain': return <CloudRain className={`${iconClass} text-muted-foreground`} />;
      case 'snowflake': return <Snowflake className={`${iconClass} text-blue-400`} />;
      case 'cloud-lightning': return <CloudLightning className={`${iconClass} text-yellow-400`} />;
      default: return <Cloud className={`${iconClass} text-muted-foreground`} />;
    }
  };

  return (
    <header className="h-14 border-b border-border bg-card/50 backdrop-blur-sm flex items-center justify-between px-2 sm:px-4 lg:px-6">
      {/* Left: Context Info */}
      <div className="flex items-center gap-2 ml-12 lg:ml-0 min-w-0 flex-1">
        {selectedAssetName ? (
          <div className="flex items-center gap-1.5 min-w-0">
            {selectedAssetColor && (
              <span
                className="h-2.5 w-2.5 flex-shrink-0 rounded-full"
                style={{ backgroundColor: selectedAssetColor }}
              />
            )}
            <span className="text-xs text-muted-foreground hidden sm:inline">Συνομιλία για:</span>
            <span className="font-medium text-sm text-foreground truncate">{selectedAssetName}</span>
          </div>
        ) : (
          <span className="font-medium text-sm text-foreground">Γενικός Βοηθός</span>
        )}
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-0.5 sm:gap-1.5 flex-shrink-0">
        {canInstall && (
          <Button
            variant="ghost"
            size="icon"
            className="w-8 h-8 sm:w-9 sm:h-9"
            onClick={async () => {
              const accepted = await installApp();
              if (!accepted) {
                toast.message('Μπορείς να εγκαταστήσεις την εφαρμογή αργότερα από το μενού του browser.');
              }
            }}
            title="Εγκατάσταση εφαρμογής"
            aria-label="Εγκατάσταση εφαρμογής"
          >
            <Download className="w-4 h-4 sm:w-5 sm:h-5" />
          </Button>
        )}

        {/* Weather Widget */}
        <Popover>
          <PopoverTrigger asChild>
            <div className="flex items-center gap-1 px-2 py-1.5 bg-secondary rounded-full text-xs sm:text-sm cursor-pointer hover:bg-secondary/80 transition-colors">
              {weatherLoading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />
              ) : weather ? (
                <>
                  <WeatherIcon iconName={weather.icon} />
                  <span className="font-medium">{weather.temperature}°</span>
                </>
              ) : (
                <>
                  <Cloud className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-muted-foreground">--°</span>
                </>
              )}
            </div>
          </PopoverTrigger>
          <PopoverContent className="w-56" align="end">
            {weather ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <WeatherIcon iconName={weather.icon} />
                  <span className="font-medium">{weather.description}</span>
                </div>
                <div className="text-sm text-muted-foreground space-y-1">
                  <div className="flex items-center gap-2">
                    <Sun className="w-3 h-3" />
                    <span>Θερμοκρασία: {weather.temperature}°C</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Droplets className="w-3 h-3" />
                    <span>Υγρασία: {weather.humidity}%</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Wind className="w-3 h-3" />
                    <span>Άνεμος: {weather.windSpeed} km/h</span>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground border-t border-border pt-2">
                  {!isOnline || isCached
                    ? 'Εμφανίζονται τα τελευταία αποθηκευμένα δεδομένα καιρού.'
                    : 'Τα δεδομένα καιρού είναι ενημερωμένα.'}
                  {updatedAt ? (
                    <div className="mt-1">
                      Ενημέρωση: {new Date(updatedAt).toLocaleString('el-GR')}
                    </div>
                  ) : null}
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Δεν ήταν δυνατή η φόρτωση καιρού</p>
            )}
          </PopoverContent>
        </Popover>

        {/* Reminders */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="relative w-8 h-8 sm:w-9 sm:h-9">
              <Bell className="w-4 h-4 sm:w-5 sm:h-5" />
              {upcomingReminders.length > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-accent text-accent-foreground text-xs rounded-full flex items-center justify-center font-medium">
                  {upcomingReminders.length}
                </span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80" align="end">
            <div className="space-y-2">
              <h4 className="font-medium text-sm">Επερχόμενες Υπενθυμίσεις</h4>
              {upcomingReminders.length === 0 ? (
                <p className="text-sm text-muted-foreground">Δεν υπάρχουν υπενθυμίσεις</p>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {upcomingReminders.slice(0, 5).map((reminder) => (
                    <div
                      key={reminder.id}
                      className="p-2 rounded-lg bg-muted/50 text-sm"
                    >
                      <div className="font-medium">{reminder.title}</div>
                      <div className="text-xs text-muted-foreground flex justify-between gap-3">
                        <span className="inline-flex min-w-0 items-center gap-1.5">
                          {reminder.assetColor && (
                            <span
                              className="h-2 w-2 flex-shrink-0 rounded-full"
                              style={{ backgroundColor: reminder.assetColor }}
                            />
                          )}
                          <span className="truncate">{reminder.assetName}</span>
                        </span>
                        <span>
                          {parseDbDate(reminder.due_date).toLocaleDateString('el-GR')}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </PopoverContent>
        </Popover>

        {/* Calendar Toggle */}
        <Button
          variant={showCalendar ? 'default' : 'ghost'}
          size="icon"
          onClick={onToggleCalendar}
          className="w-8 h-8 sm:w-9 sm:h-9"
        >
          <Calendar className="w-4 h-4 sm:w-5 sm:h-5" />
        </Button>

        {/* Clear Chat - hidden on very small screens */}
        <Button variant="ghost" size="icon" onClick={onClearChat} className="hidden sm:flex w-8 h-8 sm:w-9 sm:h-9">
          <Trash2 className="w-4 h-4 sm:w-5 sm:h-5" />
        </Button>

        {/* Sign Out */}
        {onSignOut && (
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="w-8 h-8 sm:w-9 sm:h-9">
                <LogOut className="w-4 h-4 sm:w-5 sm:h-5" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64" align="end">
              <div className="space-y-3">
                {userEmail && (
                  <p className="text-sm text-muted-foreground truncate">{userEmail}</p>
                )}
                <Button 
                  variant="destructive" 
                  size="sm" 
                  className="w-full"
                  onClick={onSignOut}
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Αποσύνδεση
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        )}
      </div>
    </header>
  );
}