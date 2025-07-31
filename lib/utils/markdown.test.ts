import { renderMarkdown, renderSafeMarkdown } from './markdown';

// Simple test to demonstrate markdown rendering functionality
describe('Markdown Rendering', () => {
  test('renders basic markdown', () => {
    const markdown = `# Hello World

This is a **bold** text and this is *italic*.

Here's a code block:
\`\`\`javascript
console.log("Hello, World!");
\`\`\`

And some inline \`code\`.

[Link to Google](https://google.com)

## List
- Item 1
- Item 2
- Item 3

| Name | Value |
|------|-------|
| Test | 123   |
`;

    const result = renderSafeMarkdown(markdown);
    
    // Check that basic markdown elements are rendered
    expect(result).toContain('<h1>');
    expect(result).toContain('<strong>');
    expect(result).toContain('<em>');
    expect(result).toContain('<pre class="bg-muted rounded-md p-3 overflow-x-auto">');
    expect(result).toContain('<code class="bg-muted px-1.5 py-0.5 rounded text-sm">');
    expect(result).toContain('target="_blank"');
    expect(result).toContain('rel="noopener noreferrer"');
    expect(result).toContain('<table class="w-full border-collapse border border-border rounded-md overflow-hidden">');
  });

  test('sanitizes dangerous content', () => {
    const maliciousMarkdown = `
# Safe Title

<script>alert('XSS')</script>

<a href="javascript:alert('XSS')" onclick="alert('XSS')">Dangerous Link</a>

Normal [safe link](https://example.com) should work.
`;

    const result = renderSafeMarkdown(maliciousMarkdown);
    
    // Check that dangerous content is removed
    expect(result).not.toContain('<script>');
    expect(result).not.toContain('javascript:');
    expect(result).not.toContain('onclick=');
    
    // Check that safe content is preserved
    expect(result).toContain('<h1>');
    expect(result).toContain('https://example.com');
  });

  test('handles line breaks correctly', () => {
    const markdown = `Line 1
Line 2

New paragraph`;

    const result = renderMarkdown(markdown);
    
    // Should convert single line breaks to <br> due to breaks: true option
    expect(result).toContain('<br>');
  });
});

// Manual test function for console testing
export function testMarkdownRendering() {
  const testMarkdown = `# Assistant Response Example

Here's how **markdown** rendering works in our chat:

## Features
- **Bold** and *italic* text
- \`inline code\` highlighting
- Code blocks with syntax highlighting:

\`\`\`typescript
interface ChatMessage {
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
}
\`\`\`

## Links
Links automatically open in new tabs: [Documentation](https://github.com/markedjs/marked)

## Tables
| Feature | Status |
|---------|--------|
| Bold text | ✅ |
| Code blocks | ✅ |
| Tables | ✅ |
| Links | ✅ |

> This is a blockquote that shows how markdown enhances the chat experience.

---

The assistant can now provide rich, formatted responses!`;

  console.log('=== Original Markdown ===');
  console.log(testMarkdown);
  console.log('\n=== Rendered HTML ===');
  console.log(renderSafeMarkdown(testMarkdown));
  
  return renderSafeMarkdown(testMarkdown);
}

// Export for easy testing in console
if (typeof window !== 'undefined') {
  (window as any).testMarkdownRendering = testMarkdownRendering;
}