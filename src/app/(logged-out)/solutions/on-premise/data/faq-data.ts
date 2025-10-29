export const faqItems = [
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
