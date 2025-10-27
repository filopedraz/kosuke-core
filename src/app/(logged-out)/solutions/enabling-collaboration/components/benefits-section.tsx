'use client';

import { AuroraText } from '@/components/ui/aurora-text';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { MagicCard } from '@/components/ui/magic-card';
import { motion } from 'framer-motion';
import { Rocket, Users, Zap } from 'lucide-react';
import { useTheme } from 'next-themes';
import { ReactNode } from 'react';

const benefits = [
  {
    icon: Users,
    title: 'No Code Knowledge Required',
    description:
      'Product managers, designers, and founders can build features using natural language. No programming experience needed.',
  },
  {
    icon: Rocket,
    title: 'Move Fast Independently',
    description:
      'Ship features without waiting for developer bandwidth. Your team can iterate quickly while engineers focus on complex problems.',
  },
  {
    icon: Zap,
    title: 'Save on Expensive AI Platforms',
    description:
      'Stop burning credits on AI coding tools. Ship directly to your own repository with no vendor lock-in or usage limits.',
  },
];

const CardDecorator = ({ children }: { children: ReactNode }) => (
  <div className="mask-radial-from-40% mask-radial-to-60% relative mx-auto size-36 duration-200 [--color-border:color-mix(in_oklab,var(--color-zinc-950)10%,transparent)] group-hover:[--color-border:color-mix(in_oklab,var(--color-zinc-950)20%,transparent)] dark:[--color-border:color-mix(in_oklab,var(--color-white)15%,transparent)] dark:group-hover:[--color-border:color-mix(in_oklab,var(--color-white)20%,transparent)]">
    <div
      aria-hidden
      className="absolute inset-0 bg-[linear-gradient(to_right,var(--color-border)_1px,transparent_1px),linear-gradient(to_bottom,var(--color-border)_1px,transparent_1px)] bg-size-[24px_24px] dark:opacity-50"
    />
    <div className="bg-background absolute inset-0 m-auto flex size-12 items-center justify-center border-l border-t">
      {children}
    </div>
  </div>
);

export function BenefitsSection() {
  const { theme } = useTheme();

  return (
    <section className="bg-muted/50 py-16 md:py-32 dark:bg-transparent">
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
              Empower Your Entire{' '}
              <AuroraText colors={['#10B981', '#22c55e', '#34D399', '#059669']}>Team</AuroraText>
            </h2>
            <p className="text-base sm:text-lg text-muted-foreground max-w-3xl mx-auto font-sans px-2">
              Break down barriers between technical and non-technical team members. Everyone
              contributes to shipping great products.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 *:text-center">
            {benefits.map((benefit, index) => (
              <motion.div
                key={benefit.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
              >
                <Card className="w-full border-none p-0 shadow-none h-full">
                  <MagicCard
                    gradientColor={theme === 'dark' ? '#262626' : '#D9D9D955'}
                    gradientFrom="#10B981"
                    gradientTo="#22c55e"
                    className="p-0 h-full"
                  >
                    <CardHeader className="pb-4">
                      <CardDecorator>
                        <benefit.icon className="size-6" aria-hidden />
                      </CardDecorator>
                      <h3 className="mt-6 text-lg font-semibold">{benefit.title}</h3>
                    </CardHeader>
                    <CardContent className="pb-6">
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {benefit.description}
                      </p>
                    </CardContent>
                  </MagicCard>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
