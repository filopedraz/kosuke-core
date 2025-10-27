'use client';

import { AuroraText } from '@/components/ui/aurora-text';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { Calendar, Sparkles } from 'lucide-react';

export function HeroSection() {
  const handleScheduleCall = () => {
    window.open('https://form.typeform.com/to/A6zJtlUM', '_blank');
  };

  return (
    <section className="pt-12 sm:pt-20 pb-16 sm:pb-32">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          {/* Background gradient effects */}
          <div className="absolute inset-0 bg-linear-to-br via-transparent rounded-2xl blur-3xl pointer-events-none" />

          <motion.div
            className="relative text-center space-y-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="flex justify-center"
            >
              <Badge
                variant="outline"
                className="px-2 sm:px-3 py-1 text-xs font-mono bg-emerald-500/10 border-emerald-500/20 text-emerald-600 hover:bg-emerald-500/20 hover:border-emerald-500/40 transition-all duration-300 cursor-default relative overflow-hidden"
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
                Enterprise Self-Hosted
              </Badge>
            </motion.div>

            {/* Main Headline */}
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-bold leading-tight tracking-tight">
              The First{' '}
              <AuroraText colors={['#10B981', '#22c55e', '#34D399', '#059669']}>
                Open-source
              </AuroraText>{' '}
              <br />
              Vibe Coding Platform
            </h1>

            {/* Subheadline */}
            <p className="text-base sm:text-lg lg:text-xl text-muted-foreground max-w-3xl mx-auto font-sans leading-relaxed">
              Deploy AI-powered development infrastructure in your own data center. Complete
              control, maximum security, zero vendor lock-in.
            </p>

            {/* CTA */}
            <motion.div
              className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center pt-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
            >
              <Button
                size="lg"
                className="w-full sm:w-auto px-6 sm:px-8 py-3 font-mono bg-primary hover:bg-primary/90"
                onClick={handleScheduleCall}
              >
                <Calendar className="mr-2 h-4 w-4" />
                Schedule a Call
              </Button>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
