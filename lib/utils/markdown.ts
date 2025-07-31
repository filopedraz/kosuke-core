import { marked } from 'marked';

// Configure marked options for chat messages
marked.setOptions({
  breaks: true, // Convert single line breaks to <br>
  gfm: true, // Enable GitHub Flavored Markdown
  silent: true, // Don't throw on malformed markdown
});

/**
 * Renders markdown content to HTML with chat-friendly styling
 * @param content - The markdown content to render
 * @returns The rendered HTML string
 */
export function renderMarkdown(content: string): string {
  try {
    return marked.parse(content) as string;
  } catch (error) {
    console.warn('Failed to parse markdown:', error);
    // Fallback to plain text with line breaks
    return content.replace(/\n/g, '<br>');
  }
}

/**
 * Sanitizes and renders markdown content for safe display with chat-friendly styling
 * @param content - The markdown content to render
 * @returns The rendered and sanitized HTML string
 */
export function renderSafeMarkdown(content: string): string {
  const html = renderMarkdown(content);

  // Basic XSS protection - remove script tags and javascript: links
  let safeHtml = html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, ''); // Remove event handlers like onclick, onload, etc.

  // Post-process HTML to add styling classes and attributes
  safeHtml = safeHtml
    // Make links open in new tabs with security attributes
    .replace(
      /<a\s+href="([^"]*)"([^>]*)>/gi,
      '<a href="$1" target="_blank" rel="noopener noreferrer"$2>'
    )
    // Style code blocks with width constraints
    .replace(
      /<pre><code/gi,
      '<pre class="bg-muted rounded-md p-3 overflow-x-auto w-full max-w-full my-3 text-left"><code class="text-sm whitespace-pre-wrap"'
    )
    .replace(
      /<pre><code\s+class="language-([^"]*)"([^>]*)>/gi,
      '<pre class="bg-muted rounded-md p-3 overflow-x-auto w-full max-w-full my-3 text-left"><code class="text-sm whitespace-pre-wrap language-$1"$2>'
    )
    // Style inline code
    .replace(/<code>/gi, '<code class="bg-muted px-1.5 py-0.5 rounded text-sm">')
    // Style headers with proper margins
    .replace(/<h1>/gi, '<h1 class="text-lg font-bold my-3 w-full max-w-full">')
    .replace(/<h2>/gi, '<h2 class="text-base font-bold my-2 w-full max-w-full">')
    .replace(/<h3>/gi, '<h3 class="text-sm font-bold my-2 w-full max-w-full">')
    .replace(/<h4>/gi, '<h4 class="text-sm font-semibold my-1 w-full max-w-full">')
    .replace(/<h5>/gi, '<h5 class="text-xs font-semibold my-1 w-full max-w-full">')
    .replace(/<h6>/gi, '<h6 class="text-xs font-medium my-1 w-full max-w-full">')
    // Style paragraphs
    .replace(/<p>/gi, '<p class="my-2 w-full max-w-full">')
    // Style lists
    .replace(/<ul>/gi, '<ul class="list-disc list-inside my-2 w-full max-w-full">')
    .replace(/<ol>/gi, '<ol class="list-decimal list-inside my-2 w-full max-w-full">')
    .replace(/<li>/gi, '<li class="my-1 w-full max-w-full">')
    // Style blockquotes
    .replace(
      /<blockquote>/gi,
      '<blockquote class="border-l-4 border-border pl-4 py-2 my-3 bg-muted/30 rounded-r-md w-full max-w-full">'
    )
    // Style tables
    .replace(
      /<table>/gi,
      '<table class="w-full max-w-full border-collapse border border-border rounded-md overflow-hidden my-3">'
    )
    .replace(/<thead>/gi, '<thead class="bg-muted/50">')
    .replace(/<tr>/gi, '<tr class="border-b border-border">')
    .replace(/<td>/gi, '<td class="p-2 border-r border-border last:border-r-0 text-sm">')
    .replace(
      /<th>/gi,
      '<th class="p-2 border-r border-border last:border-r-0 text-sm font-medium">'
    )
    // Style horizontal rules
    .replace(/<hr>/gi, '<hr class="border-t border-border my-4 w-full max-w-full">');

  return safeHtml;
}
