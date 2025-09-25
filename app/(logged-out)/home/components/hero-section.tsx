'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { Code2, Sparkles } from 'lucide-react';

interface HeroSectionProps {
  onApplyClick: () => void;
}

export function HeroSection({ onApplyClick }: HeroSectionProps) {
  return (
    <section className="pt-12 sm:pt-20 pb-16 sm:pb-32 px-4 sm:px-6">
      <div className="container mx-auto max-w-6xl">
        {/* Main headline */}
        <motion.div
          className="text-center mb-8 sm:mb-16"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <Badge
              variant="outline"
              className="mb-4 sm:mb-6 px-2 sm:px-3 py-1 text-xs font-mono bg-emerald-500/10 border-emerald-500/20 text-emerald-600 hover:bg-emerald-500/20 hover:border-emerald-500/40 transition-all duration-300 cursor-default relative overflow-hidden"
            >
              {/* Shine effect */}
              <motion.div
                className="absolute inset-0 -top-1 -bottom-1 bg-gradient-to-r from-transparent via-white/20 to-transparent"
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
              Private Alpha
            </Badge>
          </motion.div>

          <h1 className="text-3xl sm:text-5xl lg:text-7xl font-bold mb-4 sm:mb-6 leading-tight tracking-tight px-2">
            Start with AI. <br />
            Finish with Engineers.
            <br />
          </h1>

          <p className="text-base sm:text-lg lg:text-xl text-muted-foreground mb-6 sm:mb-8 max-w-2xl mx-auto font-sans px-2">
            Turn ideas into real functional products, using AI for speed and Developers for quality.
            No more endless prompt fixing, buggy code or unfinished projects.
          </p>
        </motion.div>

        {/* CTA Buttons */}
        <motion.div
          className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-center px-2"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
        >
          <Button
            size="lg"
            variant="outline"
            className="w-full sm:w-auto px-6 sm:px-8 py-3 font-mono"
            onClick={onApplyClick}
          >
            <Code2 className="mr-2 h-4 w-4" />
            Apply for Early Access
          </Button>
        </motion.div>
      </div>
    </section>
  );
}
