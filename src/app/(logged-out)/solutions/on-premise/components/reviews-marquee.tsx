'use client';

import { Marquee } from '@/components/ui/marquee';
import { cn } from '@/lib/utils';
import Image from 'next/image';

const reviews = [
  {
    name: 'Thomas',
    username: '@thomas_ciso',
    body: 'Full AI capabilities without data leaving our network. Security team approved immediately.',
    img: 'https://avatar.vercel.sh/thomas',
  },
  {
    name: 'Rebecca',
    username: '@rebecca_vp',
    body: 'Mac Studio deployment was seamless. No GPU provisioning headaches in our data center.',
    img: 'https://avatar.vercel.sh/rebecca',
  },
  {
    name: 'Ahmed',
    username: '@ahmed_infra',
    body: 'Open-source platform means no vendor lock-in. We own the entire stack.',
    img: 'https://avatar.vercel.sh/ahmed',
  },
  {
    name: 'Julia',
    username: '@julia_compliance',
    body: 'HIPAA compliance maintained. Patient data never touches external servers.',
    img: 'https://avatar.vercel.sh/julia',
  },
  {
    name: 'Victor',
    username: '@victor_eng',
    body: 'Vibe coding power with complete control. This is what enterprise teams needed.',
    img: 'https://avatar.vercel.sh/victor',
  },
  {
    name: 'Sophie',
    username: '@sophie_devops',
    body: 'Integration with our existing infrastructure was straightforward. Works perfectly.',
    img: 'https://avatar.vercel.sh/sophie',
  },
  {
    name: 'Daniel',
    username: '@daniel_security',
    body: 'Air-gapped deployment option sealed the deal. Maximum security for sensitive projects.',
    img: 'https://avatar.vercel.sh/daniel',
  },
  {
    name: 'Olivia',
    username: '@olivia_architect',
    body: 'Custom deployment architecture fit our exact needs. Professional assessment was thorough.',
    img: 'https://avatar.vercel.sh/olivia',
  },
  {
    name: 'Nathan',
    username: '@nathan_lead',
    body: 'Academy training got our team productive fast. Support during rollout was excellent.',
    img: 'https://avatar.vercel.sh/nathan',
  },
  {
    name: 'Grace',
    username: '@grace_privacy',
    body: "EU data residency requirements met. Finally a vibe coding solution that doesn't compromise.",
    img: 'https://avatar.vercel.sh/grace',
  },
  {
    name: 'Isaac',
    username: '@isaac_tech',
    body: "Enterprise-grade hardware, zero compromises on AI capabilities. It's the best of both worlds.",
    img: 'https://avatar.vercel.sh/isaac',
  },
  {
    name: 'Clara',
    username: '@clara_director',
    body: 'Board approved within a week. Self-hosted solution removed all their concerns.',
    img: 'https://avatar.vercel.sh/clara',
  },
];

const firstRow = reviews.slice(0, reviews.length / 2);
const secondRow = reviews.slice(reviews.length / 2);

const ReviewCard = ({
  img,
  name,
  username,
  body,
}: {
  img: string;
  name: string;
  username: string;
  body: string;
}) => {
  return (
    <figure
      className={cn(
        'relative h-full w-64 cursor-pointer overflow-hidden rounded-xl border p-4',
        // light styles
        'border-border bg-card/50 hover:bg-card/80',
        // dark styles
        'dark:border-border dark:bg-card/50 dark:hover:bg-card/80'
      )}
    >
      <div className="flex flex-row items-center gap-2">
        <Image className="rounded-full" width={32} height={32} alt="" src={img} />
        <div className="flex flex-col">
          <figcaption className="text-sm font-medium text-foreground">{name}</figcaption>
          <p className="text-xs font-medium text-muted-foreground">{username}</p>
        </div>
      </div>
      <blockquote className="mt-2 text-sm">{body}</blockquote>
    </figure>
  );
};

export function ReviewsMarquee() {
  return (
    <section className="py-12 sm:py-20 bg-background">
      <div className="container mx-auto px-8 sm:px-12 md:px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-3 sm:mb-4">
              Enterprise Trusted
            </h2>
            <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto font-sans px-2">
              See what enterprise leaders are saying about Kosuke
            </p>
          </div>

          <div className="relative flex w-full flex-col items-center justify-center overflow-hidden">
            <Marquee pauseOnHover className="[--duration:20s]">
              {firstRow.map(review => (
                <ReviewCard key={review.username} {...review} />
              ))}
            </Marquee>
            <Marquee reverse pauseOnHover className="[--duration:20s]">
              {secondRow.map(review => (
                <ReviewCard key={review.username} {...review} />
              ))}
            </Marquee>
            <div className="from-background pointer-events-none absolute inset-y-0 left-0 w-1/4 bg-linear-to-r"></div>
            <div className="from-background pointer-events-none absolute inset-y-0 right-0 w-1/4 bg-linear-to-l"></div>
          </div>
        </div>
      </div>
    </section>
  );
}
