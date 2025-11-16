'use client';

import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { MagicCard } from '@/components/ui/magic-card';
import { motion } from 'framer-motion';
import { AlertTriangle, CreditCard, Lock } from 'lucide-react';
import { useTheme } from 'next-themes';
import { ReactNode } from 'react';

const problems = [
  {
    icon: AlertTriangle,
    title: 'Only for mockups',
    description:
      'It&apos;s good for functioning mockups, but when you need solid authentication and billing, these solutions don&apos;t even reach that point.',
  },
  {
    icon: CreditCard,
    title: 'No costs transparency',
    description:
      'Using Lovable credits is like going to the casino. You never know if it will fix the issue.',
  },
  {
    icon: Lock,
    title: 'Zero control',
    description: 'You don&apos;t know what&apos;s going on and when it will break.',
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

export function ProblemsSection() {
  const { theme } = useTheme();

  return (
    <section className="py-12 sm:py-14 md:py-20 lg:py-24">
      <div className="container mx-auto px-8 sm:px-12 md:px-6">
        <div className="max-w-7xl mx-auto">
          <motion.div
            className="text-center mb-10 md:mb-14"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-3 sm:mb-4">
              Current vibe coding platforms have limitations
            </h2>
            <p className="text-base md:text-lg text-muted-foreground max-w-2xl mx-auto">
              Here&apos;s why traditional AI coding platforms fall short for serious founders
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6 *:text-center">
            {problems.map((problem, index) => (
              <motion.div
                key={problem.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
              >
                <Card className="w-full border-none p-0 shadow-none h-full">
                  <MagicCard
                    gradientColor={theme === 'dark' ? '#262626' : '#D9D9D955'}
                    gradientFrom="#EF4444"
                    gradientTo="#DC2626"
                    className="p-0 h-full"
                  >
                    <CardHeader className="pb-4">
                      <CardDecorator>
                        <problem.icon className="size-6 text-red-600" aria-hidden />
                      </CardDecorator>
                      <h3 className="mt-6 text-lg font-semibold">{problem.title}</h3>
                    </CardHeader>
                    <CardContent className="pb-6">
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {problem.description}
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
