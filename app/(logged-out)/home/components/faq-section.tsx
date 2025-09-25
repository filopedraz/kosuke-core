'use client';

import { Card, CardContent } from '@/components/ui/card';
import { AnimatePresence, motion } from 'framer-motion';
import { Minus, Plus } from 'lucide-react';
import { useState } from 'react';

const faqs = [
  {
    id: 1,
    question: 'Do I need to code?',
    answer:
      'No. Most of our first users “know the basics” but hate endless code fixing and debugging. Focus on ideas; we take care of the hard parts.',
  },
  {
    id: 2,
    question: 'What if something breaks?',
    answer: 'Report it. A real engineer solves it or tells you honestly what’s possible.',
  },
  {
    id: 3,
    question: 'Will you lock me in or hide limits?',
    answer: 'No. You own your stuff, you see the process, no resource surprises.',
  },
];

const FAQItem = ({
  faq,
  isOpen,
  onToggle,
}: {
  faq: (typeof faqs)[0];
  isOpen: boolean;
  onToggle: () => void;
}) => {
  return (
    <Card className="border border-border/50 bg-card/30 hover:bg-card/50 transition-all duration-300 py-0">
      <CardContent className="p-0">
        <button
          onClick={onToggle}
          className="w-full p-4 sm:p-5 text-left flex items-center justify-between hover:bg-muted/20 transition-colors duration-200 rounded-lg"
        >
          <h3 className="text-base sm:text-lg font-semibold font-mono pr-4">{faq.question}</h3>
          <div className="flex-shrink-0 p-1 rounded-full bg-emerald-500/10 text-emerald-500">
            {isOpen ? <Minus className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          </div>
        </button>

        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
              className="overflow-hidden"
            >
              <div className="px-4 sm:px-5 pb-4 sm:pb-5">
                <div className="h-px mb-3 sm:mb-4" />
                <p className="text-sm sm:text-base text-muted-foreground font-sans leading-relaxed">
                  {faq.answer}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
};

export function FAQSection() {
  const [openItems, setOpenItems] = useState<number[]>([]);

  const toggleItem = (id: number) => {
    setOpenItems(prev => (prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]));
  };

  return (
    <section className="py-16 sm:py-32">
      <div className="container mx-auto px-4 sm:px-6 max-w-4xl">
        <motion.div
          className="text-center mb-12 sm:mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-3 sm:mb-4 font-mono">
            FAQs
          </h2>
          <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto font-sans px-2">
            Everything you need to know about Kosuke platform.
          </p>
        </motion.div>

        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <motion.div
              key={faq.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
            >
              <FAQItem
                faq={faq}
                isOpen={openItems.includes(faq.id)}
                onToggle={() => toggleItem(faq.id)}
              />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
