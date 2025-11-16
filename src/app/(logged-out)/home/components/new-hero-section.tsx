'use client';

import { AuroraText } from '@/components/ui/aurora-text';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import Link from 'next/link';

export function NewHeroSection() {
  return (
    <section className="pt-12 sm:pt-14 md:pt-16 lg:pt-20 pb-12 sm:pb-14 md:pb-20 lg:pb-32">
      <div className="container mx-auto px-8 sm:px-12 md:px-6">
        <div className="max-w-7xl mx-auto">
          {/* Two Column Layout */}
          <div className="grid md:grid-cols-2 gap-8 md:gap-12 lg:gap-16 items-center">
            {/* Left Column - Content */}
            <motion.div
              className="space-y-4 md:space-y-5 lg:space-y-6 md:pr-6 lg:pr-8"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              {/* Badge */}
              <motion.div
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
                  cofounder
                </AuroraText>
                <br />
                for the 0 to 1.
              </h1>

              <p className="text-base md:text-lg lg:text-xl text-muted-foreground font-sans leading-relaxed">
                Traditional vibe-coding platforms leave founders with broken demos, not real
                products. We deliver high-quality, market-ready software so you can launch your
                startup with confidence.
              </p>

              {/* CTA Button */}
              <motion.div
                className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-2 sm:pt-3 items-center justify-center md:items-start md:justify-start"
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

            {/* Right Column - Visual placeholder for now */}
            <motion.div
              className="relative"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
            >
              {/* Background blur effect */}
              <div className="absolute inset-0 bg-linear-to-br from-emerald-500/5 via-transparent to-blue-500/5 rounded-2xl blur-3xl" />

              {/* Placeholder content - can be replaced with an image or illustration */}
              <div className="relative bg-background/80 backdrop-blur-xl border border-border/50 rounded-2xl p-8 sm:p-12 shadow-2xl min-h-[400px] md:min-h-[500px] flex items-center justify-center">
                <div className="text-center space-y-4">
                  <div className="w-20 h-20 mx-auto rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                    <Sparkles className="w-10 h-10 text-emerald-600" />
                  </div>
                  <p className="text-muted-foreground">Visual coming soon</p>
                </div>
              </div>

              {/* Decorative elements */}
              <div className="absolute -top-4 -right-4 w-8 h-8 bg-emerald-500/20 rounded-full blur-sm" />
              <div className="absolute -bottom-4 -left-4 w-6 h-6 bg-blue-500/20 rounded-full blur-sm" />
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
