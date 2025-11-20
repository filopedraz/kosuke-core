'use client';

import { AuroraText } from '@/components/ui/aurora-text';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  AnimatePresence,
  MotionValue,
  motion,
  useMotionValue,
  useSpring,
  useTransform,
} from 'framer-motion';
import { Sparkles } from 'lucide-react';
import Link from 'next/link';
import { useRef, useState } from 'react';

const MotionCard = motion(Card);

// --- Cosmic Components ---

const Star = ({
  delay,
  duration,
  x,
  y,
}: {
  delay: number;
  duration: number;
  x: number;
  y: number;
}) => (
  <motion.div
    initial={{ opacity: 0, scale: 0 }}
    animate={{
      opacity: [0, 1, 1, 0],
      scale: [0, 1.5, 1.5, 0],
    }}
    transition={{
      duration: duration,
      repeat: Infinity,
      delay: delay,
      ease: 'easeInOut',
      times: [0, 0.1, 0.8, 1],
    }}
    className="absolute rounded-full bg-white shadow-[0_0_4px_2px_rgba(255,255,255,0.4)]"
    style={{
      left: `${x}%`,
      top: `${y}%`,
      width: Math.random() * 3 + 1 + 'px',
      height: Math.random() * 3 + 1 + 'px',
    }}
  />
);

const ShootingStar = () => {
  const startX = Math.random() * 100;
  const startY = Math.random() * 50;

  return (
    <motion.div
      initial={{ x: `${startX}vw`, y: `${startY}vh`, opacity: 0, scale: 0.5 }}
      animate={{
        x: [`${startX}vw`, `${startX - 20}vw`],
        y: [`${startY}vh`, `${startY + 20}vh`],
        opacity: [0, 1, 0],
        scale: [0.5, 1, 0.5],
      }}
      transition={{
        duration: 1 + Math.random(),
        repeat: Infinity,
        repeatDelay: Math.random() * 5 + 2,
        ease: 'linear',
      }}
      className="absolute w-[100px] h-[2px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent rotate-45 z-0 pointer-events-none"
    />
  );
};

const SpaceBackground = ({
  mouseX,
  mouseY,
}: {
  mouseX: MotionValue<number>;
  mouseY: MotionValue<number>;
}) => {
  const stars = Array.from({ length: 50 }).map((_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    delay: Math.random() * 5,
    duration: Math.random() * 3 + 2,
  }));

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 1 }}
      className="absolute inset-0 z-0 overflow-hidden pointer-events-none"
    >
      {/* Deep Space Gradient */}
      <div className="absolute inset-0 bg-radial-gradient from-indigo-950 via-slate-950 to-black opacity-90" />

      {/* Nebula / Aurora Effect */}
      <motion.div
        className="absolute -inset-[50%] opacity-30 mix-blend-screen filter blur-[100px]"
        animate={{
          background: [
            'radial-gradient(circle at 50% 50%, #4f46e5, transparent 70%)',
            'radial-gradient(circle at 20% 80%, #06b6d4, transparent 70%)',
            'radial-gradient(circle at 80% 20%, #ec4899, transparent 70%)',
            'radial-gradient(circle at 50% 50%, #4f46e5, transparent 70%)',
          ],
        }}
        transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
      />

      {/* Stars */}
      {stars.map(star => (
        <Star key={star.id} {...star} />
      ))}

      {/* Shooting Stars */}
      {Array.from({ length: 3 }).map((_, i) => (
        <ShootingStar key={i} />
      ))}

      {/* Mouse Follower Spotlight */}
      <motion.div
        className="absolute w-[600px] h-[600px] bg-radial-gradient from-emerald-500/20 to-transparent rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 pointer-events-none mix-blend-screen"
        style={{ left: mouseX, top: mouseY }}
      />
    </motion.div>
  );
};

export function HeroSection() {
  const [switches, setSwitches] = useState({
    good: false,
    cheap: false,
    fast: false,
  });
  const [isKosukeMode, setIsKosukeMode] = useState(false);

  // Mouse tracking for effects
  const containerRef = useRef<HTMLElement>(null);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const smoothMouseX = useSpring(mouseX, { stiffness: 50, damping: 20 });
  const smoothMouseY = useSpring(mouseY, { stiffness: 50, damping: 20 });

  // Card 3D Tilt Effect
  const cardX = useTransform(smoothMouseX, value => {
    if (!containerRef.current) return 0;
    const rect = containerRef.current.getBoundingClientRect();
    const centerX = rect.width / 2;
    // Return value between -15 and 15 degrees based on mouse position relative to center
    return (value - rect.left - centerX) / 25;
  });

  const cardY = useTransform(smoothMouseY, value => {
    if (!containerRef.current) return 0;
    const rect = containerRef.current.getBoundingClientRect();
    const centerY = rect.height / 2;
    return (value - rect.top - centerY) / -25;
  });

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    // Track relative to the viewport/container for the spotlight
    mouseX.set(e.clientX - rect.left);
    mouseY.set(e.clientY - rect.top);
  };

  const toggleSwitch = (key: 'good' | 'cheap' | 'fast') => {
    if (isKosukeMode) return;

    setSwitches(prev => {
      const newState = { ...prev, [key]: !prev[key] };

      // If we're turning a switch ON
      if (newState[key]) {
        if (newState.good && newState.cheap && newState.fast) {
          // If all three would be true, turn off one of the others
          // Cycle: Good -> turn off Fast, Cheap -> turn off Good, Fast -> turn off Cheap
          if (key === 'good') return { ...newState, fast: false };
          if (key === 'cheap') return { ...newState, good: false };
          if (key === 'fast') return { ...newState, cheap: false };
        }
      }
      return newState;
    });
  };

  const toggleKosukeMode = () => {
    if (isKosukeMode) {
      setSwitches({ good: false, cheap: false, fast: false });
      setIsKosukeMode(false);
    } else {
      setSwitches({ good: true, cheap: true, fast: true });
      setIsKosukeMode(true);
    }
  };

  return (
    <section
      ref={containerRef}
      onMouseMove={handleMouseMove}
      className="relative pt-12 sm:pt-14 md:pt-16 lg:pt-20 pb-12 sm:pb-14 md:pb-20 lg:pb-32 overflow-hidden transition-colors duration-1000"
    >
      <AnimatePresence>
        {isKosukeMode && <SpaceBackground mouseX={smoothMouseX} mouseY={smoothMouseY} />}
      </AnimatePresence>

      <div className="container mx-auto px-8 sm:px-12 md:px-6 max-w-6xl relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left Column Content */}
          <motion.div
            className="space-y-4 md:space-y-5 lg:space-y-6 text-left"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            {/* Badge */}
            <motion.div
              className="flex justify-start"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <a href="/solutions/startup-program" className="inline-block">
                <Badge
                  variant="outline"
                  className="mb-0 sm:mb-0 px-2 sm:px-3 py-1 text-xs bg-emerald-500/10 border-emerald-500/20 text-emerald-600 hover:bg-emerald-500/30 hover:border-emerald-500/50 transition-all duration-300 cursor-pointer relative overflow-hidden"
                >
                  {/* Shine effect */}
                  <motion.div
                    className="absolute inset-0 -top-1 -bottom-1 bg-linear-to-r from-transparent via-white/20 to-transparent"
                    initial={{ x: '-100%' }}
                    animate={{ x: '200%' }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      repeatDelay: 3,
                      ease: 'easeInOut',
                    }}
                  />
                  <Sparkles className="w-3 h-3 mr-1" />
                  🚀 Startup Program: Ship Your MVP for Free
                </Badge>
              </a>
            </motion.div>

            <h1 className="text-3xl sm:text-[2rem] md:text-4xl lg:text-6xl font-bold leading-tight sm:leading-tight tracking-tight">
              Your technical{' '}
              <AuroraText colors={['#10B981', '#22c55e', '#34D399', '#059669']}>
                co-founder
              </AuroraText>
              <br />
              for the 0 to 1.
            </h1>

            <p className="text-base md:text-lg lg:text-xl text-muted-foreground font-sans leading-relaxed max-w-2xl">
              Traditional vibe-coding platforms leave founders with broken demos, not real products.
              We deliver high-quality, market-ready software so you can launch your startup with
              confidence.
            </p>

            {/* CTA Button */}
            <motion.div
              className="flex justify-start pt-2 sm:pt-3"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.6 }}
            >
              <Button
                asChild
                size="lg"
                className="w-full sm:w-auto px-6 sm:px-8 py-3 bg-primary hover:bg-primary/90"
              >
                <Link
                  href="https://links.kosuke.ai/contact"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Contact Us
                </Link>
              </Button>
            </motion.div>
          </motion.div>

          {/* Right Column Content - Meme Card */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="flex justify-center lg:justify-end perspective-1000"
            style={{ perspective: 1000 }}
          >
            <MotionCard
              style={
                isKosukeMode
                  ? {
                      rotateX: cardY,
                      rotateY: cardX,
                      transformStyle: 'preserve-3d',
                    }
                  : {}
              }
              className="w-full max-w-md border-border/50 shadow-xl bg-card/50 backdrop-blur-sm relative overflow-hidden"
              initial="idle"
              animate={isKosukeMode ? 'active' : 'idle'}
              variants={{
                idle: {
                  scale: 1,
                  y: 0,
                  borderColor: 'hsl(var(--border))',
                  boxShadow: '0 10px 30px -10px rgba(0,0,0,0.1)',
                },
                active: {
                  scale: 1.05,
                  y: -10,
                  borderColor: '#10B981',
                  boxShadow: [
                    '0 0 20px rgba(16, 185, 129, 0.3)',
                    '0 0 60px rgba(16, 185, 129, 0.6)',
                    '0 0 20px rgba(16, 185, 129, 0.3)',
                  ],
                },
              }}
              transition={{
                scale: { type: 'spring', stiffness: 300, damping: 20 },
                y: { type: 'spring', stiffness: 300, damping: 20 },
                borderColor: { duration: 0.3 },
                boxShadow: { duration: 2, repeat: Infinity, ease: 'easeInOut' },
              }}
            >
              {/* Inner Glow Effect */}
              <AnimatePresence>
                {isKosukeMode && (
                  <motion.div
                    className="absolute inset-0 bg-emerald-500/5 pointer-events-none z-0"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.5 }}
                  />
                )}
              </AnimatePresence>

              <CardContent className="pt-6 space-y-6 relative z-10">
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-2 rounded-lg hover:bg-accent/50 transition-colors">
                    <Label
                      htmlFor="switch-good"
                      className="text-lg font-medium cursor-pointer flex-1"
                    >
                      Good
                    </Label>
                    <Switch
                      id="switch-good"
                      checked={switches.good}
                      onCheckedChange={() => toggleSwitch('good')}
                      disabled={isKosukeMode}
                    />
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-lg hover:bg-accent/50 transition-colors">
                    <Label
                      htmlFor="switch-cheap"
                      className="text-lg font-medium cursor-pointer flex-1"
                    >
                      Cheap
                    </Label>
                    <Switch
                      id="switch-cheap"
                      checked={switches.cheap}
                      onCheckedChange={() => toggleSwitch('cheap')}
                      disabled={isKosukeMode}
                    />
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-lg hover:bg-accent/50 transition-colors">
                    <Label
                      htmlFor="switch-fast"
                      className="text-lg font-medium cursor-pointer flex-1"
                    >
                      Fast
                    </Label>
                    <Switch
                      id="switch-fast"
                      checked={switches.fast}
                      onCheckedChange={() => toggleSwitch('fast')}
                      disabled={isKosukeMode}
                    />
                  </div>
                </div>

                <Button
                  onClick={toggleKosukeMode}
                  className="w-full h-12 text-lg font-semibold bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 transition-all duration-300 shadow-lg shadow-emerald-500/20"
                >
                  {isKosukeMode ? (
                    <motion.div
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="flex items-center gap-2"
                    >
                      <Sparkles className="w-5 h-5 animate-pulse text-white" />
                      <span>Kosuke Mode Active</span>
                      <Sparkles className="w-5 h-5 animate-pulse text-white" />
                    </motion.div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-white" />
                      <span>Activate Kosuke Mode</span>
                    </div>
                  )}
                </Button>
              </CardContent>
            </MotionCard>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
