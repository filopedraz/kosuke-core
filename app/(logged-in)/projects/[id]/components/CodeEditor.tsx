'use client';

import React, { useState, useEffect } from 'react';
import { createHighlighter, BundledLanguage, BundledTheme } from 'shiki';
import { Loader2, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

interface CodeEditorProps {
  code: string;
  language?: string;
  filePath?: string;
}

export default function CodeEditor({ code, language = 'typescript', filePath }: CodeEditorProps) {
  const [highlightedCode, setHighlightedCode] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [copySuccess, setCopySuccess] = useState(false);
  const { toast } = useToast();
  
  useEffect(() => {
    const highlight = async () => {
      try {
        // Create a new highlighter instance
        const highlighter = await createHighlighter({
          // Use vitesse-black theme as requested
          themes: ['github-dark-default'],
          // Load all languages that might be needed
          langs: [
            // Web languages
            'javascript', 'typescript', 'jsx', 'tsx', 'html', 'css', 'scss',
            // Data formats
            'json', 'yaml', 'markdown', 'xml',
            // DevOps
            'dockerfile', 'shellscript', 'bash',
            // Backend languages
            'python', 'ruby', 'go', 'rust', 'java', 'php',
            // Systems languages
            'c', 'cpp', 'csharp',
            // Mobile
            'swift', 'kotlin', 'dart',
          ],
        });
        
        // Map special cases not directly supported by Shiki
        const mappedLanguage = mapToShikiLanguage(language);
        
        // Generate HTML directly 
        const html = highlighter.codeToHtml(code, {
          lang: mappedLanguage as BundledLanguage,
          theme: 'github-dark-default' as BundledTheme,
        });
        
        // Remove background color from the code block
        const processedHtml = html.replace(/style="[^"]*?background-color:[^;]*;?/g, 'style="');
        
        setHighlightedCode(processedHtml);
      } catch (error) {
        console.error('Error highlighting code:', error);
        // Basic fallback: escape HTML and wrap in pre/code
        const escapedCode = code
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#039;');
        
        setHighlightedCode(`<pre><code>${escapedCode}</code></pre>`);
      } finally {
        setIsLoading(false);
      }
    };
    
    highlight();
  }, [code, language]);
  
  const handleCopyCode = () => {
    navigator.clipboard.writeText(code)
      .then(() => {
        setCopySuccess(true);
        toast({
          variant: "success",
          title: "Copied to clipboard",
          description: filePath ? `${filePath} has been copied to clipboard` : "Code has been copied to clipboard",
        });
        setTimeout(() => setCopySuccess(false), 2000);
      })
      .catch(err => {
        console.error('Failed to copy text: ', err);
      });
  };
  
  // Helper function to map non-standard languages to Shiki supported languages
  function mapToShikiLanguage(lang: string): string {
    const languageMap: Record<string, string> = {
      // JavaScript variants
      'mjs': 'javascript',
      'cjs': 'javascript',
      
      // Shell scripts
      'sh': 'shellscript',
      'bash': 'shellscript',
      'zsh': 'shellscript',
      
      // Markup/XML
      'svg': 'xml',
      'html': 'html',
      'xml': 'xml',
      
      // Configuration files
      'dockerfile': 'dockerfile',
      'docker': 'dockerfile',
      
      // Default fallbacks for common types
      'plaintext': 'plaintext',
      'text': 'plaintext',
      'txt': 'plaintext',
    };
    
    return languageMap[lang.toLowerCase()] || lang;
  }
  
  if (isLoading) {
    return (
      <div style={{ 
        display: 'flex', 
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        width: '100%'
      }}>
        <Loader2 style={{ 
          height: '2rem', 
          width: '2rem', 
          animation: 'spin 1s linear infinite'
        }} />
        <style jsx>{`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }
  
  return (
    <div className="code-editor-container" style={{ 
      height: '100%',
      width: '100%',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden'
    }}>
      {/* Header with file path and copy button */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '0.5rem 1rem',
        borderBottom: '1px solid hsl(var(--border))'
      }}>
        <div style={{ fontSize: '0.875rem', fontWeight: '500' }}>
          {filePath || 'Code Viewer'}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleCopyCode}
        >
          {copySuccess ? (
            <Check className="h-4 w-4 mr-1 text-green-500" />
          ) : (
            <Copy className="h-4 w-4 mr-1" />
          )}
          {copySuccess ? 'Copied!' : 'Copy'}
        </Button>
      </div>
      
      {/* Code content */}
      <div style={{
        flex: 1,
        overflow: 'auto'
      }}>
        <div 
          dangerouslySetInnerHTML={{ __html: highlightedCode }} 
          style={{
            fontFamily: 'SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
            fontSize: '14px',
            lineHeight: '1.5',
            padding: '16px',
          }}
        />
      </div>
    </div>
  );
} 