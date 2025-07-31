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
    .replace(/<a\s+href="([^"]*)"([^>]*)>/gi, '<a href="$1" target="_blank" rel="noopener noreferrer"$2>')
    // Style code blocks
    .replace(/<pre><code/gi, '<pre class="bg-muted rounded-md p-3 overflow-x-auto"><code class="text-sm"')
    .replace(/<pre><code\s+class="language-([^"]*)"([^>]*)>/gi, '<pre class="bg-muted rounded-md p-3 overflow-x-auto"><code class="text-sm language-$1"$2>')
    // Style inline code
    .replace(/<code>/gi, '<code class="bg-muted px-1.5 py-0.5 rounded text-sm">')
    // Style tables
    .replace(/<table>/gi, '<table class="w-full border-collapse border border-border rounded-md overflow-hidden">')
    .replace(/<thead>/gi, '<thead class="bg-muted/50">')
    .replace(/<tr>/gi, '<tr class="border-b border-border">')
    .replace(/<td>/gi, '<td class="p-2 border-r border-border last:border-r-0">')
    .replace(/<th>/gi, '<th class="p-2 border-r border-border last:border-r-0">');
  
  return safeHtml;
}