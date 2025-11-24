'use client';

import { AuroraText } from '@/components/ui/aurora-text';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { MagicCard } from '@/components/ui/magic-card';
import { motion } from 'framer-motion';
import { ArrowRight, Bot, Code2, Users } from 'lucide-react';
import { useTheme } from 'next-themes';
import Link from 'next/link';
import { ReactNode } from 'react';

const solutions = [
  {
    icon: Bot,
    title: 'Kosuke Platform',
    description:
      'Build with AI, finish with real engineers. Chat with AI to prototype fast, then seamlessly connect with senior engineers when you hit complex challenges.',
    href: '/solutions/kosuke-platform',
  },
  {
    icon: Code2,
    title: 'Kosuke Engineers',
    description:
      'Get a dedicated senior engineer building production-ready software for your startup. Real accountability, transparent pricing, and shipped products.',
    href: '/solutions/ship-with-engineers',
  },
  {
    icon: Users,
    title: 'Kosuke for Teams',
    description:
      'Enable collaboration across your entire team with shared projects, version control, and real-time communication with both AI and human engineers.',
    href: '/solutions/enabling-collaboration',
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

export function SolutionsGridSection() {
  const { theme } = useTheme();

  return (
    <section className="bg-muted/50 py-16 md:py-32 dark:bg-transparent">
      <div className="container mx-auto px-8 sm:px-12 md:px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div
            className="text-center mb-12 sm:mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-3 sm:mb-4">
              <AuroraText colors={['#10B981', '#22c55e', '#34D399', '#059669']}>Kosuke</AuroraText>{' '}
              Solutions
            </h2>
            <p className="text-base sm:text-lg text-muted-foreground max-w-3xl mx-auto font-sans px-2">
              Choose the right solution for your startup journey
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 *:text-center">
            {solutions.map((solution, index) => (
              <motion.div
                key={solution.title}
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
                    className="p-0 h-full flex flex-col"
                  >
                    <CardHeader className="pb-4 flex-1">
                      <CardDecorator>
                        <solution.icon className="size-6" aria-hidden />
                      </CardDecorator>
                      <h3 className="mt-6 text-lg font-semibold">{solution.title}</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed mt-2 px-4">
                        {solution.description}
                      </p>
                    </CardHeader>
                    <CardContent className="pb-6 pt-0">
                      <Button asChild variant="outline" size="sm" className="w-full group/btn">
                        <Link href={solution.href}>
                          Learn More
                          <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover/btn:translate-x-1" />
                        </Link>
                      </Button>
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
