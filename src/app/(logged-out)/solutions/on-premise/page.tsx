import { Key, Lock, Server, Shield } from 'lucide-react';
import { Metadata } from 'next';

import { SolutionPageLayout } from '../components/solution-page-layout';

export const metadata: Metadata = {
  title: 'On-Premise Deployment | Kosuke Solutions',
  description:
    'Deploy Kosuke in your own infrastructure with complete control over your data and security.',
};

export default function OnPremisePage() {
  const benefits = [
    {
      title: 'Complete Data Control',
      description:
        'Keep all your code, data, and intellectual property within your own infrastructure.',
    },
    {
      title: 'Enhanced Security',
      description: 'Meet strict security and compliance requirements with on-premise deployment.',
    },
    {
      title: 'Custom Configuration',
      description: 'Configure Kosuke to match your specific infrastructure and security policies.',
    },
    {
      title: 'Network Isolation',
      description: 'Run Kosuke in air-gapped or isolated network environments.',
    },
    {
      title: 'Performance Optimization',
      description: 'Optimize performance by running close to your existing systems and databases.',
    },
    {
      title: 'Compliance Ready',
      description: 'Meet regulatory requirements like GDPR, HIPAA, and SOC 2 with ease.',
    },
  ];

  const features = [
    {
      title: 'Self-Hosted Infrastructure',
      description:
        'Deploy Kosuke on your own servers, cloud infrastructure, or on-premise data centers. Full control over your deployment.',
      icon: <Server className="h-8 w-8" />,
    },
    {
      title: 'Enterprise Security',
      description:
        'Built-in support for SSO, LDAP, custom authentication, and advanced security policies. Your security, your rules.',
      icon: <Shield className="h-8 w-8" />,
    },
    {
      title: 'Data Encryption',
      description:
        'End-to-end encryption for all data at rest and in transit. Your code never leaves your infrastructure.',
      icon: <Lock className="h-8 w-8" />,
    },
    {
      title: 'Access Control',
      description:
        'Granular permissions and role-based access control. Integrate with your existing identity management systems.',
      icon: <Key className="h-8 w-8" />,
    },
  ];

  return (
    <SolutionPageLayout
      subtitle="Solutions"
      title="On-Premise Deployment"
      description="Deploy Kosuke in your own infrastructure with complete control over your data, security, and compliance. Perfect for enterprises with strict security requirements or regulated industries."
      benefits={benefits}
      features={features}
      ctaTitle="Ready for enterprise-grade security?"
      ctaDescription="Contact us to discuss your on-premise deployment requirements and get a custom solution."
    />
  );
}
