'use client';

import { motion } from 'framer-motion';

import type { GhostPage } from '@/lib/types/ghost';

interface GhostPageContentProps {
  page: GhostPage;
}

export function GhostPageContent({ page }: GhostPageContentProps) {
  return (
    <div className="w-full min-h-screen bg-background font-mono">
      {/* Background with subtle grid */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-background" />
        <div
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: `
              linear-gradient(rgba(34, 197, 94, 0.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(34, 197, 94, 0.1) 1px, transparent 1px)
            `,
            backgroundSize: '50px 50px',
          }}
        />
      </div>

      <div className="container mx-auto max-w-4xl px-4 sm:px-6 py-12 sm:py-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="space-y-8"
        >
          {/* Header */}
          <div className="text-center space-y-4">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold">{page.title}</h1>
            {page.updated_at && (
              <p className="text-muted-foreground font-sans">
                Last updated:{' '}
                {new Date(page.updated_at).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>
            )}
          </div>

          {/* Content */}
          <div
            className="prose prose-neutral dark:prose-invert max-w-none font-sans prose-headings:font-mono prose-h2:text-2xl prose-h2:font-semibold prose-h2:mb-4 prose-p:text-muted-foreground prose-p:leading-relaxed prose-ul:list-disc prose-ul:list-inside prose-ul:space-y-2 prose-ul:text-muted-foreground prose-ul:ml-4 prose-li:text-muted-foreground prose-a:text-primary prose-a:hover:underline prose-strong:text-foreground"
            dangerouslySetInnerHTML={{ __html: page.html }}
          />
        </motion.div>
      </div>
    </div>
  );
}
