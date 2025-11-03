'use client';

import { Marquee } from '@/components/ui/marquee';
import { cn } from '@/lib/utils';
import Image from 'next/image';

const reviews = [
  {
    name: 'Sarah',
    username: '@sarah_pm',
    body: 'Our product team can now ship features without waiting weeks for eng capacity.',
    img: 'https://avatar.vercel.sh/sarah',
  },
  {
    name: 'Marcus',
    username: '@marcus_cto',
    body: 'Engineers keep full control via PR reviews. Perfect balance between speed and quality.',
    img: 'https://avatar.vercel.sh/marcus',
  },
  {
    name: 'Lisa',
    username: '@lisa_product',
    body: 'Finally, I can iterate on UI changes myself and submit them for review. Game changer.',
    img: 'https://avatar.vercel.sh/lisa',
  },
  {
    name: 'James',
    username: '@james_eng',
    body: "PR workflow means we're not worried. We review everything before it goes live.",
    img: 'https://avatar.vercel.sh/james',
  },
  {
    name: 'Priya',
    username: '@priya_design',
    body: 'I can build the designs I create. No more endless back-and-forth with developers.',
    img: 'https://avatar.vercel.sh/priya',
  },
  {
    name: 'David',
    username: '@david_dev',
    body: 'Non-technical teammates ship features that actually work. Less maintenance for us.',
    img: 'https://avatar.vercel.sh/david',
  },
  {
    name: 'Emma',
    username: '@emma_lead',
    body: 'The collaboration between product and engineering improved drastically. No more silos.',
    img: 'https://avatar.vercel.sh/emma',
  },
  {
    name: 'Alex',
    username: '@alex_startup',
    body: 'Small team, huge output. Product managers contribute code through PRs now.',
    img: 'https://avatar.vercel.sh/alex',
  },
  {
    name: 'Zoe',
    username: '@zoe_ops',
    body: 'Our shipping velocity doubled. Engineers focus on complex features, product handles simple ones.',
    img: 'https://avatar.vercel.sh/zoe',
  },
  {
    name: 'Ryan',
    username: '@ryan_tech',
    body: "It's like having 3x the engineering capacity without hiring. Revolutionary.",
    img: 'https://avatar.vercel.sh/ryan',
  },
  {
    name: 'Maya',
    username: '@maya_founder',
    body: 'Engineers love it because they maintain quality. Product loves it because they ship faster.',
    img: 'https://avatar.vercel.sh/maya',
  },
  {
    name: 'Kevin',
    username: '@kevin_vp',
    body: 'This bridges the product-engineering gap we struggled with for years. Finally solved.',
    img: 'https://avatar.vercel.sh/kevin',
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
              Empowering Teams
            </h2>
            <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto font-sans px-2">
              See how teams bridge the gap between product and engineering
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
