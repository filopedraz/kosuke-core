'use client';

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

const faqItems = [
  {
    id: 'item-1',
    question: 'Can non-technical team members really build production-ready features?',
    answer:
      'Yes. Kosuke translates natural language requirements into production code, with engineers reviewing every change. Non-technical team members focus on the "what," while our system and engineers handle the "how."',
  },
  {
    id: 'item-2',
    question: 'How do you maintain code quality when non-developers are building?',
    answer:
      'Every feature goes through automated quality checks and senior engineer review before deployment. Engineers maintain architectural standards, handle complex integrations, and ensure best practices—non-technical members just drive the features.',
  },
  {
    id: 'item-3',
    question: 'What if non-technical members break something?',
    answer:
      'All changes go through staging environments and approval workflows before reaching production. Engineers have full visibility and can reject or modify changes. Think of it as pull request reviews, but for business requirements.',
  },
  {
    id: 'item-4',
    question: "Won't this create chaos with too many people making changes?",
    answer:
      'Not at all. We implement proper access controls, approval workflows, and change management. Engineers define guardrails and policies that ensure changes align with technical standards and business logic.',
  },
  {
    id: 'item-5',
    question: 'What types of features can non-technical members build?',
    answer:
      'UI changes, new pages, forms, content updates, simple workflows, and business logic adjustments. Complex architecture, integrations, performance optimization, and security features still require engineers.',
  },
  {
    id: 'item-6',
    question: 'How long does it take to onboard non-technical team members?',
    answer:
      'Usually 1-2 days. We provide guided training sessions and documentation. Most team members start shipping simple features within their first week and build confidence quickly.',
  },
];

export function FAQSection() {
  return (
    <section className="py-16 md:py-24">
      <div className="container mx-auto px-8 sm:px-12 md:px-6">
        <div className="max-w-6xl mx-auto">
          <div className="mx-auto max-w-xl text-center mb-12 sm:mb-16">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-3 sm:mb-4 font-mono">
              Frequently Asked Questions
            </h2>
            <p className="text-base sm:text-lg text-muted-foreground max-w-3xl mx-auto font-sans px-2">
              Everything you need to know about empowering your entire team.
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
              <a
                href="https://links.kosuke.ai/contact"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary font-medium hover:underline"
              >
                Contact our team
              </a>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
