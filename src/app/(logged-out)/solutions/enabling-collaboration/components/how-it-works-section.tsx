'use client';

import { Card, CardContent } from '@/components/ui/card';
import { motion } from 'framer-motion';
import { CheckCircle, GitPullRequest, MessageSquare, Upload } from 'lucide-react';

const steps = [
  {
    step: 1,
    icon: Upload,
    title: 'Import Repository',
    description:
      'Connect your GitHub repository to Kosuke. Your code stays in your own infrastructure. We just help you build on top of it.',
  },
  {
    step: 2,
    icon: MessageSquare,
    title: 'Start Vibe Coding',
    description:
      'Your product team can describe features in plain English using our chat interface.',
  },
  {
    step: 3,
    icon: GitPullRequest,
    title: 'Submit for Review',
    description:
      'Your changes are automatically packaged as a pull request: something that is very familiar to your developers.',
  },
  {
    step: 4,
    icon: CheckCircle,
    title: 'Review and Deploy',
    description:
      'Your developers can review the code, eventually modify it using the tools they are already familiar with, and finally deploy it to production.',
  },
];

export function HowItWorksSection() {
  return (
    <section className="py-16 md:py-32">
      <div className="container mx-auto px-8 sm:px-12 md:px-6">
        <div className="max-w-7xl mx-auto">
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
              A simple workflow that keeps your team moving fast while maintaining developer
              oversight.
            </p>
          </motion.div>

          <div className="relative">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 relative z-10">
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
