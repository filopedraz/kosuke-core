'use client';

import { AnimatedList } from '@/components/ui/animated-list';
import { AuroraText } from '@/components/ui/aurora-text';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { Calendar, Check, Code, GitPullRequest, Rocket, Sparkles } from 'lucide-react';

interface Activity {
  name: string;
  action: string;
  icon: React.ReactNode;
  color: string;
  time: string;
  status: 'deployed' | 'merged' | 'in-progress';
}

let activities: Activity[] = [
  {
    name: 'Sarah Chen',
    action: 'deployed authentication feature',
    icon: <Rocket className="w-4 h-4" />,
    color: '#10B981',
    time: 'Just now',
    status: 'deployed',
  },
  {
    name: 'Mike Johnson',
    action: 'merged dashboard improvements',
    icon: <GitPullRequest className="w-4 h-4" />,
    color: '#3B82F6',
    time: '2m ago',
    status: 'merged',
  },
  {
    name: 'Alex Rivera',
    action: 'shipped payment integration',
    icon: <Rocket className="w-4 h-4" />,
    color: '#10B981',
    time: '5m ago',
    status: 'deployed',
  },
  {
    name: 'Emma Wilson',
    action: 'committed API optimizations',
    icon: <Code className="w-4 h-4" />,
    color: '#F59E0B',
    time: '8m ago',
    status: 'in-progress',
  },
  {
    name: 'James Park',
    action: 'deployed mobile responsive fixes',
    icon: <Rocket className="w-4 h-4" />,
    color: '#10B981',
    time: '12m ago',
    status: 'deployed',
  },
];

// Duplicate activities to create looping effect
activities = Array.from({ length: 10 }, () => activities).flat();

const ActivityItem = ({ name, action, icon, color, time, status }: Activity) => {
  return (
    <figure
      className={cn(
        'relative mx-auto min-h-fit w-full max-w-[400px] cursor-default overflow-hidden rounded-xl p-3 sm:p-4',
        'transition-all duration-200 ease-in-out',
        'bg-card/50 border border-border/50 backdrop-blur-sm',
        'hover:bg-card/80'
      )}
    >
      <div className="flex flex-row items-center gap-3">
        <div
          className="flex size-9 sm:size-10 items-center justify-center rounded-lg text-white"
          style={{ backgroundColor: color }}
        >
          {icon}
        </div>
        <div className="flex flex-col overflow-hidden flex-1">
          <div className="flex flex-row items-center gap-2">
            <figcaption className="text-xs sm:text-sm font-semibold">{name}</figcaption>
            <Badge
              variant="outline"
              className={cn(
                'px-1.5 py-0 text-[10px]',
                status === 'deployed' && 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600',
                status === 'merged' && 'bg-blue-500/10 border-blue-500/30 text-blue-600',
                status === 'in-progress' && 'bg-amber-500/10 border-amber-500/30 text-amber-600'
              )}
            >
              {status === 'deployed' && (
                <>
                  <Check className="w-2 h-2 mr-0.5" />
                  Deployed
                </>
              )}
              {status === 'merged' && 'Merged'}
              {status === 'in-progress' && 'In Progress'}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">{action}</p>
        </div>
        <span className="text-xs text-muted-foreground whitespace-nowrap">{time}</span>
      </div>
    </figure>
  );
};

export function HeroSection() {
  const handleScheduleCall = () => {
    window.open('https://form.typeform.com/to/A6zJtlUM', '_blank');
  };

  return (
    <section className="pt-12 sm:pt-14 md:pt-16 lg:pt-20 pb-12 sm:pb-14 md:pb-20 lg:pb-32">
      <div className="container mx-auto px-8 sm:px-12 md:px-6">
        <div className="max-w-7xl mx-auto">
          {/* Two Column Layout */}
          <div className="grid md:grid-cols-2 gap-8 md:gap-12 lg:gap-16 items-center">
            {/* Left Column - Content */}
            <motion.div
              className="space-y-4 md:space-y-5 lg:space-y-6 md:pr-6 lg:pr-8"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              {/* Badge */}
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: 0.3 }}
              >
                <Badge
                  variant="outline"
                  className="mb-0 sm:mb-0 px-2 sm:px-3 py-1 text-xs font-mono bg-emerald-500/10 border-emerald-500/20 text-emerald-600 hover:bg-emerald-500/20 hover:border-emerald-500/40 transition-all duration-300 cursor-default relative overflow-hidden"
                >
                  <motion.div
                    className="absolute inset-0 -top-1 -bottom-1 bg-linear-to-r from-transparent via-white/20 to-transparent"
                    initial={{ x: '-100%' }}
                    animate={{ x: '200%' }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      repeatDelay: 3,
                      ease: 'easeInOut',
                    }}
                  />
                  <Sparkles className="w-3 h-3 mr-1" />
                  Enterprise-Ready Development
                </Badge>
              </motion.div>

              {/* Main Headline */}
              <h1 className="text-3xl sm:text-[2rem] md:text-4xl lg:text-6xl font-bold leading-tight sm:leading-tight tracking-tight">
                Ship with{' '}
                <AuroraText colors={['#10B981', '#22c55e', '#34D399', '#059669']}>
                  Engineers
                </AuroraText>
                , <br />
                at the Price of Vibe Coding.
              </h1>

              {/* Subheadline */}
              <p className="text-base md:text-lg lg:text-xl text-muted-foreground font-sans leading-relaxed">
                Get dedicated senior engineers building production-ready software for your startup.
                Real accountability, transparent pricing, and shipped products—not endless
                prototypes.
              </p>

              {/* CTA */}
              <motion.div
                className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-2 sm:pt-3 items-center justify-center md:items-start md:justify-start"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.6 }}
              >
                <Button
                  size="lg"
                  className="w-full sm:w-auto px-6 sm:px-8 py-3 font-mono bg-primary hover:bg-primary/90"
                  onClick={handleScheduleCall}
                >
                  <Calendar className="mr-2 h-4 w-4" />
                  Schedule a Call
                </Button>
              </motion.div>
            </motion.div>

            {/* Right Column - Activity Feed Animation */}
            <motion.div
              className="relative h-[400px] md:h-[500px] lg:h-[550px] flex flex-col"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
            >
              {/* Animated Activity Feed */}
              <div className="flex-1 relative overflow-hidden">
                <AnimatedList delay={1500}>
                  {activities.map((activity, idx) => (
                    <ActivityItem {...activity} key={idx} />
                  ))}
                </AnimatedList>

                {/* Gradient fade at bottom */}
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-linear-to-t from-background to-transparent" />
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
