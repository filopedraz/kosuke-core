'use client';

import type { PreviewViewMode } from '@/lib/types';
import { cn } from '@/lib/utils';

interface PreviewIframeContainerProps {
  src: string;
  title: string;
  viewMode: PreviewViewMode;
  iframeKey: number;
  className?: string;
}

// iPhone viewport dimensions (used in CSS classes)
const MOBILE_WIDTH = 375;
const MOBILE_MAX_HEIGHT = 667;

export default function PreviewIframeContainer({
  src,
  title,
  viewMode,
  iframeKey,
  className,
}: PreviewIframeContainerProps) {
  return (
    <div className={cn('h-full w-full', className)}>
      {viewMode === 'desktop' ? (
        // Desktop view - full width/height
        <iframe
          key={iframeKey}
          src={src}
          title={title}
          className="h-full w-full border-0"
          sandbox="allow-forms allow-modals allow-orientation-lock allow-pointer-lock allow-popups allow-popups-to-escape-sandbox allow-presentation allow-same-origin allow-scripts allow-downloads"
        />
      ) : (
        // Mobile view - centered with device-like appearance
        <div className="h-full w-full flex items-center justify-center p-4">
          <div
            className="border rounded-xl shadow-2xl bg-background transition-all duration-300 ease-in-out overflow-hidden"
            style={{
              width: `${MOBILE_WIDTH}px`,
              height: `min(${MOBILE_MAX_HEIGHT}px, calc(100vh - 200px))`,
              minHeight: '400px'
            }}
          >
            <iframe
              key={iframeKey}
              src={src}
              title={title}
              className="h-full w-full border-0 rounded-xl"
              sandbox="allow-forms allow-modals allow-orientation-lock allow-pointer-lock allow-popups allow-popups-to-escape-sandbox allow-presentation allow-same-origin allow-scripts allow-downloads"
            />
          </div>
        </div>
      )}
    </div>
  );
}
