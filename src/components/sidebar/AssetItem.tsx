import { Asset } from '@/types';
import { cn } from '@/lib/utils';
import { ChevronRight } from 'lucide-react';
import { resolveAssetColor } from '@/lib/assetColors';

interface AssetItemProps {
  asset: Asset;
  isSelected: boolean;
  onClick: () => void;
}

export function AssetItem({ asset, isSelected, onClick }: AssetItemProps) {
  const assetColor = resolveAssetColor(asset);

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all duration-200',
        isSelected
          ? 'bg-sidebar-accent text-sidebar-accent-foreground shadow-soft'
          : 'hover:bg-sidebar-accent/50 text-sidebar-foreground'
      )}
    >
      <span
        className="h-2.5 w-2.5 flex-shrink-0 rounded-full shadow-sm"
        style={{ backgroundColor: assetColor }}
      />
      <span className="text-xl flex-shrink-0">{asset.icon}</span>
      <div className="flex-1 min-w-0">
        <div className="font-medium text-sm truncate">{asset.name}</div>
        {asset.description && (
          <div className="text-xs text-muted-foreground truncate">
            {asset.description}
          </div>
        )}
      </div>
      <ChevronRight
        className={cn(
          'w-4 h-4 text-muted-foreground transition-transform',
          isSelected && 'rotate-90'
        )}
      />
    </button>
  );
}