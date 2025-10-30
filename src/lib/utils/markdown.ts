import { marked } from 'marked';
import { createHighlighter, type BundledLanguage, type BundledTheme } from 'shiki';

// Configure marked options for chat messages
marked.setOptions({
  breaks: true, // Convert single line breaks to <br>
  gfm: true, // Enable GitHub Flavored Markdown
  silent: true, // Don't throw on malformed markdown
});

// Initialize Shiki highlighter (cached)
let highlighterInstance: Awaited<ReturnType<typeof createHighlighter>> | null = null;

async function getHighlighter() {
  if (!highlighterInstance) {
    highlighterInstance = await createHighlighter({
      themes: ['github-dark-default'],
      langs: [
        // Web development languages (priority based on user request)
        'javascript',
        'typescript',
        'jsx',
        'tsx',
        'html',
        'css',
        'scss',
        'sass',
        'less',
        'json',
        'yaml',
        'markdown',
        'xml',
        'dockerfile',
        'shellscript',
        'bash',
        // Additional common languages
        'python',
        'ruby',
        'go',
        'rust',
        'java',
        'php',
        'c',
        'cpp',
        'csharp',
        'swift',
        'kotlin',
      ],
    });
  }
  return highlighterInstance;
}

// Helper function to map language identifiers to Shiki supported languages
function mapToShikiLanguage(lang: string): string {
  const languageMap: Record<string, string> = {
    // JavaScript variants
    js: 'javascript',
    mjs: 'javascript',
    cjs: 'javascript',
    ts: 'typescript',

    // Shell scripts
    sh: 'shellscript',
    bash: 'shellscript',
    zsh: 'shellscript',

    // Markup/XML
    svg: 'xml',
    htm: 'html',

    // Configuration files
    docker: 'dockerfile',
    yml: 'yaml',

    // Default fallbacks
    plaintext: 'plaintext',
    text: 'plaintext',
    txt: 'plaintext',
  };

  return languageMap[lang.toLowerCase()] || lang;
}

// Function to highlight code blocks with Shiki
async function highlightCodeBlock(code: string, language: string): Promise<string> {
  try {
    const highlighter = await getHighlighter();
    const mappedLanguage = mapToShikiLanguage(language);

    // Check if language is supported
    const supportedLangs = highlighter.getLoadedLanguages();
    const finalLang = supportedLangs.includes(mappedLanguage as BundledLanguage)
      ? (mappedLanguage as BundledLanguage)
      : 'plaintext';

    const html = highlighter.codeToHtml(code, {
      lang: finalLang,
      theme: 'github-dark-default' as BundledTheme,
    });

    // Remove Shiki's background and apply our custom styling
    return html
      .replace(/style="[^"]*?background-color:[^;]*;?/g, 'style="')
      .replace(
        /<pre[^>]*>/gi,
        '<pre class="bg-muted rounded-md p-3 overflow-x-auto w-full max-w-full my-3 text-left">'
      )
      .replace(/<code[^>]*>/gi, '<code class="text-xs whitespace-pre-wrap">');
  } catch (error) {
    console.warn('Error highlighting code with Shiki:', error);
    // Fallback to basic HTML escaping
    const escapedCode = code
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');

    return `<pre class="bg-muted rounded-md p-3 overflow-x-auto w-full max-w-full my-3 text-left"><code class="text-xs whitespace-pre-wrap">${escapedCode}</code></pre>`;
  }
}

/**
 * Renders markdown content to HTML with chat-friendly styling
 * @param content - The markdown content to render
 * @returns The rendered HTML string
 */
function renderMarkdown(content: string): string {
  try {
    return marked.parse(content) as string;
  } catch (error) {
    console.warn('Failed to parse markdown:', error);
    // Fallback to plain text with line breaks
    return content.replace(/\n/g, '<br>');
  }
}

/**
 * Sanitizes and renders markdown content for safe display with Shiki syntax highlighting
 * @param content - The markdown content to render
 * @returns Promise that resolves to the rendered and sanitized HTML string
 */
export async function renderSafeMarkdown(content: string): Promise<string> {
  // First render markdown to HTML
  const html = renderMarkdown(content);

  // Basic XSS protection - remove script tags and javascript: links
  let safeHtml = html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, ''); // Remove event handlers like onclick, onload, etc.

  // Process code blocks with Shiki highlighting
  const codeBlockRegex =
    /<pre><code(?:\s+class="language-([^"]*)")?[^>]*>([\s\S]*?)<\/code><\/pre>/gi;
  const codeBlocks: Array<{ match: string; language: string; code: string }> = [];

  let match;
  while ((match = codeBlockRegex.exec(safeHtml)) !== null) {
    const language = match[1] || 'plaintext';
    const code = match[2]
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#039;/g, "'");

    codeBlocks.push({
      match: match[0],
      language,
      code,
    });
  }

  // Replace code blocks with syntax highlighted versions
  for (const block of codeBlocks) {
    const highlightedCode = await highlightCodeBlock(block.code, block.language);
    safeHtml = safeHtml.replace(block.match, highlightedCode);
  }

  // Post-process HTML to add styling classes and attributes (except code blocks which are already processed)
  safeHtml = safeHtml
    // Make links open in new tabs with security attributes
    .replace(
      /<a\s+href="([^"]*)"([^>]*)>/gi,
      '<a href="$1" target="_blank" rel="noopener noreferrer"$2>'
    )
    // Style inline code (but not block code which is already processed)
    .replace(
      /<code(?![^>]*class="text-xs")>/gi,
      '<code class="bg-muted px-1.5 py-0.5 rounded text-sm">'
    )
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
