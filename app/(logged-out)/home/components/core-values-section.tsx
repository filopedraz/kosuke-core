'use client';

import { Card, CardContent } from '@/components/ui/card';
import { motion } from 'framer-motion';
import { CheckCircle, Eye, Rocket, Shield, Zap } from 'lucide-react';

const coreValues = [
  {
    icon: Rocket,
    title: "Ship, Don't Demo",
    description: 'We care about finished, working products—not "almost done" prototypes.',
    colSpan: 'col-span-full sm:col-span-3 lg:col-span-2',
  },
  {
    icon: CheckCircle,
    title: 'Human-in-the-Loop',
    description:
      'AI kicks off, but senior engineers always check, fix, and sign off. Quality = trust.',
    colSpan: 'col-span-full sm:col-span-3 lg:col-span-2',
  },
  {
    icon: Eye,
    title: 'Open and Transparent',
    description: 'No hidden quotas, no vendor lock-in. All code is open—yours to use or move.',
    colSpan: 'col-span-full sm:col-span-3 lg:col-span-2',
  },
  {
    icon: Shield,
    title: 'Security by Design',
    description: 'Security first approach in every aspect of development and deployment.',
    colSpan: 'col-span-full lg:col-span-3',
  },
  {
    icon: Zap,
    title: 'Lightning Fast',
    description:
      'Optimized performance and rapid deployment cycles ensure your projects move at the speed of business.',
    colSpan: 'col-span-full lg:col-span-3',
  },
];

export function CoreValuesSection() {
  return (
    <section className="bg-gray-50 py-16 md:py-32 dark:bg-transparent">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div
            className="text-center mb-12 sm:mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-3 sm:mb-4 font-mono">
              Our Core Values
            </h2>
            <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto font-sans px-2">
              The principles that guide everything we build and how we work with you.
            </p>
          </motion.div>

          <div className="relative">
            <div className="relative z-10 grid grid-cols-6 gap-3 max-w-5xl mx-auto">
              {coreValues.map((value, index) => (
                <motion.div
                  key={value.title}
                  className={`relative ${value.colSpan} overflow-hidden`}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                >
                  <Card className="relative h-full overflow-hidden">
                    <CardContent className="relative z-10 pt-6">
                      <div className="relative flex aspect-square size-12 rounded-full border before:absolute before:-inset-2 before:rounded-full before:border dark:border-white/10 dark:before:border-white/5">
                        <value.icon className="m-auto size-5" strokeWidth={1} />
                      </div>
                      <div className="mt-6 space-y-2">
                        <h2 className="text-lg font-medium transition font-mono">{value.title}</h2>
                        <p className="text-foreground font-sans leading-relaxed">
                          {value.description}
                        </p>
                      </div>
                    </CardContent>
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
