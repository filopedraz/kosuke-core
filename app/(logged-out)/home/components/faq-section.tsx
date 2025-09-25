'use client';

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import Link from 'next/link';

export function FAQSection() {
  const faqItems = [
    {
      id: 'item-1',
      question: 'Do I need to code?',
      answer:
        'No. Most of our first users "know the basics" but hate endless code fixing and debugging. Focus on ideas; we take care of the hard parts.',
    },
    {
      id: 'item-2',
      question: 'What if something breaks?',
      answer: "Report it. A real engineer solves it or tells you honestly what's possible.",
    },
    {
      id: 'item-3',
      question: 'Will you lock me in or hide limits?',
      answer: 'No. You own your stuff, you see the process, no resource surprises.',
    },
    {
      id: 'item-4',
      question: 'How do I get started?',
      answer:
        "Simply sign up for early access and we'll guide you through building your first project. No technical setup required - just bring your ideas.",
    },
    {
      id: 'item-5',
      question: 'What kind of projects can I build?',
      answer:
        'Web applications, mobile apps, APIs, and more. Our platform handles the infrastructure so you can focus on creating amazing user experiences.',
    },
  ];

  return (
    <section className="py-16 md:py-24">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <div className="mx-auto max-w-xl text-center">
            <h2 className="text-balance text-3xl font-bold md:text-4xl lg:text-5xl">
              Frequently Asked Questions
            </h2>
            <p className="text-muted-foreground mt-4 text-balance">
              Discover quick and comprehensive answers to common questions about our platform,
              services, and features.
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
              Can&apos;t find what you&apos;re looking for? Contact our{' '}
              <Link
                href="mailto:filippo.pedrazzini@joandko.io"
                className="text-primary font-medium hover:underline"
              >
                customer support team
              </Link>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
