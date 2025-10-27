import { Lightbulb, Rocket, Target, TrendingUp } from 'lucide-react';
import { Metadata } from 'next';

import { SolutionPageLayout } from '../components/solution-page-layout';

export const metadata: Metadata = {
  title: 'Venture Builder | Kosuke Solutions',
  description:
    'Accelerate your venture building process with AI-powered tools for rapid prototyping and validation.',
};

export default function VentureBuilderPage() {
  const benefits = [
    {
      title: 'Rapid Prototyping',
      description: 'Go from idea to working prototype in hours, not weeks.',
    },
    {
      title: 'Cost Efficient',
      description: 'Build and validate ideas without large upfront engineering costs.',
    },
    {
      title: 'Multiple Projects',
      description: 'Work on multiple venture ideas simultaneously with isolated environments.',
    },
    {
      title: 'Quick Pivots',
      description: 'Pivot and iterate quickly based on market feedback and validation.',
    },
    {
      title: 'Technical Validation',
      description: 'Validate technical feasibility before committing significant resources.',
    },
    {
      title: 'Investor Ready',
      description: 'Create compelling demos and prototypes to show investors and stakeholders.',
    },
  ];

  const features = [
    {
      title: 'Idea to MVP',
      description:
        'Transform ideas into working MVPs faster than ever. AI helps you build, test, and iterate on your vision rapidly.',
      icon: <Lightbulb className="h-8 w-8" />,
    },
    {
      title: 'Market Validation',
      description:
        'Get real products in front of users quickly. Test hypotheses and gather feedback before scaling.',
      icon: <Target className="h-8 w-8" />,
    },
    {
      title: 'Scale When Ready',
      description:
        'Start with rapid prototypes, scale to production-ready applications when you find product-market fit.',
      icon: <TrendingUp className="h-8 w-8" />,
    },
    {
      title: 'Launch Fast',
      description:
        'Deploy and launch new ventures quickly. Get to market before competitors with AI-accelerated development.',
      icon: <Rocket className="h-8 w-8" />,
    },
  ];

  return (
    <SolutionPageLayout
      subtitle="Solutions"
      title="Venture Builder"
      description="Accelerate your venture building process with AI-powered tools for rapid prototyping and validation. Perfect for venture studios, incubators, and entrepreneurs building multiple products."
      benefits={benefits}
      features={features}
      ctaTitle="Ready to build your next venture?"
      ctaDescription="Join successful venture builders using Kosuke to launch products faster and validate ideas efficiently."
    />
  );
}
