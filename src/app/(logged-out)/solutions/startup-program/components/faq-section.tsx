'use client';

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

export const faqItems = [
  {
    id: 'item-1',
    question: 'What types of ideas do you accept?',
    answer:
      'We focus on tech-enabled businesses with clear market potential. This includes SaaS, marketplaces, fintech, healthcare, e-commerce, and education technology. We evaluate each idea based on market opportunity, founder commitment, and technical feasibility.',
  },
  {
    id: 'item-2',
    question: 'What does "free" mean exactly?',
    answer:
      'Zero upfront cost means you pay nothing to get started. For accepted ventures, we build your MVP at no initial charge. We then work out flexible equity or revenue-sharing arrangements that align our success with yours.',
  },
  {
    id: 'item-3',
    question: 'How long does the review process take?',
    answer:
      "Our team typically reviews applications within 5 business days. If your idea is a good fit, we'll schedule a call to discuss details, timeline, and partnership terms. The entire onboarding process usually takes 1-2 weeks.",
  },
  {
    id: 'item-4',
    question: 'What happens after the MVP is built?',
    answer:
      "This is defined on a project-by-project basis. Some ventures continue with us as their technical partner for ongoing development and scaling. Others prefer to take the codebase and build an internal team. We're flexible and adapt to your needs.",
  },
  {
    id: 'item-5',
    question: 'Do you take equity in my company?',
    answer:
      "Terms are negotiated individually based on project scope and commitment level. We offer both equity and revenue-sharing models. Our goal is to create win-win arrangements that give you maximum flexibility while ensuring we're invested in your success.",
  },
  {
    id: 'item-6',
    question: 'What tech stack do you use?',
    answer:
      'We primarily work with modern, scalable stacks: Next.js/React for frontend, Node.js/Python for backend, PostgreSQL for databases, and deploy on Vercel or AWS. We can adapt to your specific requirements while maintaining best practices.',
  },
  {
    id: 'item-7',
    question: 'Can I bring my own designer?',
    answer:
      "Absolutely! If you have a designer or design specs ready, we'll work with them to build exactly what you envision. If not, we can provide UI/UX design as part of the MVP development process.",
  },
  {
    id: 'item-8',
    question: 'What if I need changes after launch?',
    answer:
      "We provide ongoing support for all ventures we build. Whether it's bug fixes, feature additions, or scaling infrastructure, we're here to help. Support terms are defined in our partnership agreement and tailored to each project.",
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
              Everything you need to know about our startup program.
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
