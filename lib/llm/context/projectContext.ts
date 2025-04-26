import path from 'path';
import { encoding_for_model } from 'tiktoken';

import { CONTEXT } from '@/lib/constants';
import { readFile, listFilesRecursively, getProjectPath } from '../../fs/operations';
import { analyzeTsWithMorph, Relationship } from './tsAnalysis';

/**
 * Count tokens using tiktoken library
 */
export function countTokens(text: string): number {
  try {
    // cl100k_base is the encoding used by GPT-4 and GPT-3.5 Turbo
    const enc = encoding_for_model('gpt-4o');
    const tokens = enc.encode(text);
    return tokens.length;
  } catch (error) {
    console.warn(
      'Error counting tokens with tiktoken, falling back to character approximation:',
      error
    );
    // Fallback to approximately 4 characters per token
    return Math.ceil(text.length / 4);
  }
}

/**
 * Format a docstring by removing leading asterisks and whitespace
 */
function formatDocstring(docstring: string): string {
  return docstring
    .split('\n')
    .map(line => line.trim().replace(/^\*\s*/, ''))
    .join('\n')
    .trim();
}

/**
 * Interface representing a node in the file tree
 */
interface FileTree {
  files?: string[];
  dirs?: Record<string, FileTree>;
}

/**
 * Generate a directory structure representation
 */
async function generateDirectoryStructure(
  projectPath: string,
  excludeDirs: string[] = CONTEXT.EXCLUDE_DIRS
): Promise<string> {
  try {
    console.log(`🔍 Generating directory structure for: ${projectPath}`);
    const allFiles = await listFilesRecursively(projectPath);

    // Filter out files from excluded directories
    const files = allFiles.filter(
      file =>
        !excludeDirs.some(
          excludeDir => file.includes(`/${excludeDir}/`) || file.startsWith(excludeDir)
        )
    );

    // Sort files to group by directory
    files.sort();

    // Build a tree structure
    const tree: FileTree = {};

    // Function to add a file to the tree
    const addToTree = (filePath: string) => {
      const parts = filePath.split('/');
      let current = tree;

      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        const isFile = i === parts.length - 1;

        if (isFile) {
          if (!current.files) {
            current.files = [];
          }
          current.files.push(part);
        } else {
          if (!current.dirs) {
            current.dirs = {};
          }
          if (!current.dirs[part]) {
            current.dirs[part] = {};
          }
          current = current.dirs[part];
        }
      }
    };

    // Add all files to the tree
    files.forEach(addToTree);

    // Function to generate the output string
    const generateOutput = (node: FileTree, prefix = ''): string => {
      let output = '';

      // Process directories
      const dirs = node.dirs;
      if (dirs) {
        const dirNames = Object.keys(dirs);
        dirNames.forEach((dirName, index) => {
          const isLastDir =
            index === dirNames.length - 1 && (!node.files || node.files.length === 0);
          const connector = isLastDir ? '└── ' : '├── ';
          const childPrefix = isLastDir ? prefix + '    ' : prefix + '│   ';

          output += `${prefix}${connector}${dirName}/\n`;
          output += generateOutput(dirs[dirName], childPrefix);
        });
      }

      // Process files
      const files = node.files;
      if (files) {
        files.forEach((file: string, index: number) => {
          const isLastFile = index === files.length - 1;
          const connector = isLastFile ? '└── ' : '├── ';
          output += `${prefix}${connector}${file}\n`;
        });
      }

      return output;
    };

    const directoryStructure = `
================================================================
Directory Structure
================================================================
${generateOutput(tree)}
================================================================
`;

    console.log(`✅ Generated directory structure (${countTokens(directoryStructure)} tokens)`);
    return directoryStructure;
  } catch (error) {
    console.error('❌ Error generating directory structure:', error);
    return '\nError generating directory structure\n';
  }
}

/**
 * Extract method signatures and their docstrings from file content
 */
export function extractMethodSignatures(content: string, extension: string): string[] {
  try {
    const signatures: string[] = [];
    // Set a reasonable maximum size limit to avoid issues with large files
    const contentToProcess = content.length > 500000 ? content.substring(0, 500000) : content;

    // Different patterns for different file types
    if (['.ts', '.tsx', '.js', '.jsx'].includes(extension)) {
      // JavaScript/TypeScript patterns

      try {
        // Match function declarations with docstrings
        const functionWithDocPattern =
          /\/\*\*[\s\S]*?\*\/\s*(?:export\s+)?(?:async\s+)?function\s+(\w+)\s*\(([^)]*)\)\s*(?::\s*[^{]+)?\s*{/g;
        let match;

        while ((match = functionWithDocPattern.exec(contentToProcess)) !== null) {
          try {
            const matchText = match[0];
            const funcName = match[1];
            const params = match[2]?.trim() || '';

            // Extract the docstring
            const docstringMatch = matchText.match(/\/\*\*([\s\S]*?)\*\//);
            const docstring = docstringMatch ? formatDocstring(docstringMatch[1]) : '';

            signatures.push(
              docstring ? `${docstring}\n${funcName}(${params})` : `${funcName}(${params})`
            );
          } catch (matchError) {
            console.warn('Error processing function declaration match:', matchError);
            continue;
          }
        }
      } catch (patternError) {
        console.warn('Error processing function declarations with docstrings:', patternError);
      }

      try {
        // Match function declarations WITHOUT docstrings
        const functionPattern =
          /(?:export\s+)?(?:async\s+)?function\s+(\w+)\s*\(([^)]*)\)\s*(?::\s*[^{]+)?\s*{/g;
        let match;
        while ((match = functionPattern.exec(contentToProcess)) !== null) {
          try {
            const funcName = match[1];
            const params = match[2]?.trim() || '';

            // Avoid duplicates
            if (!signatures.some(sig => sig.includes(`${funcName}(`))) {
              signatures.push(`${funcName}(${params})`);
            }
          } catch (matchError) {
            console.warn('Error processing function declaration match:', matchError);
            continue;
          }
        }
      } catch (patternError) {
        console.warn('Error processing function declarations without docstrings:', patternError);
      }

      // Limit the number of signatures to avoid performance issues
      if (signatures.length > 100) {
        console.log(`Limiting method signatures to 100 (found ${signatures.length})`);
        return signatures.slice(0, 100);
      }

      return signatures;
    } else if (['.py'].includes(extension)) {
      // Python patterns implementation (shortened for brevity)
      return signatures;
    } else {
      // Unsupported file extension
      return [];
    }
  } catch (error) {
    console.error('Error extracting method signatures:', error);
    return [];
  }
}

/**
 * Get project context with directory structure and analysis of components and their relationships
 * This provides an enhanced view of the codebase structure and relationships.
 */
export async function getProjectContextWithDirectoryStructureAndAnalysis(
  projectId: number | string,
  options: {
    maxSize?: number;
    includeExtensions?: string[];
    excludeDirs?: string[];
    excludeFiles?: string[];
    includeUtilityMethods?: boolean;
    analyzeRelationships?: boolean;
  } = {}
): Promise<string> {
  const {
    maxSize = CONTEXT.MAX_CONTEXT_SIZE,
    includeExtensions = CONTEXT.INCLUDE_EXTENSIONS,
    excludeDirs = CONTEXT.EXCLUDE_DIRS,
    excludeFiles = CONTEXT.EXCLUDE_FILES,
    includeUtilityMethods = true,
    analyzeRelationships = true,
  } = options;

  console.log(`📂 Starting analysis context collection for project ${projectId}`);
  console.log(`📊 Max context size: ${maxSize} tokens`);

  const projectPath = getProjectPath(projectId);
  console.log(`📂 Project path: ${projectPath}`);

  let context = '';
  let totalTokens = 0;

  const includedFiles: Array<{ path: string; tokens: number; type: string }> = [];
  const excludedFiles: Array<{ path: string; tokens: number; reason: string }> = [];

  try {
    // Step 1: Generate directory structure
    console.log(`📂 Generating directory structure...`);
    const directoryStructure = await generateDirectoryStructure(projectPath, excludeDirs);
    const dirStructureTokens = countTokens(directoryStructure);

    if (dirStructureTokens < maxSize * 0.15) {
      context += directoryStructure;
      totalTokens += dirStructureTokens;
      console.log(`📂 Added directory structure (${dirStructureTokens} tokens)`);
    } else {
      console.log(`⚠️ Directory structure too large (${dirStructureTokens} tokens), skipping`);
    }

    // Step 2: Gather files for analysis
    console.log(`🔍 Scanning project for files: ${projectPath}`);
    const files = await listFilesRecursively(projectPath);
    console.log(`📊 Found ${files.length} total files in project`);

    const filteredFiles = files.filter(file => {
      const ext = path.extname(file);
      const fileName = path.basename(file);

      if (excludeFiles.includes(fileName)) {
        excludedFiles.push({ path: file, tokens: 0, reason: 'excluded file' });
        return false;
      }
      if (excludeDirs.some(dir => file.includes(`/${dir}/`) || file.startsWith(dir))) {
        excludedFiles.push({ path: file, tokens: 0, reason: 'excluded directory' });
        return false;
      }
      return includeExtensions.includes(ext);
    });

    console.log(`📊 ${filteredFiles.length} files match the extension and exclusion filters`);

    // Step 3: Perform detailed analysis of TypeScript code (if enabled)
    let componentRelationships: Record<string, Relationship> = {};
    let contextProviders: Record<string, string[]> = {};

    if (analyzeRelationships) {
      console.log(`🔍 Analyzing component and function relationships...`);
      try {
        const tsAnalysis = await analyzeTsWithMorph(projectPath);
        componentRelationships = tsAnalysis.relationships;
        contextProviders = tsAnalysis.contextProviders;

        // Log more detailed info for troubleshooting
        console.log(
          `✅ Analyzed ${Object.keys(componentRelationships).length} components and functions`
        );

        // Log component types
        const componentCount = Object.values(componentRelationships).filter(
          r => r.type === 'component'
        ).length;
        const hookCount = Object.values(componentRelationships).filter(
          r => r.type === 'hook'
        ).length;
        const functionCount = Object.values(componentRelationships).filter(
          r => r.type === 'function'
        ).length;

        console.log(
          `📊 Found ${componentCount} components, ${hookCount} hooks, and ${functionCount} functions`
        );

        if (componentCount === 0) {
          console.warn(
            '⚠️ No components found! Check project structure and analyzeTsWithMorph implementation.'
          );

          // Log some paths for debugging
          const allFilePaths = Object.values(componentRelationships).map(r => r.filePath);
          console.log(
            `📂 File paths analyzed: ${allFilePaths.slice(0, 10).join(', ')}${allFilePaths.length > 10 ? '...' : ''}`
          );
        }
      } catch (error) {
        console.error(`❌ Error analyzing TypeScript relationships:`, error);
      }
    }

    // Step 4: Extract utility functions (if enabled)
    const utilityMethods: Array<{ filePath: string; signatures: string[] }> = [];

    if (includeUtilityMethods) {
      console.log(`🔍 Extracting utility method signatures...`);
      try {
        const utilityFiles = filteredFiles.filter(file => {
          const relativePath = path.relative(projectPath, path.join(projectPath, file));
          const fileName = path.basename(relativePath);
          const firstChar = fileName.split('.')[0][0];
          const isComponentOrHook =
            (firstChar === firstChar.toUpperCase() && firstChar !== firstChar.toLowerCase()) ||
            fileName.startsWith('use');
          const isInComponentDir =
            relativePath.includes('components/') ||
            relativePath.includes('app/') ||
            relativePath.includes('pages/'); // Also exclude app/pages dirs

          // Keep the file ONLY if it's NOT a component/hook AND NOT in a component/app/pages directory
          return !isComponentOrHook && !isInComponentDir;
        });

        console.log(
          `🔬 Found ${utilityFiles.length} potential utility files for signature extraction.`
        );

        for (const file of utilityFiles) {
          const fullPath = path.join(projectPath, file);
          const content = await readFile(fullPath);
          const ext = path.extname(file);
          const methodSignatures = extractMethodSignatures(content, ext);

          if (methodSignatures.length > 0) {
            const relativePath = path.relative(projectPath, fullPath);
            utilityMethods.push({
              filePath: relativePath,
              signatures: methodSignatures,
            });
          }
        }
        console.log(`✅ Extracted signatures from ${utilityMethods.length} utility files.`);
      } catch (error) {
        console.error(`❌ Error extracting utility methods:`, error);
      }
    }

    // Step 5: Combine analysis into context
    console.log(`📝 Formatting relationship graph...`);
    let relationshipGraph = '';
    const filteredRelationships: Record<string, Relationship> = {};

    // --- Define pageEntryPoints earlier to be accessible by Page Analysis section ---
    const pageEntryPoints = new Set<string>();
    if (Object.keys(componentRelationships).length > 0) {
      // --- START: Original filtering logic ---
      const allRelationshipNames = new Set(Object.keys(componentRelationships));

      // Identify page components as entry points (populate the outer pageEntryPoints set)
      for (const [name, rel] of Object.entries(componentRelationships)) {
        const filePath = rel.filePath || '';
        // Add patterns for identifying pages/layouts/routes
        if (
          filePath.match(/^(app|pages)(\/.*)?\/(page|layout|route)\.(tsx|ts|js|jsx)$/) ||
          filePath.match(/^(app|pages)\/[^\/]+\.(tsx|ts|js|jsx)$/) || // e.g., app/not-found.tsx
          filePath.match(/^app\/.*$/) || // Any file in app directory could be a route component
          filePath.match(/^pages\/.*$/) || // Any file in pages directory could be a page
          filePath.includes('/page.') || // Files named page.tsx in any directory
          filePath.includes('/layout.') || // Files named layout.tsx in any directory
          /\/(404|500|index)\.(tsx|ts|js|jsx)$/.test(filePath) // Common page names
        ) {
          pageEntryPoints.add(name);
        }
      }
      console.log(
        `🔍 Found ${pageEntryPoints.size} potential page entry points for relationship graph.`
      );

      // Perform BFS/DFS traversal to find reachable components
      const reachable = new Set<string>();
      const queue = Array.from(pageEntryPoints);
      pageEntryPoints.forEach(p => reachable.add(p)); // Add initial entry points

      while (queue.length > 0) {
        const currentName = queue.shift();
        if (!currentName) continue;

        const rel = componentRelationships[currentName];
        if (!rel) continue;

        const dependencies = [...(rel.uses || []), ...(rel.hooks || [])];
        for (const depName of dependencies) {
          // Only consider dependencies that are part of the analyzed relationships
          if (allRelationshipNames.has(depName) && !reachable.has(depName)) {
            reachable.add(depName);
            queue.push(depName);
          }
        }
      }
      console.log(
        `📊 Found ${reachable.size} components/functions reachable from page entry points.`
      );

      // Build the filtered relationship object
      for (const name of reachable) {
        const originalRel = componentRelationships[name];
        if (originalRel) {
          filteredRelationships[name] = {
            ...originalRel,
            // Filter 'usedBy' to only include reachable components
            usedBy: (originalRel.usedBy || []).filter((user: string) => reachable.has(user)),
          };
        }
      }
      // --- END: Original filtering logic ---

      relationshipGraph = `
================================================================
Component & Function Relationships (Reachable from Pages)
================================================================
`;

      // Format relationships as a text list (using filteredRelationships)
      let graphText = '';
      // Iterate over the filtered map instead of the original
      for (const [name, rel] of Object.entries(filteredRelationships)) {
        // Skip if the filtered component has no connections left after filtering
        if (
          (rel.uses?.length ?? 0) === 0 &&
          (rel.usedBy?.length ?? 0) === 0 &&
          (rel.hooks?.length ?? 0) === 0 &&
          (rel.contexts?.length ?? 0) === 0 &&
          !pageEntryPoints.has(name) // Keep entry points even if isolated
        ) {
          continue;
        }

        // Clean the file path to remove project ID
        const cleanFilePath = rel.filePath.replace(/^\d+\//, '');

        let entry = `\n${name} (${rel.type}, ${cleanFilePath})\n`;
        if (rel.uses && rel.uses.length > 0) {
          entry += `  uses: ${rel.uses.join(', ')}\n`;
        }
        // Use the already filtered usedBy list
        if (rel.usedBy && rel.usedBy.length > 0) {
          entry += `  usedBy: ${rel.usedBy.join(', ')}\n`;
        }
        if (rel.hooks && rel.hooks.length > 0) {
          entry += `  hooks: ${rel.hooks.join(', ')}\n`;
        }
        if (rel.contexts && rel.contexts.length > 0) {
          entry += `  contexts: ${rel.contexts.join(', ')}\n`;
        }
        graphText += entry;
      }

      const graphTokens = countTokens(graphText);

      if (totalTokens + graphTokens + 80 < maxSize * 0.8) {
        // Recalculate based on text format
        relationshipGraph += graphText + '\n'; // Add the generated text
        totalTokens += graphTokens + 80; // Add overhead for section header
        // Update logging to reflect filtered graph
        includedFiles.push({
          path: 'filtered-relationship-graph',
          tokens: graphTokens,
          type: 'analysis',
        });
        console.log(`✅ Added filtered relationship graph (${graphTokens} tokens)`);
      } else {
        console.log(`⚠️ Filtered relationship graph too large (${graphTokens} tokens), skipping`);
        relationshipGraph += '[Filtered relationships excluded due to token limit constraints]\n';
        totalTokens += 60; // Approximate overhead for the exclusion message
      }
    }
    // --- pageEntryPoints is now defined and populated, ready for Page Analysis ---

    if (relationshipGraph.trim() !== '') {
      context += relationshipGraph;
    }

    // --- START: Add Page Analysis Section ---
    console.log(`📝 Formatting page analysis...`);
    let pageAnalysisSection = '';

    if (pageEntryPoints.size > 0 && Object.keys(componentRelationships).length > 0) {
      pageAnalysisSection = `
================================================================
Page Analysis (Direct Dependencies)
================================================================
`;
      let pageAnalysisText = '';

      for (const pageName of pageEntryPoints) {
        const rel = componentRelationships[pageName];
        if (!rel) continue;

        const directDeps = [...(rel.uses || []), ...(rel.hooks || [])];

        // Clean the file path to remove project ID
        const cleanFilePath = rel.filePath.replace(/^\d+\//, '');

        // Only include pages that actually use other components/hooks
        if (directDeps.length > 0) {
          let entry = `\nPage: ${pageName} (${cleanFilePath})\n`;
          entry += `  Uses Components/Hooks: ${directDeps.join(', ')}\n`;
          pageAnalysisText += entry;
        }
      }

      const pageAnalysisTokens = countTokens(pageAnalysisText);

      // Check token limit (leaving some room for utility methods)
      if (totalTokens + pageAnalysisTokens + 80 < maxSize * 0.95) {
        pageAnalysisSection += pageAnalysisText + '\n';
        totalTokens += pageAnalysisTokens + 80; // Add overhead for section header
        includedFiles.push({
          path: 'page-analysis',
          tokens: pageAnalysisTokens,
          type: 'analysis',
        });
        console.log(`✅ Added page analysis section (${pageAnalysisTokens} tokens)`);
      } else {
        console.log(`⚠️ Page analysis section too large (${pageAnalysisTokens} tokens), skipping`);
        pageAnalysisSection += '[Page analysis excluded due to token limit constraints]\n';
        totalTokens += 60; // Approximate overhead for the exclusion message
      }
    }

    if (pageAnalysisSection.trim() !== '') {
      context += pageAnalysisSection;
    }
    // --- END: Add Page Analysis Section ---

    // Format Context Providers section
    console.log(`📝 Formatting context providers...`);
    let contextProviderSection = '';

    if (Object.keys(contextProviders).length > 0) {
      contextProviderSection = `
================================================================
Context Providers
================================================================
`;
      for (const [contextName, providers] of Object.entries(contextProviders)) {
        const providerInfo = `${contextName}:\n  Providers: ${providers.join(', ')}\n`;
        const providerTokens = countTokens(providerInfo);
        if (totalTokens + providerTokens < maxSize * 0.9) {
          contextProviderSection += providerInfo;
          totalTokens += providerTokens;
        } else {
          break;
        }
      }
    }

    if (contextProviderSection.trim() !== '') {
      context += contextProviderSection;
    }

    // Format utility methods
    console.log(`📝 Formatting utility methods...`);
    let utilityMethodsSection = '';

    if (utilityMethods.length > 0) {
      utilityMethodsSection = `
================================================================
Utility Methods
================================================================
`;
      for (const utilityFile of utilityMethods) {
        const fileSection = `
File: ${utilityFile.filePath}
${utilityFile.signatures.join('\n\n')}
`;
        const sectionTokens = countTokens(fileSection);
        if (totalTokens + sectionTokens < maxSize) {
          utilityMethodsSection += fileSection;
          totalTokens += sectionTokens;
          includedFiles.push({
            path: utilityFile.filePath,
            tokens: sectionTokens,
            type: 'utility',
          });
        } else {
          break;
        }
      }
    }

    if (utilityMethodsSection.trim() !== '') {
      context += utilityMethodsSection;
    }

    // Log summary information
    console.log(`
=== Analysis Context Collection Summary ===
Total token count: ${totalTokens}
Included ${includedFiles.length} analysis sections
`);
    const fileTypes = [...new Set(includedFiles.map(file => file.type))];
    fileTypes.forEach(type => {
      const typeFiles = includedFiles.filter(file => file.type === type);
      console.log(
        `- ${type}: ${typeFiles.length} sections (${typeFiles.reduce((sum, file) => sum + file.tokens, 0)} tokens)`
      );
    });

    return context;
  } catch (error) {
    console.error('Error generating analysis project context:', error);
    return 'Error generating analysis project context';
  }
}
