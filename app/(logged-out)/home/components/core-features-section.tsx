'use client';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { motion } from 'framer-motion';
import { Code2, Database, Lock, Zap } from 'lucide-react';

// Developer-centric collaboration features
const coreFeatures = [
  {
    icon: Code2,
    title: 'Describe what you want to build',
    description: "Website, workflow, automation; be specific, we'll translate to working steps.",
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
      "Stuck? Ask a developer. We'll review, fix bugs, and ensure your project works; when you need it, just request support.",
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

export function CoreFeaturesSection() {
  return (
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
  );
}
