import path from 'path';
import { encoding_for_model } from 'tiktoken';

import { CONTEXT } from '@/lib/constants';
import { readFile, listFilesRecursively, getProjectPath } from '../../fs/operations';

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
 * Get the context for a project
 */
export async function getProjectContext(
  projectId: number | string,
  options: {
    maxSize?: number;
    includeExtensions?: string[];
    excludeDirs?: string[];
    excludeFiles?: string[];
    specificFiles?: string[];
    includeFull?: boolean;
    includeDirectoryStructure?: boolean;
  } = {}
): Promise<string> {
  const {
    maxSize = CONTEXT.MAX_CONTEXT_SIZE,
    includeExtensions = CONTEXT.INCLUDE_EXTENSIONS,
    excludeDirs = CONTEXT.EXCLUDE_DIRS,
    excludeFiles = CONTEXT.EXCLUDE_FILES,
    specificFiles = [],
    includeDirectoryStructure = true,
  } = options;

  console.log(`📂 Starting context collection for project ${projectId}`);
  console.log(`📊 Max context size: ${maxSize} tokens`);

  const projectPath = getProjectPath(projectId);
  console.log(`📂 Project path: ${projectPath}`);

  let context = '';
  let totalTokens = 0;

  // Track files sent to the LLM
  const includedFiles: Array<{ path: string; tokens: number }> = [];
  const excludedFiles: Array<{ path: string; tokens: number; reason: string }> = [];

  // Generate directory structure if requested
  let directoryStructure = '';
  if (includeDirectoryStructure) {
    directoryStructure = await generateDirectoryStructure(projectPath, excludeDirs);
    const dirStructureTokens = countTokens(directoryStructure);

    // Only add if there's enough room for it
    if (dirStructureTokens * 2 < maxSize * 0.2) {
      // Use at most 20% for both structures
      context += directoryStructure;
      totalTokens += dirStructureTokens * 2; // Account for both instances
      console.log(`📂 Added directory structure (${dirStructureTokens} tokens x2)`);
    } else {
      console.log(`⚠️ Directory structure too large (${dirStructureTokens} tokens x2), skipping`);
    }
  }

  // If specific files are provided, only include those
  if (specificFiles.length > 0) {
    console.log(`🔍 Specific files mode: Including only ${specificFiles.length} requested files`);

    for (const filePath of specificFiles) {
      const fullPath = path.join(projectPath, filePath);
      try {
        const content = await readFile(fullPath);
        const fileContext = `
================
File: ${filePath}
================
${content}
`;
        const fileTokens = countTokens(fileContext);

        // Check if adding this file would exceed the max size
        if (totalTokens + fileTokens > maxSize) {
          console.log(`⚠️ Excluding file due to token limit: ${filePath} (${fileTokens} tokens)`);
          excludedFiles.push({
            path: filePath,
            tokens: fileTokens,
            reason: 'token limit exceeded',
          });
          context += `\n[Context truncated due to token limitations]\n`;
          break;
        }

        console.log(`✅ Including file: ${filePath} (${fileTokens} tokens)`);
        includedFiles.push({ path: filePath, tokens: fileTokens });
        context += fileContext;
        totalTokens += fileTokens;
      } catch (error) {
        console.error(`❌ Failed to read file ${filePath}:`, error);
        excludedFiles.push({ path: filePath, tokens: 0, reason: 'read error' });
      }
    }

    // Add directory structure at the end if it was included at the beginning
    if (directoryStructure) {
      context += directoryStructure;
    }

    logContextSummary(includedFiles, excludedFiles, totalTokens);
    return context;
  }

  // Otherwise, scan the project directory
  try {
    console.log(`🔍 Scanning project directory: ${projectPath}`);
    const files = await listFilesRecursively(projectPath);
    console.log(`📊 Found ${files.length} total files in project`);

    // Filter files by extension and exclude directories
    const filteredFiles = files.filter(file => {
      const ext = path.extname(file);
      const fileName = path.basename(file);

      // Check if file should be excluded
      if (excludeFiles.includes(fileName)) {
        excludedFiles.push({ path: file, tokens: 0, reason: 'excluded file' });
        return false;
      }

      // Check if file is in an excluded directory
      if (excludeDirs.some(dir => file.includes(`/${dir}/`) || file.startsWith(dir))) {
        excludedFiles.push({ path: file, tokens: 0, reason: 'excluded directory' });
        return false;
      }

      // Check if file has an included extension
      return includeExtensions.includes(ext);
    });

    console.log(`📊 ${filteredFiles.length} files match the extension and exclusion filters`);

    // Sort filtered files to prioritize important ones
    const sortedFiles = sortFilesByImportance(filteredFiles);

    // Process each file until we hit the token limit
    for (const file of sortedFiles) {
      // Skip node_modules and other unwanted paths
      if (
        file.includes('node_modules/') ||
        file.includes('.git/') ||
        file.includes('.next/') ||
        file.includes('.vscode/')
      ) {
        excludedFiles.push({ path: file, tokens: 0, reason: 'excluded path' });
        continue;
      }

      try {
        // Read the file content
        const fullPath = path.join(projectPath, file);
        const content = await readFile(fullPath);
        const relativePath = path.relative(projectPath, file);

        // Skip empty files
        if (!content.trim()) {
          excludedFiles.push({ path: relativePath, tokens: 0, reason: 'empty file' });
          continue;
        }

        // Create file context with header
        const fileContext = `
================
File: ${relativePath}
================
${content}
`;
        const fileTokens = countTokens(fileContext);

        // Check if adding this file would exceed the max size
        if (totalTokens + fileTokens > maxSize) {
          console.log(
            `⚠️ Excluding file due to token limit: ${relativePath} (${fileTokens} tokens)`
          );
          excludedFiles.push({
            path: relativePath,
            tokens: fileTokens,
            reason: 'token limit exceeded',
          });
          continue;
        }

        // Add file to context
        console.log(`✅ Including file: ${relativePath} (${fileTokens} tokens)`);
        includedFiles.push({ path: relativePath, tokens: fileTokens });
        context += fileContext;
        totalTokens += fileTokens;
      } catch (error) {
        console.error(`❌ Failed to read file ${file}:`, error);
        const relativePath = path.relative(projectPath, file);
        excludedFiles.push({ path: relativePath, tokens: 0, reason: 'read error' });
      }
    }

    // Add directory structure at the end if it was included at the beginning
    if (directoryStructure) {
      context += directoryStructure;
    }

    logContextSummary(includedFiles, excludedFiles, totalTokens);
    return context;
  } catch (error) {
    console.error('Error getting project context:', error);
    return 'Error generating project context';
  }
}

/**
 * Get a lean version of project context that only includes directory structure
 */
export async function getProjectContextOnlyDirectoryStructure(
  projectId: number | string,
  options: {
    maxSize?: number;
    excludeDirs?: string[];
  } = {}
): Promise<string> {
  const { maxSize = CONTEXT.MAX_CONTEXT_SIZE, excludeDirs = CONTEXT.EXCLUDE_DIRS } = options;

  console.log(`📂 Starting lean context collection for project ${projectId}`);
  console.log(`📊 Max context size: ${maxSize} tokens`);

  const projectPath = getProjectPath(projectId);
  let context = '';
  let totalTokens = 0;

  // Generate directory structure
  // Pass the excludeDirs parameter to use in filtering
  const directoryStructure = await generateDirectoryStructure(projectPath, excludeDirs);
  const dirStructureTokens = countTokens(directoryStructure);

  if (dirStructureTokens > maxSize) {
    console.log(`⚠️ Directory structure too large (${dirStructureTokens} tokens), truncating`);
    context = `[Directory structure truncated due to token limitations]\n`;
  } else {
    context = directoryStructure;
    totalTokens = dirStructureTokens;
    console.log(`📂 Added directory structure (${dirStructureTokens} tokens)`);
  }

  console.log(`\n📊 LEAN CONTEXT COLLECTION SUMMARY:`);
  console.log(`✅ Total tokens: ${totalTokens}`);
  console.log(`📂 Excluded directories: ${excludeDirs.join(', ')}`);

  return context;
}

/**
 * Log a summary of the context collection
 */
function logContextSummary(
  includedFiles: Array<{ path: string; tokens: number }>,
  excludedFiles: Array<{ path: string; tokens: number; reason: string }>,
  totalTokens: number
): void {
  console.log(`
=== Context Collection Summary ===
Total token count: ${totalTokens}
Included ${includedFiles.length} files
Excluded ${excludedFiles.length} files
`);

  // Log included files
  console.log('Included files:');
  includedFiles.forEach(file => {
    console.log(`- ${file.path} (${file.tokens} tokens)`);
  });

  // Log excluded files by reason
  console.log('\nExcluded files by reason:');
  const reasons = [...new Set(excludedFiles.map(file => file.reason))];
  reasons.forEach(reason => {
    const count = excludedFiles.filter(file => file.reason === reason).length;
    console.log(`- ${reason}: ${count} files`);
  });
}

/**
 * Sort files by importance based on file path and extension
 */
function sortFilesByImportance(files: string[]): string[] {
  // List of important file patterns (most important first)
  const importantPatterns = [
    /package\.json$/,
    /tsconfig\.json$/,
    /next\.config\.(js|ts)$/,
    /app\/page\.tsx$/,
    /app\/layout\.tsx$/,
    /app\/routes\.tsx$/,
    /app\/api\/.+\.ts$/,
    /\.env$/,
    /\.env\.local$/,
    /README\.md$/,
    /app\/.+\.tsx$/,
    /components\/.+\.tsx$/,
    /lib\/.+\.ts$/,
    /utils\/.+\.ts$/,
    /hooks\/.+\.ts$/,
  ];

  // Custom sorting function
  return [...files].sort((a, b) => {
    // Find the first pattern that matches each file
    const aImportance = importantPatterns.findIndex(pattern => pattern.test(a));
    const bImportance = importantPatterns.findIndex(pattern => pattern.test(b));

    // If both match patterns, sort by pattern importance
    if (aImportance !== -1 && bImportance !== -1) {
      return aImportance - bImportance;
    }

    // If only one matches a pattern, prioritize it
    if (aImportance !== -1) return -1;
    if (bImportance !== -1) return 1;

    // Otherwise sort alphabetically
    return a.localeCompare(b);
  });
}

/**
 * Get context for specific files
 */
export async function getFilesContext(
  projectId: number | string,
  filePaths: string[]
): Promise<string> {
  return getProjectContext(projectId, {
    specificFiles: filePaths,
    includeDirectoryStructure: true,
  });
}

/**
 * Get context for a directory
 */
export async function getDirectoryContext(
  projectId: number | string,
  dirPath: string
): Promise<string> {
  const projectPath = getProjectPath(projectId);
  const fullDirPath = path.join(projectPath, dirPath);

  try {
    const files = await listFilesRecursively(fullDirPath);
    const relativePaths = files.map(file => path.relative(projectPath, file));
    return getProjectContext(projectId, {
      specificFiles: relativePaths,
    });
  } catch (error) {
    console.error(`Error getting directory context for ${dirPath}:`, error);
    return `Error getting directory context for ${dirPath}`;
  }
}
