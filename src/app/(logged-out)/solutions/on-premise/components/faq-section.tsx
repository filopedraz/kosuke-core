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
      "Kosuke runs on standard Kubernetes clusters. You'll need compute resources (CPU/RAM based on team size), storage for code and artifacts, and network connectivity. We provide detailed specs during implementation planning.",
  },
  {
    id: 'item-2',
    question: 'How do updates and new features work with on-premise deployment?',
    answer:
      'You control when to update. We release quarterly updates with new features and security patches. You can test updates in staging before rolling to production, ensuring zero disruption to your team.',
  },
  {
    id: 'item-3',
    question: 'Can we customize Kosuke for our specific needs?',
    answer:
      'Absolutely. Being open-source, you have full access to the codebase. We also offer professional services to help implement custom integrations, workflows, and features specific to your organization.',
  },
  {
    id: 'item-4',
    question: 'What kind of support do you provide for on-premise installations?',
    answer:
      'We offer tiered support: basic (community forums), standard (email support, SLA), and premium (dedicated support engineer, Slack access, custom development). All on-premise licenses include implementation assistance.',
  },
  {
    id: 'item-5',
    question: 'How does licensing work for on-premise deployments?',
    answer:
      'We offer per-seat annual licenses with unlimited usage within your infrastructure. No hidden fees, no usage-based billing. Price includes updates, security patches, and support based on your tier.',
  },
  {
    id: 'item-6',
    question: 'Is the on-premise version feature-complete compared to cloud?',
    answer:
      'Yes. The on-premise version includes all features available in our cloud offering. The only difference is where it runs—your infrastructure vs. ours. You get the same AI capabilities, workflows, and integrations.',
  },
  {
    id: 'item-7',
    question: 'What compliance certifications does Kosuke support?',
    answer:
      'We provide documentation and architecture guidelines for SOC 2, ISO 27001, HIPAA, and GDPR compliance. Since you control the deployment, you can configure Kosuke to meet your specific compliance requirements.',
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
