import type { FontInfo } from '@/lib/types/branding';

export function parseLayoutForFonts(content: string): FontInfo[] {
  const fonts: FontInfo[] = [];

  // Extract import statements
  const importRegex = /import\s+\{([^}]+)\}\s+from\s+['"]([^'"]+)['"]/g;
  let importMatch;

  while ((importMatch = importRegex.exec(content)) !== null) {
    const imports = importMatch[1].split(',').map(i => i.trim());
    const provider = importMatch[2];

    if (provider.includes('font')) {
      // Process each font in the import
      imports.forEach(fontName => {
        // Find the font initialization
        const fontRegex = new RegExp(`const\\s+(\\w+)\\s+=\\s+${fontName}\\(\\{([^}]+)\\}\\)`, 's');
        const fontMatch = content.match(fontRegex);

        if (fontMatch) {
          const fontVar = fontMatch[1];
          const configStr = fontMatch[2];

          // Extract variable name
          const variableRegex = /variable:\s+['"]([^'"]+)['"]/;
          const variableMatch = configStr.match(variableRegex);
          const variable = variableMatch ? variableMatch[1] : '';

          // Extract subsets
          const subsetsRegex = /subsets:\s+\[([^\]]+)\]/;
          const subsetsMatch = configStr.match(subsetsRegex);
          const subsets = subsetsMatch
            ? subsetsMatch[1].split(',').map(s => s.trim().replace(/['"]/g, ''))
            : [];

          // Extract weights if available
          const weightsRegex = /weight[s]?:\s+\[([^\]]+)\]/;
          const weightsMatch = configStr.match(weightsRegex);
          const weights = weightsMatch
            ? weightsMatch[1].split(',').map(w => parseInt(w.trim(), 10))
            : undefined;

          // Extract display if available
          const displayRegex = /display:\s+['"]([^'"]+)['"]/;
          const displayMatch = configStr.match(displayRegex);
          const display = displayMatch ? displayMatch[1] : undefined;

          // Find usage in classNames
          const usageRegex = new RegExp(`${fontVar}\\.variable`, 'g');
          const usage = usageRegex.test(content) ? 'Applied to body' : 'Not applied';

          fonts.push({
            name: fontName,
            provider,
            variable,
            config: {
              subsets,
              ...(weights && { weights }),
              ...(display && { display }),
            },
            usage,
          });
        }
      });
    }
  }

  return fonts;
}
