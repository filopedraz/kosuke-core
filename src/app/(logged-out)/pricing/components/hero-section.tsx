'use client';

import { AuroraText } from '@/components/ui/aurora-text';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';

export function HeroSection() {
  return (
    <section className="pt-12 sm:pt-20 pb-12 sm:pb-20 md:pb-24">
      <div className="container mx-auto px-8 sm:px-12 md:px-6">
        <div className="max-w-6xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="space-y-4 sm:space-y-6"
          >
            <Badge
              variant="outline"
              className="px-2 sm:px-3 py-1 text-xs  bg-emerald-500/10 border-emerald-500/20 text-emerald-600 hover:bg-emerald-500/20 hover:border-emerald-500/40 transition-all duration-300 cursor-default relative overflow-hidden"
            >
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
              Honest Comparison
            </Badge>

            <h1 className="text-3xl sm:text-[2rem] md:text-4xl lg:text-6xl font-bold leading-tight sm:leading-tight tracking-tight">
              Compare Your{' '}
              <AuroraText colors={['#10B981', '#22c55e', '#34D399', '#059669']}>Options</AuroraText>
            </h1>

            <p className="text-base md:text-lg lg:text-xl text-muted-foreground max-w-3xl mx-auto font-sans leading-relaxed">
              Stop choosing between speed and quality. See how Kosuke delivers both without the
              typical trade-offs.
            </p>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
