'use client';

import { AuroraText } from '@/components/ui/aurora-text';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { Calendar, Sparkles } from 'lucide-react';
import Image from 'next/image';

export function HeroSection() {
  const handleScheduleCall = () => {
    window.open('https://links.kosuke.ai/contact', '_blank');
  };

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
                  Enterprise Self-Hosted
                </Badge>
              </motion.div>

              {/* Main Headline */}
              <h1 className="text-3xl sm:text-[2rem] md:text-4xl lg:text-6xl sm:leading-tight font-bold leading-tight tracking-tight">
                The First{' '}
                <AuroraText colors={['#10B981', '#22c55e', '#34D399', '#059669']}>
                  On-premise
                </AuroraText>{' '}
                <br />
                Vibe Coding Platform
              </h1>

              {/* Subheadline */}
              <p className="text-base md:text-lg lg:text-xl text-muted-foreground font-sans leading-relaxed">
                Give your teams the powers of vibe coding without compromising your company&apos;s
                data privacy.
              </p>

              {/* Mac Studio Image - Mobile Only (1 Mac) */}
              <motion.div
                className="relative md:hidden"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
              >
                <div className="max-w-[180px] mx-auto">
                  <motion.div
                    className="relative"
                    animate={{
                      y: [0, -6, 0],
                    }}
                    transition={{
                      duration: 3,
                      repeat: Infinity,
                      ease: 'easeInOut',
                    }}
                  >
                    <Image
                      src="/mac_studio.png"
                      alt="Mac Studio"
                      width={1000}
                      height={1000}
                      className="w-full h-auto"
                      priority
                    />
                  </motion.div>
                </div>
              </motion.div>

              {/* CTA */}
              <motion.div
                className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-2 sm:pt-3 items-center justify-center md:items-start md:justify-start"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.6 }}
              >
                <Button
                  size="lg"
                  className="w-full sm:w-auto px-6 sm:px-8 py-3  bg-primary hover:bg-primary/90"
                  onClick={handleScheduleCall}
                >
                  <Calendar className="mr-2 h-4 w-4" />
                  Schedule a Call
                </Button>
              </motion.div>
            </motion.div>

            {/* Right Column - Mac Studio Grid - Tablet & Desktop */}
            <motion.div
              className="relative hidden md:block"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
            >
              {/* Mac Studio Grid Container */}
              <div className="grid grid-cols-2 gap-4 md:gap-5 lg:gap-6 max-w-md md:max-w-sm lg:max-w-lg mx-auto">
                {[0, 1, 2, 3].map(index => (
                  <motion.div
                    key={index}
                    initial={{
                      opacity: 0,
                      scale: 0.7,
                      y: 50,
                    }}
                    animate={{
                      opacity: 1,
                      scale: 1,
                      y: 0,
                    }}
                    transition={{
                      duration: 0.6,
                      delay: 0.6 + index * 0.1,
                      ease: [0.34, 1.56, 0.64, 1],
                    }}
                  >
                    <motion.div
                      className="relative"
                      animate={{
                        y: [0, -6, 0],
                      }}
                      transition={{
                        duration: 3 + index * 0.2,
                        repeat: Infinity,
                        ease: 'easeInOut',
                        delay: index * 0.3,
                      }}
                    >
                      <Image
                        src="/mac_studio.png"
                        alt={`Mac Studio ${index + 1}`}
                        width={1000}
                        height={1000}
                        className="w-full h-auto"
                        priority={index === 0}
                      />
                    </motion.div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
