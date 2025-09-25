'use client';

import { Card, CardContent } from '@/components/ui/card';
import { motion } from 'framer-motion';
import { CheckCircle, Eye, Rocket, Shield } from 'lucide-react';

const coreValues = [
  {
    icon: Rocket,
    title: "Ship, Don't Demo",
    description: 'We care about finished, working products—not "almost done" prototypes.',
    color: 'emerald',
  },
  {
    icon: CheckCircle,
    title: 'Human-in-the-Loop',
    description:
      'AI kicks off, but senior engineers always check, fix, and sign off. Quality = trust.',
    color: 'blue',
  },
  {
    icon: Eye,
    title: 'Open and Transparent',
    description: 'No hidden quotas, no vendor lock-in. All code is open—yours to use or move.',
    color: 'purple',
  },
  {
    icon: Shield,
    title: 'Security by Design',
    description: 'Security first approach in every aspect of development and deployment.',
    color: 'orange',
  },
];

const getColorClasses = (color: string) => {
  const colorMap = {
    emerald: {
      bg: 'bg-emerald-500/10',
      text: 'text-emerald-500',
      border: 'border-emerald-500/20',
      hoverBorder: 'hover:border-emerald-500/30',
    },
    blue: {
      bg: 'bg-blue-500/10',
      text: 'text-blue-500',
      border: 'border-blue-500/20',
      hoverBorder: 'hover:border-blue-500/30',
    },
    purple: {
      bg: 'bg-purple-500/10',
      text: 'text-purple-500',
      border: 'border-purple-500/20',
      hoverBorder: 'hover:border-purple-500/30',
    },
    orange: {
      bg: 'bg-orange-500/10',
      text: 'text-orange-500',
      border: 'border-orange-500/20',
      hoverBorder: 'hover:border-orange-500/30',
    },
  };
  return colorMap[color as keyof typeof colorMap] || colorMap.emerald;
};

export function CoreValuesSection() {
  return (
    <section className="py-16 sm:py-32 bg-muted/5">
      <div className="container mx-auto px-4 sm:px-6">
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 max-w-5xl mx-auto">
          {coreValues.map((value, index) => {
            const colors = getColorClasses(value.color);
            return (
              <motion.div
                key={value.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
              >
                <Card
                  className={`h-full border ${colors.border} ${colors.hoverBorder} bg-card/50 hover:bg-card/80 transition-all duration-300 group`}
                >
                  <CardContent className="p-6 sm:p-8">
                    <div className="flex items-start gap-4 mb-4 sm:mb-6">
                      <div className={`p-2 rounded-lg ${colors.bg} ${colors.text} flex-shrink-0`}>
                        <value.icon className="h-5 w-5 sm:h-6 sm:w-6" />
                      </div>
                      <div>
                        <h3 className="text-lg sm:text-xl font-semibold mb-2 sm:mb-3 font-mono">
                          {value.title}
                        </h3>
                        <p className="text-sm sm:text-base text-muted-foreground font-sans leading-relaxed">
                          {value.description}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
