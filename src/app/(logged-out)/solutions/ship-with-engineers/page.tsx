import { Code, GitBranch, Users, Zap } from 'lucide-react';
import { Metadata } from 'next';

import { SolutionPageLayout } from '../components/solution-page-layout';

export const metadata: Metadata = {
  title: 'Ship with Engineers | Kosuke Solutions',
  description:
    'Empower your engineering team to ship faster with AI-powered development tools that enhance collaboration and productivity.',
};

export default function ShipWithEngineersPage() {
  const benefits = [
    {
      title: 'Faster Development',
      description: 'Ship features 10x faster with AI-assisted coding and automated workflows.',
    },
    {
      title: 'Better Quality',
      description: 'AI-powered code reviews and testing ensure high-quality, maintainable code.',
    },
    {
      title: 'Team Collaboration',
      description: 'Real-time collaboration features keep your team aligned and productive.',
    },
    {
      title: 'Reduced Tech Debt',
      description: 'Proactive suggestions and automated refactoring help maintain clean codebases.',
    },
    {
      title: 'Seamless Integration',
      description: 'Works with your existing tools and workflows without disruption.',
    },
    {
      title: 'Continuous Learning',
      description: 'AI learns from your codebase and team patterns for better suggestions.',
    },
  ];

  const features = [
    {
      title: 'AI-Powered Code Generation',
      description:
        'Generate production-ready code from natural language descriptions. Our AI understands context and best practices to create maintainable, efficient code.',
      icon: <Code className="h-8 w-8" />,
    },
    {
      title: 'Real-time Collaboration',
      description:
        'Work together with your team in real-time. See changes as they happen, share context, and build faster together.',
      icon: <Users className="h-8 w-8" />,
    },
    {
      title: 'Instant Previews',
      description:
        'See your changes come to life instantly with hot-reload previews. Test and iterate faster than ever before.',
      icon: <Zap className="h-8 w-8" />,
    },
    {
      title: 'Git Integration',
      description:
        'Seamlessly integrates with GitHub. Create branches, commits, and pull requests directly from the platform.',
      icon: <GitBranch className="h-8 w-8" />,
    },
  ];

  return (
    <SolutionPageLayout
      subtitle="Solutions"
      title="Ship with Engineers"
      description="Empower your engineering team to ship faster with AI-powered development tools that enhance collaboration and productivity. Build better products, reduce time to market, and maintain high code quality."
      benefits={benefits}
      features={features}
      ctaTitle="Ready to ship faster?"
      ctaDescription="Join forward-thinking engineering teams already using Kosuke to accelerate their development workflow."
    />
  );
}
