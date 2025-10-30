'use client';

import { Marquee } from '@/components/ui/marquee';
import { cn } from '@/lib/utils';
import Image from 'next/image';

const reviews = [
  {
    name: 'Alex',
    username: '@alex_dev',
    body: 'At first, it seemed easy… but correcting AI code wastes so much time.',
    img: 'https://avatar.vercel.sh/alex',
  },
  {
    name: 'Maya',
    username: '@maya_codes',
    body: "I'm unsure about product stability.",
    img: 'https://avatar.vercel.sh/maya',
  },
  {
    name: 'Ryan',
    username: '@ryan_builds',
    body: 'Not capable for large codebases.',
    img: 'https://avatar.vercel.sh/ryan',
  },
  {
    name: 'Sofia',
    username: '@sofia_tech',
    body: "Honestly they're all the same. Can't build anything meaningful.",
    img: 'https://avatar.vercel.sh/sofia',
  },
  {
    name: 'David',
    username: '@david_creates',
    body: 'I need something that builds apps without endless fixing.',
    img: 'https://avatar.vercel.sh/david',
  },
  {
    name: 'Priya',
    username: '@priya_designs',
    body: 'Spending more time debugging than actually building features.',
    img: 'https://avatar.vercel.sh/priya',
  },
  {
    name: 'Marcus',
    username: '@marcus_dev',
    body: 'The learning curve is steep and the results are inconsistent.',
    img: 'https://avatar.vercel.sh/marcus',
  },
  {
    name: 'Elena',
    username: '@elena_codes',
    body: 'AI tools promise a lot but deliver mediocre code quality.',
    img: 'https://avatar.vercel.sh/elena',
  },
  {
    name: 'Kevin',
    username: '@kevin_builds',
    body: 'Too many manual corrections needed. Not really saving time.',
    img: 'https://avatar.vercel.sh/kevin',
  },
  {
    name: 'Zara',
    username: '@zara_tech',
    body: 'Complex projects still require traditional development approaches.',
    img: 'https://avatar.vercel.sh/zara',
  },
  {
    name: 'Ben',
    username: '@ben_creates',
    body: 'The hype around AI coding tools is overblown. Reality is different.',
    img: 'https://avatar.vercel.sh/ben',
  },
  {
    name: 'Aria',
    username: '@aria_dev',
    body: 'I want to focus on ideas, not wrestling with generated code.',
    img: 'https://avatar.vercel.sh/aria',
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
              What you Told Us
            </h2>
            <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto font-sans px-2">
              Real Customer Voices concerning current Vibe Coding Platforms
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
