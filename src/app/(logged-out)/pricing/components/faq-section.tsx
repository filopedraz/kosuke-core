'use client';

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import Link from 'next/link';

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

export function FAQSection() {
  return (
    <section className="py-12 md:py-24">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <div className="mx-auto max-w-xl text-center mb-8 sm:mb-12">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-3 sm:mb-4 font-mono">
              Frequently Asked Questions
            </h2>
            <p className="text-base sm:text-lg text-muted-foreground max-w-3xl mx-auto font-sans px-2">
              The honest answers to questions others avoid.
            </p>
          </div>

          <div className="mx-auto mt-8 sm:mt-12 max-w-xl">
            <Accordion
              type="single"
              collapsible
              className="bg-muted dark:bg-muted/50 w-full rounded-2xl p-1"
            >
              {faqItems.map(item => (
                <div className="group" key={item.id}>
                  <AccordionItem
                    value={item.id}
                    className="data-[state=open]:bg-card dark:data-[state=open]:bg-muted peer rounded-xl border-none px-4 sm:px-7 py-1 data-[state=open]:border-none data-[state=open]:shadow-sm"
                  >
                    <AccordionTrigger className="cursor-pointer text-sm sm:text-base hover:no-underline">
                      {item.question}
                    </AccordionTrigger>
                    <AccordionContent>
                      <p className="text-sm sm:text-base">{item.answer}</p>
                    </AccordionContent>
                  </AccordionItem>
                  <hr className="mx-4 sm:mx-7 border-dashed group-last:hidden peer-data-[state=open]:opacity-0" />
                </div>
              ))}
            </Accordion>

            <p className="text-muted-foreground text-sm sm:text-base mt-6 px-4 sm:px-8">
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
  );
}
