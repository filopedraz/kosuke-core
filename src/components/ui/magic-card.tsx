'use client';

import { motion, useMotionTemplate, useMotionValue } from 'motion/react';
import React, { useCallback, useEffect, useState } from 'react';

import { cn } from '@/lib/utils';

interface MagicCardProps {
  children?: React.ReactNode;
  className?: string;
  gradientSize?: number;
  gradientColor?: string;
  gradientOpacity?: number;
  gradientFrom?: string;
  gradientTo?: string;
}

export function MagicCard({
  children,
  className,
  gradientSize = 200,
  gradientColor = '#262626',
  gradientOpacity = 0.8,
  gradientFrom = '#9E7AFF',
  gradientTo = '#FE8BBB',
}: MagicCardProps) {
  const [isMounted, setIsMounted] = useState(false);
  const mouseX = useMotionValue(-gradientSize);
  const mouseY = useMotionValue(-gradientSize);
  const reset = useCallback(() => {
    mouseX.set(-gradientSize);
    mouseY.set(-gradientSize);
  }, [gradientSize, mouseX, mouseY]);

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      mouseX.set(e.clientX - rect.left);
      mouseY.set(e.clientY - rect.top);
    },
    [mouseX, mouseY]
  );

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    reset();
  }, [reset]);

  useEffect(() => {
    const handleGlobalPointerOut = (e: PointerEvent) => {
      if (!e.relatedTarget) {
        reset();
      }
    };

    const handleVisibility = () => {
      if (document.visibilityState !== 'visible') {
        reset();
      }
    };

    window.addEventListener('pointerout', handleGlobalPointerOut);
    window.addEventListener('blur', reset);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      window.removeEventListener('pointerout', handleGlobalPointerOut);
      window.removeEventListener('blur', reset);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [reset]);

  const backgroundGradient = useMotionTemplate`
    radial-gradient(${gradientSize}px circle at ${mouseX}px ${mouseY}px,
    ${gradientFrom},
    ${gradientTo},
    var(--border) 100%
    )
  `;

  const overlayGradient = useMotionTemplate`
    radial-gradient(${gradientSize}px circle at ${mouseX}px ${mouseY}px, ${gradientColor}, transparent 100%)
  `;

  return (
    <div
      className={cn('group relative rounded-[inherit]', className)}
      onPointerMove={handlePointerMove}
      onPointerLeave={reset}
      onPointerEnter={reset}
    >
      {isMounted ? (
        <motion.div
          className="bg-border pointer-events-none absolute inset-0 rounded-[inherit] duration-300 group-hover:opacity-100"
          style={{
            background: backgroundGradient,
          }}
        />
      ) : (
        <div className="bg-border pointer-events-none absolute inset-0 rounded-[inherit] duration-300 group-hover:opacity-100" />
      )}
      <div className="bg-background absolute inset-px rounded-[inherit]" />
      {isMounted ? (
        <motion.div
          className="pointer-events-none absolute inset-px rounded-[inherit] opacity-0 transition-opacity duration-300 group-hover:opacity-100"
          style={{
            background: overlayGradient,
            opacity: gradientOpacity,
          }}
        />
      ) : (
        <div className="pointer-events-none absolute inset-px rounded-[inherit] opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      )}
      <div className="relative">{children}</div>
    </div>
  );
}
