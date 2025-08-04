'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

interface DevLoadingAnimationProps {
  className?: string;
  progress?: number;
}

const CODE_LINES = [
  'npm install dependencies...',
  'Building components...',
  'Compiling TypeScript...',
  'Bundling assets...',
  'Starting dev server...',
  'Hot reload ready ⚡',
];

const TERMINAL_CHARS = ['▂', '▃', '▄', '▅', '▆', '▇', '█'];

export function DevLoadingAnimation({ className, progress = 0 }: DevLoadingAnimationProps) {
  const [currentLineIndex, setCurrentLineIndex] = useState(0);
  const [visibleChars, setVisibleChars] = useState(0);
  const [terminalBars, setTerminalBars] = useState<number[]>([]);
  const [dots, setDots] = useState('');

  // Typewriter effect for current line
  useEffect(() => {
    const currentLine = CODE_LINES[currentLineIndex];
    if (visibleChars < currentLine.length) {
      const timeout = setTimeout(() => {
        setVisibleChars(prev => prev + 1);
      }, 50 + Math.random() * 50); // Variable typing speed
      return () => clearTimeout(timeout);
    } else {
      // Move to next line after a pause
      const timeout = setTimeout(() => {
        if (currentLineIndex < CODE_LINES.length - 1) {
          setCurrentLineIndex(prev => prev + 1);
          setVisibleChars(0);
        } else {
          // Reset cycle
          setCurrentLineIndex(0);
          setVisibleChars(0);
        }
      }, 800);
      return () => clearTimeout(timeout);
    }
  }, [currentLineIndex, visibleChars]);

  // Animated terminal bars
  useEffect(() => {
    const interval = setInterval(() => {
      setTerminalBars(prev => 
        Array.from({ length: 12 }, () => Math.floor(Math.random() * TERMINAL_CHARS.length))
      );
    }, 150);
    return () => clearInterval(interval);
  }, []);

  // Animated dots for loading
  useEffect(() => {
    const interval = setInterval(() => {
      setDots(prev => {
        if (prev.length >= 3) return '';
        return prev + '.';
      });
    }, 500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className={cn("flex flex-col items-center justify-center space-y-6 p-8", className)}>
      {/* ASCII Art Logo */}
      <div className="font-mono text-sm text-muted-foreground/70 text-center leading-tight">
        <pre className="select-none">
{`   ⚡ KOSUKE DEV
  ┌─────────────┐
  │ ████▓▓▓░░░░ │
  │ Building... │
  └─────────────┘`}
        </pre>
      </div>

      {/* Terminal-style animation bars */}
      <div className="flex items-end space-x-1 h-8">
        {terminalBars.map((barHeight, index) => (
          <div
            key={index}
            className="text-primary font-mono text-lg transition-all duration-150 ease-in-out"
            style={{
              transform: `translateY(${(TERMINAL_CHARS.length - barHeight - 1) * 2}px)`,
            }}
          >
            {TERMINAL_CHARS[barHeight]}
          </div>
        ))}
      </div>

      {/* Code compilation simulation */}
      <div className="w-full max-w-md space-y-2">
        <div className="bg-muted/30 rounded-lg p-4 font-mono text-xs">
          <div className="text-green-500 mb-2">$ kosuke build --dev</div>
          
          {/* Previous completed lines */}
          {CODE_LINES.slice(0, currentLineIndex).map((line, index) => (
            <div key={index} className="text-muted-foreground opacity-60 flex items-center">
              <span className="text-green-500 mr-2">✓</span>
              {line}
            </div>
          ))}
          
          {/* Current typing line */}
          <div className="text-foreground flex items-center">
            <span className="text-yellow-500 mr-2 animate-pulse">⟳</span>
            {CODE_LINES[currentLineIndex]?.slice(0, visibleChars)}
            <span className="animate-pulse">│</span>
          </div>
        </div>

        {/* Progress bar with glow effect */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Building project{dots}</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-green-500 rounded-full transition-all duration-300 ease-out relative"
              style={{ width: `${Math.max(progress, 5)}%` }}
            >
              <div className="absolute inset-0 bg-white/20 animate-pulse rounded-full" />
            </div>
          </div>
        </div>
      </div>

      {/* Code symbols floating animation */}
      <div className="relative w-full h-16 overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center space-x-8">
          {['</', '{', '}', '()', '=>', '&&'].map((symbol, index) => (
            <div
              key={index}
              className="font-mono text-2xl text-muted-foreground/30 animate-bounce"
              style={{
                animationDelay: `${index * 0.2}s`,
                animationDuration: '2s',
              }}
            >
              {symbol}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}