'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { motion } from 'framer-motion';
import { Code2, Database, Lock, Sparkles, Zap } from 'lucide-react';
import { useEffect, useState } from 'react';
import { FAQSection } from './components/faq-section';
import { FeaturesBentoGrid } from './components/features-bento-grid';
import { PrivateAlphaModal } from './components/private-alpha-modal';
import { ReviewsMarquee } from './components/reviews-marquee';

// Developer-centric collaboration features
const coreFeatures = [
  {
    icon: Code2,
    title: 'Describe what you want to build',
    description: 'Website, workflow, automation; be specific, we’ll translate to working steps.',
    metrics: 'Code-centric',
  },
  {
    icon: Lock,
    title: 'AI fast builds your draft',
    description: 'Kosuke Templates help you prototype quickly.',
    metrics: 'Team-friendly',
  },
  {
    icon: Database,
    title: 'Get real help; only when/if you need it',
    description:
      'Stuck? Ask a developer. We’ll review, fix bugs, and ensure your project works; when you need it, just request support.',
    metrics: 'Cross-functional',
  },
  {
    icon: Zap,
    title: 'Ship a working product you own',
    description:
      'When done, your project is fully exportable, open, and truly yours. No lock-in, no hidden traps.',
    metrics: 'Git-native',
  },
];

export default function HomePage() {
  const [isModalOpen, setIsModalOpen] = useState(false);

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
              Start with AI. <br />
              Finish with Engineers.
              <br />
            </h1>

            <p className="text-base sm:text-lg lg:text-xl text-muted-foreground mb-6 sm:mb-8 max-w-2xl mx-auto font-sans px-2">
              Turn ideas into real functional products, using AI for speed and Developers for
              quality. No more endless prompt fixing, buggy code or unfinished projects.
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
              onClick={() => setIsModalOpen(true)}
            >
              <Code2 className="mr-2 h-4 w-4" />
              Apply for Early Access
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Core Features */}
      <section className="py-12 sm:py-20">
        <div className="container mx-auto px-4 sm:px-6">
          <motion.div
            className="text-center mb-12 sm:mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-3 sm:mb-4 font-mono">
              Start shipping today
            </h2>
            <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto font-sans px-2">
              Prototype fast, get expert support, ship your product; no strings attached.
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
      <FeaturesBentoGrid />

      {/* Reviews Section */}
      <ReviewsMarquee />

      {/* Private Alpha CTA */}
      <section id="cta-section" className="py-16 sm:py-32 pb-12 sm:pb-24 px-4 sm:px-6">
        <div className="container mx-auto text-center max-w-3xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <div className="mb-6 sm:mb-8">
              <Badge
                variant="outline"
                className="px-2 sm:px-3 py-1 text-xs font-mono bg-emerald-500/10 border-emerald-500/20 text-emerald-600 hover:bg-emerald-500/20 hover:border-emerald-500/40 transition-all duration-300 cursor-default relative overflow-hidden"
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
            </div>

            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4 sm:mb-6 font-mono">
              Join the Private Alpha
            </h2>

            <p className="text-base sm:text-lg text-muted-foreground mb-8 sm:mb-12 font-sans px-2">
              Want to use a tool that fixes what others ignore? We read every reply. Real feedback
              shapes what we build next.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
              <Button
                size="lg"
                variant="outline"
                className="w-full sm:w-auto px-6 sm:px-8 py-3 font-mono"
                onClick={() => setIsModalOpen(true)}
              >
                <Code2 className="mr-2 h-4 w-4" />
                Apply for Early Access
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* FAQ Section */}
      <FAQSection />

      {/* Private Alpha Modal */}
      <PrivateAlphaModal open={isModalOpen} onOpenChange={setIsModalOpen} />
    </div>
  );
}
