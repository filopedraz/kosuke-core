import { PROJECTS_DIR } from '@/lib/constants';
import { promises as fs } from 'fs';
import path from 'path';

/**
 * File system operations for project management
 */

export interface FileInfo {
  name: string;
  type: 'file' | 'directory';
  path: string;
  size?: number;
  lastModified?: Date;
  children?: FileInfo[];
}

/**
 * Get the absolute path to a project directory
 */
export function getProjectPath(projectId: number): string {
  return path.join(process.cwd(), PROJECTS_DIR, projectId.toString());
}

/**
 * Check if a file or directory exists
 */
export async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Read a file's content
 */
export async function readFile(filePath: string): Promise<string> {
  try {
    return await fs.readFile(filePath, 'utf-8');
  } catch (error) {
    console.error(`Failed to read file ${filePath}:`, error);
    throw error;
  }
}

/**
 * Create a file with the given content
 */
export async function createFile(filePath: string, content: string): Promise<void> {
  try {
    // Ensure the directory exists
    const dir = path.dirname(filePath);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(filePath, content, 'utf-8');
  } catch (error) {
    console.error(`Failed to create file ${filePath}:`, error);
    throw error;
  }
}

/**
 * Update a file's content
 */
export async function updateFile(filePath: string, content: string): Promise<void> {
  try {
    // Ensure the directory exists
    const dir = path.dirname(filePath);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(filePath, content, 'utf-8');
  } catch (error) {
    console.error(`Failed to update file ${filePath}:`, error);
    throw error;
  }
}

/**
 * Delete a file
 */
export async function deleteFile(filePath: string): Promise<void> {
  try {
    await fs.unlink(filePath);
  } catch (error) {
    console.error(`Failed to delete file ${filePath}:`, error);
    throw error;
  }
}

/**
 * Create a directory
 */
export async function createDir(dirPath: string): Promise<void> {
  try {
    await fs.mkdir(dirPath, { recursive: true });
  } catch (error) {
    console.error(`Failed to create directory ${dirPath}:`, error);
    throw error;
  }
}

/**
 * Delete a directory and all its contents
 */
export async function deleteDir(dirPath: string): Promise<void> {
  try {
    await fs.rm(dirPath, { recursive: true, force: true });
  } catch (error) {
    console.error(`Failed to delete directory ${dirPath}:`, error);
    throw error;
  }
}

/**
 * List files in a directory
 */
export async function listFiles(dirPath: string): Promise<string[]> {
  try {
    return await fs.readdir(dirPath);
  } catch (error) {
    console.error(`Failed to list files in directory ${dirPath}:`, error);
    throw error;
  }
}

/**
 * Get the content of a file in a project
 */
export async function getFileContent(projectId: number, filePath: string): Promise<string> {
  try {
    const projectDir = getProjectPath(projectId);
    const fullPath = path.join(projectDir, filePath);

    // Security check: ensure the file is within the project directory
    const resolvedPath = path.resolve(fullPath);
    const resolvedProjectDir = path.resolve(projectDir);

    if (!resolvedPath.startsWith(resolvedProjectDir)) {
      throw new Error('Invalid file path: path traversal detected');
    }

    // Check if the file exists
    if (!(await fileExists(fullPath))) {
      throw new Error(`File not found: ${filePath}`);
    }

    return await readFile(fullPath);
  } catch (error) {
    console.error(`Error reading file ${filePath} in project ${projectId}:`, error);
    throw error;
  }
}

/**
 * Get project files in a tree structure
 */
export async function getProjectFiles(projectId: number): Promise<FileInfo[]> {
  try {
    const projectDir = getProjectPath(projectId);

    if (!(await fileExists(projectDir))) {
      console.log(`Project directory not found: ${projectDir}`);
      return [];
    }

    return await readDirectoryRecursive(projectDir, '');
  } catch (error) {
    console.error(`Error getting project files for project ${projectId}:`, error);
    return [];
  }
}

/**
 * Read directory contents recursively
 */
async function readDirectoryRecursive(basePath: string, relativePath: string): Promise<FileInfo[]> {
  const currentPath = path.join(basePath, relativePath);
  const files: FileInfo[] = [];

  // Directories to exclude from recursive search
  const excludeDirs = new Set([
    '.next',
    'node_modules',
    '.git',
    'dist',
    'build',
    '__pycache__',
    'venv',
    '.venv',
    'coverage',
  ]);

  try {
    const items = await fs.readdir(currentPath, { withFileTypes: true });

    for (const item of items) {
      const itemPath = path.join(relativePath, item.name);
      const fullPath = path.join(currentPath, item.name);

      if (item.isDirectory()) {
        // Skip excluded directories
        if (excludeDirs.has(item.name)) {
          continue;
        }

        try {
          const stats = await fs.stat(fullPath);
          const children = await readDirectoryRecursive(basePath, itemPath);

          files.push({
            name: item.name,
            type: 'directory',
            path: itemPath,
            lastModified: stats.mtime,
            children,
          });
        } catch (error) {
          console.warn(`Skipping directory ${itemPath}:`, error);
        }
      } else if (item.isFile()) {
        try {
          const stats = await fs.stat(fullPath);

          files.push({
            name: item.name,
            type: 'file',
            path: itemPath,
            size: stats.size,
            lastModified: stats.mtime,
          });
        } catch (error) {
          console.warn(`Skipping file ${itemPath}:`, error);
        }
      }
    }

    return files.sort((a, b) => {
      // Directories first, then files
      if (a.type !== b.type) {
        return a.type === 'directory' ? -1 : 1;
      }
      // Then by name
      return a.name.localeCompare(b.name);
    });
  } catch (error) {
    console.error(`Failed to read directory ${currentPath}:`, error);
    return [];
  }
}
