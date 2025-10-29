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
    question: 'What are the infrastructure requirements for on-premise deployment?',
    answer:
      "No infrastructure requirements. We provide a pre-configured, high-performance Mac Studio that's plug-and-play, getting your team up and running in hours.",
  },
  {
    id: 'item-2',
    question: 'How do updates and new features work with on-premise deployment?',
    answer:
      'You control when to update. We release quarterly updates with new features and security patches. Admin users can update the Kosuke platform whenever they want.',
  },
  {
    id: 'item-3',
    question: 'Can we customize Kosuke for our specific needs?',
    answer:
      'Absolutely. We offer professional services to help implement custom integrations, workflows, and features specific to your organization.',
  },
  {
    id: 'item-5',
    question: 'How does licensing work for on-premise deployments?',
    answer:
      'Kosuke is an open-source project. You will only pay the on-premise service subscirption that includes the plug-and-play solution and our customer support.',
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
              Everything you need to know about on-premise deployment.
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
                href="https://form.typeform.com/to/A6zJtlUM"
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
