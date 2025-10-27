'use client';

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { AuroraText } from '@/components/ui/aurora-text';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { motion } from 'framer-motion';
import { Calendar, Phone, Sparkles } from 'lucide-react';
import Link from 'next/link';

const comparisonData = [
  {
    feature: 'Quality',
    lovable: { value: 'Low', description: 'AI-generated prototypes, no human oversight' },
    kosuke: { value: 'High', description: 'AI + Senior engineers ensure production quality' },
    agency: { value: 'High', description: 'Manual development, slower iterations' },
  },
  {
    feature: 'Cost',
    lovable: { value: 'Mid', description: 'Credits burn fast, unpredictable costs' },
    kosuke: { value: 'Low', description: 'Transparent pricing, no usage surprises' },
    agency: { value: 'High', description: '$50k-$500k per project, long timelines' },
  },
  {
    feature: 'Lock In',
    lovable: { value: 'High', description: 'Proprietary platform, hard to export' },
    kosuke: { value: 'Low', description: 'Your repo, export anytime, open-source' },
    agency: { value: 'Low', description: 'Own the code, but expensive to maintain' },
  },
  {
    feature: 'Support',
    lovable: { value: 'Low', description: 'Community forums, no direct engineering help' },
    kosuke: { value: 'High', description: 'Real engineers fix bugs and unblock you' },
    agency: { value: 'High', description: 'Dedicated team, but costly retainers' },
  },
];

const faqItems = [
  {
    id: 'item-1',
    question: 'How is Kosuke different from Lovable or other AI coding platforms?',
    answer:
      'Unlike pure AI platforms that leave you stuck debugging generated code, Kosuke combines AI speed with human expertise. When AI hits a wall, our senior engineers step in to fix issues and ship production-ready code.',
  },
  {
    id: 'item-2',
    question: 'Why is Kosuke cheaper than a traditional software agency?',
    answer:
      'We leverage AI for the heavy lifting and only use senior engineers where human expertise is critical. This hybrid approach gives you agency-level quality at a fraction of the cost.',
  },
  {
    id: 'item-3',
    question: 'What happens to my code if I stop using Kosuke?',
    answer:
      "Nothing. Your code lives in your own repository from day one. No vendor lock-in, no proprietary frameworks. Export everything and walk away anytime—though we're confident you won't want to.",
  },
  {
    id: 'item-4',
    question: 'How do you avoid the "credit burning" problem of other platforms?',
    answer:
      "We don't charge per API call or compute usage. Our pricing is transparent and predictable. You know exactly what you're paying upfront, with no surprise bills from AI token usage.",
  },
  {
    id: 'item-5',
    question: 'Can I really ship production-quality code with Kosuke?',
    answer:
      "Yes. Every feature goes through senior engineer review before shipping. We don't just generate code—we ensure it's maintainable, scalable, and production-ready.",
  },
];

function getValueBadge(value: 'Low' | 'Mid' | 'High', isKosuke: boolean = false) {
  const baseClasses = 'px-3 py-1 rounded-full text-sm font-semibold font-mono';

  if (value === 'Low') {
    return (
      <Badge className={`${baseClasses} bg-emerald-500/10 text-emerald-600 border-emerald-500/20`}>
        Low
      </Badge>
    );
  }

  if (value === 'Mid') {
    return (
      <Badge className={`${baseClasses} bg-yellow-500/10 text-yellow-600 border-yellow-500/20`}>
        Mid
      </Badge>
    );
  }

  if (value === 'High') {
    // For Kosuke, High quality/support is good (green), but for others in cost it's bad (red)
    if (isKosuke) {
      return (
        <Badge
          className={`${baseClasses} bg-emerald-500/10 text-emerald-600 border-emerald-500/20`}
        >
          High
        </Badge>
      );
    }
    return (
      <Badge className={`${baseClasses} bg-red-500/10 text-red-600 border-red-500/20`}>High</Badge>
    );
  }
}

export default function PricingPage() {
  const handleScheduleCall = () => {
    window.open('https://calendly.com/your-calendly-link', '_blank');
  };

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="pt-12 sm:pt-20 pb-16 sm:pb-24">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="max-w-6xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="space-y-6"
            >
              <Badge
                variant="outline"
                className="px-2 sm:px-3 py-1 text-xs font-mono bg-emerald-500/10 border-emerald-500/20 text-emerald-600 hover:bg-emerald-500/20 hover:border-emerald-500/40 transition-all duration-300 cursor-default relative overflow-hidden"
              >
                <motion.div
                  className="absolute inset-0 -top-1 -bottom-1 bg-linear-to-r from-transparent via-white/20 to-transparent"
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
                Honest Comparison
              </Badge>

              <h1 className="text-3xl sm:text-5xl lg:text-6xl font-bold leading-tight tracking-tight">
                Compare Your{' '}
                <AuroraText colors={['#10B981', '#22c55e', '#34D399', '#059669']}>
                  Options
                </AuroraText>
              </h1>

              <p className="text-base sm:text-lg lg:text-xl text-muted-foreground max-w-3xl mx-auto font-sans leading-relaxed">
                Stop choosing between speed and quality. See how Kosuke delivers both without the
                typical trade-offs.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Comparison Table */}
      <section className="py-16 md:py-24 bg-muted/50 dark:bg-transparent">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="max-w-6xl mx-auto">
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left p-4 font-mono text-lg font-semibold"></th>
                    <th className="text-center p-4 font-mono text-lg font-semibold">Lovable</th>
                    <th className="text-center p-4 font-mono text-lg font-semibold relative">
                      <div className="absolute inset-0 bg-emerald-500/5 rounded-t-lg -z-10" />
                      Kosuke
                    </th>
                    <th className="text-center p-4 font-mono text-lg font-semibold">
                      Software Agency
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {comparisonData.map((row, index) => (
                    <motion.tr
                      key={row.feature}
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.5, delay: index * 0.1 }}
                      className="border-b border-border hover:bg-muted/50 transition-colors"
                    >
                      <td className="p-4 font-semibold font-mono">{row.feature}</td>
                      <td className="p-4 text-center">
                        <div className="flex justify-center">
                          {getValueBadge(row.lovable.value as 'Low' | 'Mid' | 'High')}
                        </div>
                      </td>
                      <td className="p-4 text-center relative">
                        <div className="absolute inset-0 bg-emerald-500/5 -z-10" />
                        <div className="flex justify-center">
                          {getValueBadge(row.kosuke.value as 'Low' | 'Mid' | 'High', true)}
                        </div>
                      </td>
                      <td className="p-4 text-center">
                        <div className="flex justify-center">
                          {getValueBadge(row.agency.value as 'Low' | 'Mid' | 'High')}
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden space-y-6">
              {comparisonData.map((row, index) => (
                <motion.div
                  key={row.feature}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                >
                  <Card>
                    <CardContent className="p-6">
                      <h3 className="font-bold text-lg mb-4 font-mono">{row.feature}</h3>
                      <div className="space-y-4">
                        {/* Kosuke - Featured */}
                        <div className="p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-lg">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold font-mono">Kosuke</span>
                            {getValueBadge(row.kosuke.value as 'Low' | 'Mid' | 'High', true)}
                          </div>
                        </div>

                        {/* Lovable */}
                        <div className="p-4 bg-muted rounded-lg">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold font-mono">Lovable</span>
                            {getValueBadge(row.lovable.value as 'Low' | 'Mid' | 'High')}
                          </div>
                        </div>

                        {/* Agency */}
                        <div className="p-4 bg-muted rounded-lg">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold font-mono">Software Agency</span>
                            {getValueBadge(row.agency.value as 'Low' | 'Mid' | 'High')}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="max-w-6xl mx-auto">
            <div className="mx-auto max-w-xl text-center mb-12">
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-3 sm:mb-4 font-mono">
                Frequently Asked Questions
              </h2>
              <p className="text-base sm:text-lg text-muted-foreground max-w-3xl mx-auto font-sans px-2">
                The honest answers to questions others avoid.
              </p>
            </div>

            <div className="mx-auto mt-12 max-w-xl">
              <Accordion
                type="single"
                collapsible
                className="bg-muted dark:bg-muted/50 w-full rounded-2xl p-1"
              >
                {faqItems.map(item => (
                  <div className="group" key={item.id}>
                    <AccordionItem
                      value={item.id}
                      className="data-[state=open]:bg-card dark:data-[state=open]:bg-muted peer rounded-xl border-none px-7 py-1 data-[state=open]:border-none data-[state=open]:shadow-sm"
                    >
                      <AccordionTrigger className="cursor-pointer text-base hover:no-underline">
                        {item.question}
                      </AccordionTrigger>
                      <AccordionContent>
                        <p className="text-base">{item.answer}</p>
                      </AccordionContent>
                    </AccordionItem>
                    <hr className="mx-7 border-dashed group-last:hidden peer-data-[state=open]:opacity-0" />
                  </div>
                ))}
              </Accordion>

              <p className="text-muted-foreground mt-6 px-8">
                Still have questions?{' '}
                <Link
                  href="mailto:filippo.pedrazzini@joandko.io"
                  className="text-primary font-medium hover:underline"
                >
                  Contact our team
                </Link>
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 sm:py-32 pb-12 sm:pb-24 bg-muted/50 dark:bg-transparent">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="max-w-6xl mx-auto">
            <motion.div
              className="text-center"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <div className="mb-6 sm:mb-8 flex justify-center">
                <Badge
                  variant="outline"
                  className="px-2 sm:px-3 py-1 text-xs font-mono bg-emerald-500/10 border-emerald-500/20 text-emerald-600 hover:bg-emerald-500/20 hover:border-emerald-500/40 transition-all duration-300 cursor-default relative overflow-hidden"
                >
                  <motion.div
                    className="absolute inset-0 -top-1 -bottom-1 bg-linear-to-r from-transparent via-white/20 to-transparent"
                    initial={{ x: '-100%' }}
                    animate={{ x: '200%' }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      repeatDelay: 3,
                      ease: 'easeInOut',
                    }}
                  />
                  <Phone className="w-3 h-3 mr-1" />
                  Ready to Ship?
                </Badge>
              </div>

              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-3 sm:mb-4 font-mono">
                Stop Compromising on Quality or Speed
              </h2>

              <p className="text-base sm:text-lg text-muted-foreground mb-8 sm:mb-12 font-sans px-2 max-w-2xl mx-auto">
                Schedule a call to see how Kosuke delivers agency-level quality at AI platform
                prices.
              </p>

              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
                <Button
                  size="lg"
                  className="w-full sm:w-auto px-6 sm:px-8 py-3 font-mono bg-primary hover:bg-primary/90"
                  onClick={handleScheduleCall}
                >
                  <Calendar className="mr-2 h-4 w-4" />
                  Schedule a Call
                </Button>
              </div>
            </motion.div>
          </div>
        </div>
      </section>
    </div>
  );
}
