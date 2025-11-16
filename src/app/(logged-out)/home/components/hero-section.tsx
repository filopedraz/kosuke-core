'use client';

import { AuroraText } from '@/components/ui/aurora-text';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import Link from 'next/link';

export function HeroSection() {
  return (
    <section className="pt-12 sm:pt-14 md:pt-16 lg:pt-20 pb-12 sm:pb-14 md:pb-20 lg:pb-32">
      <div className="container mx-auto px-8 sm:px-12 md:px-6">
        <div className="max-w-4xl mx-auto">
          {/* Centered Content */}
          <motion.div
            className="space-y-4 md:space-y-5 lg:space-y-6 text-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            {/* Badge */}
            <motion.div
              className="flex justify-center"
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

            <p className="text-base md:text-lg lg:text-xl text-muted-foreground font-sans leading-relaxed mx-auto max-w-3xl">
              Traditional vibe-coding platforms leave founders with broken demos, not real products.
              We deliver high-quality, market-ready software so you can launch your startup with
              confidence.
            </p>

            {/* CTA Button */}
            <motion.div
              className="flex justify-center pt-2 sm:pt-3"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.6 }}
            >
              <Button
                asChild
                size="lg"
                className="w-full sm:w-auto px-6 sm:px-8 py-3  bg-primary hover:bg-primary/90"
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
        </div>
      </div>
    </section>
  );
}
