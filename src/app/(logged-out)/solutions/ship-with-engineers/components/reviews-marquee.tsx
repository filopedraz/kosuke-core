'use client';

import { Marquee } from '@/components/ui/marquee';
import { cn } from '@/lib/utils';
import Image from 'next/image';

const reviews = [
  {
    name: 'Carlos',
    username: '@carlos_ceo',
    body: 'Senior engineers built our v1 in 6 weeks. Would have taken us 6 months to hire and build.',
    img: 'https://avatar.vercel.sh/carlos',
  },
  {
    name: 'Sophia',
    username: '@sophia_startup',
    body: 'Fixed price, no surprises. They delivered exactly what they promised on time.',
    img: 'https://avatar.vercel.sh/sophia',
  },
  {
    name: 'Michael',
    username: '@michael_founder',
    body: "Got stuck once, but Kosuke's engineers unblocked me immediately. Support is incredible.",
    img: 'https://avatar.vercel.sh/michael',
  },
  {
    name: 'Anna',
    username: '@anna_builder',
    body: 'Professional security review before launch gave me peace of mind. Worth every penny.',
    img: 'https://avatar.vercel.sh/anna',
  },
  {
    name: 'Jake',
    username: '@jake_ideas',
    body: "Real accountability. These aren't contractors disappearing - they actually care about the outcome.",
    img: 'https://avatar.vercel.sh/jake',
  },
  {
    name: 'Nina',
    username: '@nina_product',
    body: 'After v1 launch, I continued building myself with their platform. Seamless transition.',
    img: 'https://avatar.vercel.sh/nina',
  },
  {
    name: 'Omar',
    username: '@omar_tech',
    body: 'Production-ready code from day one. No technical debt to clean up later.',
    img: 'https://avatar.vercel.sh/omar',
  },
  {
    name: 'Elena',
    username: '@elena_mvp',
    body: 'The transparent pricing model is refreshing. No hidden costs, no scope creep charges.',
    img: 'https://avatar.vercel.sh/elena',
  },
  {
    name: 'Ben',
    username: '@ben_saas',
    body: 'Weekly previews kept me in the loop. Felt like they were part of my team, not external.',
    img: 'https://avatar.vercel.sh/ben',
  },
  {
    name: 'Aria',
    username: '@aria_launch',
    body: 'Human engineers at vibe coding prices. This is the missing piece for early startups.',
    img: 'https://avatar.vercel.sh/aria',
  },
  {
    name: 'Lucas',
    username: '@lucas_app',
    body: 'They helped define requirements I missed. Technical assessment saved us from mistakes.',
    img: 'https://avatar.vercel.sh/lucas',
  },
  {
    name: 'Mia',
    username: '@mia_venture',
    body: "Finally shipped our idea instead of spending months recruiting. Can't recommend enough.",
    img: 'https://avatar.vercel.sh/mia',
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
              Loved by Founders
            </h2>
            <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto font-sans px-2">
              See what founders are saying about shipping with dedicated engineers
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
