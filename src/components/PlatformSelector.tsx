import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  Linkedin,
  Twitter,
  MessageCircle,
  Megaphone,
} from 'lucide-react';

interface PlatformSelectorProps {
  selected: string[];
  onChange: (platforms: string[]) => void;
  maxPlatforms?: number | null;
}

const PLATFORMS = [
  { id: 'twitter', name: 'Twitter (X)', icon: Twitter },
  { id: 'linkedin', name: 'LinkedIn', icon: Linkedin },
  { id: 'threads', name: 'Threads', icon: MessageCircle },
  { id: 'reddit', name: 'Reddit', icon: Megaphone },
];

export const PlatformSelector = ({ selected, onChange, maxPlatforms }: PlatformSelectorProps) => {
  const togglePlatform = (platformId: string) => {
    if (selected.includes(platformId)) {
      onChange(selected.filter(p => p !== platformId));
    } else {
      if (maxPlatforms && selected.length >= maxPlatforms) {
        return;
      }
      onChange([...selected, platformId]);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium">Select Platforms</label>
        <span className="text-xs text-muted-foreground">
          {selected.length}/{PLATFORMS.length} selected
        </span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {PLATFORMS.map((platform) => {
          const Icon = platform.icon;
          const isSelected = selected.includes(platform.id);
          const isDisabled = !isSelected && maxPlatforms !== null && selected.length >= maxPlatforms;

          return (
            <Button
              key={platform.id}
              type="button"
              variant={isSelected ? 'default' : 'outline'}
              className={cn(
                'h-auto py-4 flex flex-col gap-2',
                isDisabled && 'opacity-50 cursor-not-allowed'
              )}
              onClick={() => !isDisabled && togglePlatform(platform.id)}
              disabled={isDisabled}
            >
              <Icon className="h-5 w-5" />
              <span className="text-xs">{platform.name}</span>
            </Button>
          );
        })}
      </div>
    </div>
  );
};
