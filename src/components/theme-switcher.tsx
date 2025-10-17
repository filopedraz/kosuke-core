'use client';

import { Monitor, Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // useEffect only runs on the client, so now we can safely show the UI
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="flex gap-2">
        <div className="h-10 w-24 bg-muted rounded-md animate-pulse" />
        <div className="h-10 w-24 bg-muted rounded-md animate-pulse" />
        <div className="h-10 w-24 bg-muted rounded-md animate-pulse" />
      </div>
    );
  }

  const themes = [
    {
      name: 'Light',
      value: 'light',
      icon: Sun,
    },
    {
      name: 'Dark',
      value: 'dark',
      icon: Moon,
    },
    {
      name: 'System',
      value: 'system',
      icon: Monitor,
    },
  ];

  return (
    <div className="flex gap-2">
      {themes.map(themeOption => {
        const Icon = themeOption.icon;
        const isActive = theme === themeOption.value;

        return (
          <Button
            key={themeOption.value}
            variant={isActive ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTheme(themeOption.value)}
            className="flex items-center gap-2"
          >
            <Icon className="h-4 w-4" />
            {themeOption.name}
          </Button>
        );
      })}
    </div>
  );
}
