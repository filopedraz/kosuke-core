import { Clock, Eye, MessageSquare, Share2 } from 'lucide-react';
import { Metadata } from 'next';

import { SolutionPageLayout } from '../components/solution-page-layout';

export const metadata: Metadata = {
  title: 'Enabling Collaboration | Kosuke Solutions',
  description:
    'Break down silos and enable seamless collaboration between technical and non-technical team members.',
};

export default function EnablingCollaborationPage() {
  const benefits = [
    {
      title: 'Cross-functional Teams',
      description:
        'Enable designers, PMs, and engineers to work together seamlessly in one platform.',
    },
    {
      title: 'Real-time Communication',
      description:
        'Chat, share ideas, and provide feedback directly within the development environment.',
    },
    {
      title: 'Visual Feedback',
      description: 'Non-technical team members can review and comment on live previews.',
    },
    {
      title: 'Reduced Meetings',
      description:
        'Asynchronous collaboration reduces the need for constant status update meetings.',
    },
    {
      title: 'Faster Iterations',
      description: 'Quick feedback loops accelerate the iteration process.',
    },
    {
      title: 'Shared Context',
      description: 'Everyone has access to the same information and can see progress in real-time.',
    },
  ];

  const features = [
    {
      title: 'Interactive Previews',
      description:
        'Share live, interactive previews with stakeholders. No deployment needed - just send a link and gather feedback.',
      icon: <Eye className="h-8 w-8" />,
    },
    {
      title: 'Contextual Chat',
      description:
        'Discuss features, ask questions, and provide feedback directly in context. AI assists with technical questions.',
      icon: <MessageSquare className="h-8 w-8" />,
    },
    {
      title: 'Easy Sharing',
      description:
        'Share projects, features, and updates with a single click. Keep everyone in the loop effortlessly.',
      icon: <Share2 className="h-8 w-8" />,
    },
    {
      title: 'Session History',
      description:
        'Access complete development history. See what changed, when, and why with full context.',
      icon: <Clock className="h-8 w-8" />,
    },
  ];

  return (
    <SolutionPageLayout
      subtitle="Solutions"
      title="Enabling Collaboration"
      description="Break down silos and enable seamless collaboration between technical and non-technical team members. Get everyone on the same page with visual previews, contextual chat, and shared development environments."
      benefits={benefits}
      features={features}
      ctaTitle="Ready to collaborate better?"
      ctaDescription="Join teams that have transformed their workflow with better collaboration tools."
    />
  );
}
