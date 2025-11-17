'use client';

import { Marquee } from '@/components/ui/marquee';
import { cn } from '@/lib/utils';
import Image from 'next/image';

const reviews = [
  {
    name: 'Alex',
    username: '@alex_dev',
    body: 'The human engineers unblocking me when stuck is exactly what Lovable was missing. Game changer.',
    img: 'https://avatar.vercel.sh/alex',
  },
  {
    name: 'Maya',
    username: '@maya_codes',
    body: 'Got stuck twice, Kosuke engineers helped me in minutes. So cheap and totally worth it.',
    img: 'https://avatar.vercel.sh/maya',
  },
  {
    name: 'Ryan',
    username: '@ryan_builds',
    body: "Haven't needed help yet, but knowing real engineers have my back makes me feel secure.",
    img: 'https://avatar.vercel.sh/ryan',
  },
  {
    name: 'Sofia',
    username: '@sofia_tech',
    body: 'Used human experts for final security checks before launch. So professional and thorough.',
    img: 'https://avatar.vercel.sh/sofia',
  },
  {
    name: 'David',
    username: '@david_creates',
    body: 'The peace of mind knowing I can get expert help anytime is priceless for my startup.',
    img: 'https://avatar.vercel.sh/david',
  },
  {
    name: 'Priya',
    username: '@priya_designs',
    body: 'Hit a wall with authentication. Engineer jumped in and fixed it in 10 mins. Incredible.',
    img: 'https://avatar.vercel.sh/priya',
  },
  {
    name: 'Marcus',
    username: '@marcus_dev',
    body: 'This is what every AI platform needs. Real humans when you need them most.',
    img: 'https://avatar.vercel.sh/marcus',
  },
  {
    name: 'Elena',
    username: '@elena_codes',
    body: 'Got stuck on deployment. Support engineer walked me through it.',
    img: 'https://avatar.vercel.sh/elena',
  },
  {
    name: 'Kevin',
    username: '@kevin_builds',
    body: 'Having experts review my code before production saved me from potential disasters.',
    img: 'https://avatar.vercel.sh/kevin',
  },
  {
    name: 'Zara',
    username: '@zara_tech',
    body: "Even when I don't need help, knowing it's there lets me build with confidence.",
    img: 'https://avatar.vercel.sh/zara',
  },
  {
    name: 'Ben',
    username: '@ben_creates',
    body: 'Complex database issue resolved by their team in under an hour. This support is unmatched.',
    img: 'https://avatar.vercel.sh/ben',
  },
  {
    name: 'Aria',
    username: '@aria_dev',
    body: 'The human touch when AI hits limits. This is the missing piece other platforms ignore.',
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
              Loved by Builders
            </h2>
            <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto font-sans px-2">
              See what first adopters are saying about building with Kosuke
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
