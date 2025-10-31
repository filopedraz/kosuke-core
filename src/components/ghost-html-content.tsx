'use client';

import { useMemo } from 'react';

interface GhostHtmlContentProps {
  html: string;
  className?: string;
}

/**
 * Processes and renders Ghost CMS HTML content with consistent styling
 * Handles video elements, removes Ghost UI artifacts, and applies prose styles
 */
export function GhostHtmlContent({ html, className = '' }: GhostHtmlContentProps) {
  const processedHtml = useMemo(() => {
    let processed = html;

    // Extract video elements and unwrap them from Ghost's figure/card structure
    processed = processed.replace(
      /<figure[^>]*class="[^"]*kg-video-card[^"]*"[^>]*>([\s\S]*?)<\/figure>/gi,
      (match, content) => {
        // Extract just the video tag from the figure
        const videoMatch = content.match(/<video[^>]*>[\s\S]*?<\/video>/i);
        if (videoMatch) {
          // Wrap in a simple div for spacing
          return `<div class="video-wrapper my-8">${videoMatch[0]}</div>`;
        }
        return match;
      }
    );

    // Remove any remaining Ghost video player UI elements
    processed = processed
      .replace(/<div[^>]*class="[^"]*kg-video[^"]*"[^>]*>[\s\S]*?<\/div>/gi, '')
      .replace(/<button[^>]*class="[^"]*kg-video[^"]*"[^>]*>[\s\S]*?<\/button>/gi, '')
      // Add controls attribute to video tags if missing
      .replace(/<video(?![^>]*\bcontrols\b)/gi, '<video controls')
      // Ensure videos are playable inline on mobile
      .replace(/<video/gi, '<video playsinline');

    return processed;
  }, [html]);

  return (
    <article
      className={`prose prose-lg dark:prose-invert
        prose-headings:font-bold prose-headings:tracking-tight prose-headings:text-foreground
        prose-h1:text-4xl prose-h1:font-extrabold prose-h1:mb-6 prose-h1:mt-12 prose-h1:leading-tight
        prose-h2:text-3xl prose-h2:font-bold prose-h2:mb-6 prose-h2:mt-12 prose-h2:leading-tight
        prose-h3:text-2xl prose-h3:font-bold prose-h3:mb-4 prose-h3:mt-10 prose-h3:leading-snug
        prose-h4:text-xl prose-h4:font-semibold prose-h4:mb-3 prose-h4:mt-8
        prose-p:text-base prose-p:leading-relaxed prose-p:mb-6 prose-p:text-muted-foreground
        prose-a:text-primary prose-a:font-medium prose-a:no-underline hover:prose-a:underline
        prose-strong:font-semibold prose-strong:text-foreground
        prose-ul:my-8 prose-ul:list-disc prose-ul:pl-8 prose-ul:space-y-3
        prose-ol:my-8 prose-ol:list-decimal prose-ol:pl-8 prose-ol:space-y-3
        prose-li:leading-relaxed prose-li:my-2
        prose-img:rounded-lg prose-img:shadow-md prose-img:my-8 prose-img:mx-auto
        prose-blockquote:border-l-4 prose-blockquote:border-primary prose-blockquote:pl-6 prose-blockquote:py-2 prose-blockquote:italic prose-blockquote:text-muted-foreground
        prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-code:text-foreground
        prose-pre:bg-muted prose-pre:p-4 prose-pre:rounded-lg prose-pre:overflow-x-auto prose-pre:border prose-pre:border-border
        prose-video:rounded-lg prose-video:shadow-md prose-video:my-8 prose-video:mx-auto prose-video:w-full
        [&_h1]:text-4xl [&_h1]:font-extrabold [&_h1]:mb-6 [&_h1]:mt-12 [&_h1]:text-foreground
        [&_h2]:text-3xl [&_h2]:font-bold [&_h2]:mb-6 [&_h2]:mt-12 [&_h2]:text-foreground
        [&_h3]:text-2xl [&_h3]:font-bold [&_h3]:mb-4 [&_h3]:mt-10 [&_h3]:text-foreground
        [&_h4]:text-xl [&_h4]:font-semibold [&_h4]:mb-3 [&_h4]:mt-8 [&_h4]:text-foreground
        [&_p]:mb-6
        [&_ul]:list-disc [&_ul]:pl-8 [&_ul]:my-8 [&_ul]:space-y-3
        [&_ol]:list-decimal [&_ol]:pl-8 [&_ol]:my-8 [&_ol]:space-y-3
        [&_li]:leading-relaxed [&_li]:my-2
        [&_ul>li]:list-disc [&_ul>li]:ml-0
        [&_ol>li]:list-decimal [&_ol>li]:ml-0
        [&_img]:mx-auto [&_img]:block
        [&_video]:w-full [&_video]:rounded-lg [&_video]:shadow-md [&_video]:my-8 [&_video]:mx-auto
        [&_iframe]:w-full [&_iframe]:aspect-video [&_iframe]:rounded-lg [&_iframe]:shadow-md [&_iframe]:my-8 [&_iframe]:mx-auto
        [&_figure]:my-8 [&_figure]:mx-auto
        [&_figure>video]:my-0
        [&_figure>iframe]:my-0
        [&_figcaption]:text-center [&_figcaption]:text-sm [&_figcaption]:text-muted-foreground [&_figcaption]:mt-3
        ${className}`}
      dangerouslySetInnerHTML={{ __html: processedHtml }}
    />
  );
}
