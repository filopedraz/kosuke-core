'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { motion } from 'framer-motion';
import { ArrowRight, Code2, Database, Lock, Rocket, Sparkles, Star, Zap } from 'lucide-react';
import { useEffect } from 'react';

// Developer-centric collaboration features
const coreFeatures = [
  {
    icon: Code2,
    title: 'Developer First Experience',
    description:
      'Bottom-up, first principles approach. Code remains the source of truth with full developer control.',
    metrics: 'Code-centric',
  },
  {
    icon: Lock,
    title: 'Unlock Collaboration',
    description:
      'Enable non-devs to contribute to the same repo without replacing developers or designers.',
    metrics: 'Team-friendly',
  },
  {
    icon: Database,
    title: 'Break Down Silos',
    description:
      'Tools designed for product builders with different skills, not just one category or the other.',
    metrics: 'Cross-functional',
  },
  {
    icon: Zap,
    title: 'Preserve Dev Workflow',
    description: 'Keep pull requests, code reviews, and proper development lifecycle intact.',
    metrics: 'Git-native',
  },
];

export default function HomePage() {
  useEffect(() => {
    // Scroll to top on mount
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="w-full min-h-screen bg-background font-mono">
      {/* Minimal background with subtle grid */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-background" />
        <div
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: `
              linear-gradient(rgba(34, 197, 94, 0.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(34, 197, 94, 0.1) 1px, transparent 1px)
            `,
            backgroundSize: '50px 50px',
          }}
        />
      </div>

      {/* Hero Section - Terminal First */}
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
              Enabling REAL Collaboration
            </h1>

            <p className="text-base sm:text-lg lg:text-xl text-muted-foreground mb-6 sm:mb-8 max-w-2xl mx-auto font-sans px-2">
              No more bullshit vibe-coding platforms promising to go to the moon. Let&apos;s be
              honest and real. We need developers who can build and ship end-to-end products. But
              non-developers can still contribute in a big way.
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
              className="w-full sm:w-auto px-6 sm:px-8 py-3 bg-emerald-500 hover:bg-emerald-600 text-black font-mono font-semibold"
              onClick={() => window.open('https://github.com/filopedraz/kosuke-core', '_blank')}
            >
              <Rocket className="mr-2 h-4 w-4" />
              git clone kosuke
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="w-full sm:w-auto px-6 sm:px-8 py-3 font-mono"
              onClick={() => {
                const ctaSection = document.getElementById('cta-section');
                ctaSection?.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              <Code2 className="mr-2 h-4 w-4" />
              Join the Private Alpha
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Core Features */}
      <section className="py-12 sm:py-20 bg-muted/20">
        <div className="container mx-auto px-4 sm:px-6">
          <motion.div
            className="text-center mb-12 sm:mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-3 sm:mb-4 font-mono">
              # Core Principles
            </h2>
            <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto font-sans px-2">
              Developer-centric collaboration for product builders with different skills
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 max-w-5xl mx-auto">
            {coreFeatures.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
              >
                <Card className="h-full border border-border/50 bg-card/50 hover:bg-card/80 transition-all duration-300 group">
                  <CardContent className="p-6 sm:p-8">
                    <div className="flex items-start justify-between mb-4 sm:mb-6">
                      <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500">
                        <feature.icon className="h-4 w-4 sm:h-5 sm:w-5" />
                      </div>
                      <Badge variant="outline" className="text-xs font-mono">
                        {feature.metrics}
                      </Badge>
                    </div>

                    <h3 className="text-lg sm:text-xl font-semibold mb-2 sm:mb-3 font-mono">
                      {feature.title}
                    </h3>

                    <p className="text-sm sm:text-base text-muted-foreground font-sans leading-relaxed">
                      {feature.description}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Bento Grid Features */}
      {/* <FeaturesBentoGrid /> */}

      {/* Private Alpha CTA */}
      <section id="cta-section" className="py-16 sm:py-32 pb-24 sm:pb-48 px-4 sm:px-6">
        <div className="container mx-auto text-center max-w-3xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <div className="mb-6 sm:mb-8">
              <div className="inline-flex items-center space-x-2 bg-emerald-500/10 rounded-full px-3 sm:px-4 py-2 text-xs sm:text-sm font-mono text-emerald-600 border border-emerald-500/20">
                <Sparkles className="h-3 w-3" />
                <span>Private Alpha</span>
              </div>
            </div>

            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4 sm:mb-6 font-mono">
              Join the Private Alpha
            </h2>

            <p className="text-base sm:text-lg text-muted-foreground mb-8 sm:mb-12 font-sans px-2">
              Be part of the early group shaping the future of developer-centric collaboration.{' '}
              <br />
              Connect with me directly to get access.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
              <Button
                size="lg"
                className="w-full sm:w-auto px-6 sm:px-8 py-3 bg-emerald-500 hover:bg-emerald-600 text-black font-mono font-semibold"
                onClick={() =>
                  window.open('https://www.linkedin.com/in/filippo-pedrazzini-a5083b242/', '_blank')
                }
              >
                <Star className="mr-2 h-4 w-4" />
                Contact on LinkedIn
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="w-full sm:w-auto px-6 sm:px-8 py-3 font-mono"
                onClick={() => window.open('https://github.com/filopedraz/kosuke-core', '_blank')}
              >
                Explore the Code
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
