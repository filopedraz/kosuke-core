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
    question: 'How is this different from hiring freelancers or contractors?',
    answer:
      'Unlike freelancers who work in isolation, our engineers integrate with your team and take full ownership. You get dedicated senior engineers who understand your product, not just task executors. Plus, we handle vetting, management, and quality control.',
  },
  {
    id: 'item-2',
    question: 'What level of engineers will work on my project?',
    answer:
      'Only senior engineers with 5+ years of production experience. No juniors, no interns. Every engineer has shipped real products and knows how to navigate complex technical decisions.',
  },
  {
    id: 'item-3',
    question: 'How quickly can you start working on my project?',
    answer:
      'Typically within 3-5 business days. After our initial call, we match you with engineers who have relevant experience in your tech stack, complete onboarding, and start shipping.',
  },
  {
    id: 'item-4',
    question: 'Do I own the code? Can I take it elsewhere?',
    answer:
      'Absolutely. Your code lives in your own repository from day one. No vendor lock-in, no proprietary frameworks. You have complete ownership and can continue development independently at any time.',
  },
  {
    id: 'item-5',
    question: 'How do you ensure code quality and best practices?',
    answer:
      'Every commit goes through peer review by senior engineers. We follow industry-standard practices: comprehensive testing, clean architecture, proper documentation, and scalable patterns. Your codebase will be maintainable long-term.',
  },
  {
    id: 'item-6',
    question: "What if the engineers don't work out for my project?",
    answer:
      "We offer flexible engagement terms. If you're not satisfied, we can switch engineers or pause the engagement. Our goal is to deliver value—if we're not, we make it right or part ways professionally.",
  },
];

export function FAQSection() {
  return (
    <section className="py-16 md:py-24">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <div className="mx-auto max-w-xl text-center mb-12">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-3 sm:mb-4 font-mono">
              Frequently Asked Questions
            </h2>
            <p className="text-base sm:text-lg text-muted-foreground max-w-3xl mx-auto font-sans px-2">
              Everything you need to know about shipping with engineers.
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
