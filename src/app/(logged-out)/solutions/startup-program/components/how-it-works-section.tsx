'use client';

import { Card, CardContent } from '@/components/ui/card';
import { motion } from 'framer-motion';
import { Lightbulb, Rocket, Search } from 'lucide-react';

const steps = [
  {
    step: 1,
    icon: Lightbulb,
    title: 'Present Your Idea',
    description:
      "Share your vision through our application form. Tell us about your product, target market, and what problem you're solving.",
  },
  {
    step: 2,
    icon: Search,
    title: 'Internal Review',
    description:
      'Our team evaluates your idea for market viability, technical feasibility, and alignment with our startup program.',
  },
  {
    step: 3,
    icon: Rocket,
    title: 'Start Shipping',
    description:
      'If accepted, we assign a dedicated team of senior engineers who build your MVP from scratch. First features ship in weeks.',
  },
];

export function HowItWorksSection() {
  return (
    <section className="py-16 md:py-32">
      <div className="container mx-auto px-8 sm:px-12 md:px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div
            className="text-center mb-12 sm:mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-3 sm:mb-4 font-mono">
              How It Works
            </h2>
            <p className="text-base sm:text-lg text-muted-foreground max-w-3xl mx-auto font-sans px-2">
              A simple three-step process from idea to production-ready MVP. Most accepted ventures
              launch in <span className="text-emerald-600 font-semibold">4-8 weeks</span>.
            </p>
          </motion.div>

          <div className="relative">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative z-10">
              {steps.map((step, index) => (
                <motion.div
                  key={step.step}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: index * 0.2 }}
                  className="relative"
                >
                  <Card className="h-full bg-card/50 border-border/50 hover:bg-card transition-all duration-300 relative overflow-hidden group">
                    {/* Step number badge */}
                    <div className="absolute top-4 right-4 w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                      <span className="text-emerald-600 font-bold font-mono text-sm">
                        {step.step}
                      </span>
                    </div>

                    <CardContent className="p-6 pt-16">
                      <div className="flex items-center justify-center mb-6">
                        <div className="relative flex aspect-square size-16 rounded-full border-2 border-emerald-500/20 bg-emerald-500/5 group-hover:border-emerald-500/40 transition-all duration-300">
                          <step.icon className="m-auto size-8 text-emerald-600" strokeWidth={1.5} />
                        </div>
                      </div>

                      <h3 className="text-xl font-semibold mb-4 text-center font-mono">
                        {step.title}
                      </h3>
                      <p className="text-sm text-muted-foreground leading-relaxed text-center font-sans">
                        {step.description}
                      </p>
                    </CardContent>

                    {/* Hover effect */}
                    <div className="absolute inset-0 bg-linear-to-br from-emerald-500/0 to-emerald-500/0 group-hover:from-emerald-500/5 group-hover:to-emerald-500/10 transition-all duration-300 pointer-events-none" />
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
