import fs from 'fs/promises';
import path from 'path';
import { FILE_EXPLORER } from '@/lib/constants';
import { exec as execCallback } from 'child_process';
import { promisify } from 'util';

const exec = promisify(execCallback);

/**
 * File node interface
 */
export interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: FileNode[];
  hasChanges?: boolean;
}

/**
 * Base directory for project files
 * This is where all project files will be stored
 */
const PROJECTS_DIR = process.env.PROJECTS_DIR || path.join(process.cwd(), 'projects');

/**
 * Ensure the projects directory exists
 */
export async function ensureProjectsDir(): Promise<void> {
  try {
    await fs.mkdir(PROJECTS_DIR, { recursive: true });
  } catch (error) {
    console.error('Failed to create projects directory:', error);
    throw error;
  }
}

/**
 * Get the absolute path to a project directory
 */
export function getProjectPath(projectId: number | string): string {
  return path.join(PROJECTS_DIR, projectId.toString());
}

/**
 * Create a project directory
 */
export async function createProjectDir(projectId: number | string): Promise<string> {
  const projectPath = getProjectPath(projectId);

  try {
    await fs.mkdir(projectPath, { recursive: true });
    return projectPath;
  } catch (error) {
    console.error(`Failed to create project directory for project ${projectId}:`, error);
    throw error;
  }
}

/**
 * Check if a file exists
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
 * Create a file with the given content
 */
export async function createFile(filePath: string, content: string): Promise<void> {
  try {
    // Ensure the directory exists
    const dirPath = path.dirname(filePath);
    await fs.mkdir(dirPath, { recursive: true });

    // Write the file
    await fs.writeFile(filePath, content, 'utf-8');
  } catch (error) {
    console.error(`Failed to create file ${filePath}:`, error);
    throw error;
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
 * Update a file's content
 */
export async function updateFile(filePath: string, content: string): Promise<void> {
  try {
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
 * List files in a directory recursively
 */
export async function listFilesRecursively(dirPath: string): Promise<string[]> {
  const files: string[] = [];

  async function traverse(currentPath: string, relativePath: string = '') {
    const entries = await fs.readdir(currentPath, { withFileTypes: true });

    for (const entry of entries) {
      const entryPath = path.join(currentPath, entry.name);
      const entryRelativePath = path.join(relativePath, entry.name);

      if (entry.isDirectory()) {
        await traverse(entryPath, entryRelativePath);
      } else {
        files.push(entryRelativePath);
      }
    }
  }

  await traverse(dirPath);
  return files;
}

/**
 * Copy a file
 */
export async function copyFile(sourcePath: string, destinationPath: string): Promise<void> {
  try {
    // Ensure the destination directory exists
    const destDir = path.dirname(destinationPath);
    await fs.mkdir(destDir, { recursive: true });

    await fs.copyFile(sourcePath, destinationPath);
  } catch (error) {
    console.error(`Failed to copy file from ${sourcePath} to ${destinationPath}:`, error);
    throw error;
  }
}

/**
 * Copy a directory recursively
 */
export async function copyDir(sourceDir: string, destinationDir: string): Promise<void> {
  try {
    // Create the destination directory
    await fs.mkdir(destinationDir, { recursive: true });

    // Read the source directory
    const entries = await fs.readdir(sourceDir, { withFileTypes: true });

    // Process each entry
    for (const entry of entries) {
      const srcPath = path.join(sourceDir, entry.name);
      const destPath = path.join(destinationDir, entry.name);

      if (entry.isDirectory()) {
        // Recursively copy directories
        await copyDir(srcPath, destPath);
      } else {
        // Copy files
        await fs.copyFile(srcPath, destPath);
      }
    }
  } catch (error) {
    console.error(`Failed to copy directory from ${sourceDir} to ${destinationDir}:`, error);
    throw error;
  }
}

/**
 * Delete a directory and all its contents
 */
export async function deleteDir(dirPath: string): Promise<void> {
  try {
    // First attempt: use fs.rm with recursive and force options
    try {
      await fs.rm(dirPath, { recursive: true, force: true });
      return;
    } catch (error) {
      console.warn(
        `Initial deletion attempt failed for ${dirPath}, trying fallback method:`,
        error
      );

      // Add a short delay to ensure any file locks are released
      await new Promise(resolve => setTimeout(resolve, 1000));

      // If the first attempt fails, try more aggressive approaches

      // For macOS/Linux, use multiple aggressive methods
      if (process.platform === 'darwin' || process.platform === 'linux') {
        // Handle problematic directories separately
        const problemDirs = [path.join(dirPath, '.next'), path.join(dirPath, 'node_modules')];

        // Process each problematic directory first with multiple attempts
        for (const problemDir of problemDirs) {
          try {
            const exists = await fileExists(problemDir);
            if (exists) {
              console.log(`Found problematic directory, applying special handling: ${problemDir}`);

              // Try to unlock files first
              await exec(`find "${problemDir}" -type f -exec chmod 666 {} \\;`).catch(() => {});
              await exec(`find "${problemDir}" -type d -exec chmod 777 {} \\;`).catch(() => {});

              // Try normal deletion first
              try {
                await exec(`rm -rf "${problemDir}"`);
                console.log(`${path.basename(problemDir)} directory removed`);
                continue;
              } catch {
                console.log(`Regular deletion failed for ${problemDir}, trying with sudo...`);
              }

              // If that fails and we're on macOS/Linux, try with sudo (user will get a password prompt)
              // This is a last resort since it requires user interaction
              try {
                console.log('Attempting privileged deletion - you may need to enter your password');
                await exec(`sudo rm -rf "${problemDir}"`);
                console.log(`Successfully removed ${path.basename(problemDir)} with sudo`);
              } catch (sudoError) {
                console.error(`Failed to delete with sudo: ${problemDir}`, sudoError);
              }
            }
          } catch (dirError) {
            console.error(
              `Failed to handle ${path.basename(problemDir)} directory: ${problemDir}`,
              dirError
            );
          }
        }

        // Wait a little before trying the main directory
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Now try with a more aggressive approach on the main directory
        try {
          // Try to unlock all files
          await exec(`find "${dirPath}" -type f -exec chmod 666 {} \\;`).catch(() => {});
          await exec(`find "${dirPath}" -type d -exec chmod 777 {} \\;`).catch(() => {});

          // Try normal deletion
          try {
            await exec(`rm -rf "${dirPath}"`);
            console.log(`Successfully deleted directory: ${dirPath}`);
            return;
          } catch {
            console.log(`Regular deletion failed for main directory, trying with sudo...`);
          }

          // Try with sudo as last resort
          try {
            console.log('Attempting privileged deletion - you may need to enter your password');
            await exec(`sudo rm -rf "${dirPath}"`);
            console.log(`Successfully deleted directory with sudo: ${dirPath}`);
            return;
          } catch (sudoError) {
            console.error(`Failed to delete with sudo: ${dirPath}`, sudoError);
          }
        } catch (rmError) {
          console.error(`All deletion attempts failed for: ${dirPath}`, rmError);
        }
      }
      // For Windows, use rmdir /s /q and additional techniques
      else if (process.platform === 'win32') {
        // For Windows, we have more limited options
        try {
          // Try to handle node_modules directory separately
          const nodeModulesPath = path.join(dirPath, 'node_modules');
          if (await fileExists(nodeModulesPath)) {
            await exec(`attrib -R "${nodeModulesPath}\\*.*" /S /D`);
            await exec(`rd /s /q "${nodeModulesPath}"`);
          }

          // Make everything in the main directory writable
          await exec(`attrib -R "${dirPath}\\*.*" /S /D`);
          // Then forcefully remove
          await exec(`rd /s /q "${dirPath}"`);
          return;
        } catch (rdError) {
          console.error(`Failed to delete using rd: ${dirPath}`, rdError);
        }
      }

      // If all attempts fail, don't throw to allow the API endpoint to report partial success
      console.error(
        `All deletion attempts failed for ${dirPath}. Project will be deleted from database.`
      );
    }
  } catch (error) {
    console.error(`Failed to delete directory ${dirPath}:`, error);
    // Don't throw the error to allow the project deletion to continue
  }
}

/**
 * Get all files for a project
 */
export async function getProjectFiles(projectId: number): Promise<FileNode[]> {
  try {
    const projectDir = getProjectPath(projectId);

    // Check if the project directory exists
    try {
      await fs.access(projectDir);
    } catch (error) {
      console.error(`Project directory not found: ${projectDir} (${error})`);
      return [];
    }

    // Read the directory recursively
    return readDirectoryRecursive(projectDir, '');
  } catch (error) {
    console.error('Error getting project files:', error);
    throw error;
  }
}

/**
 * Read a directory recursively
 */
async function readDirectoryRecursive(basePath: string, relativePath: string): Promise<FileNode[]> {
  const fullPath = path.join(basePath, relativePath);
  const entries = await fs.readdir(fullPath, { withFileTypes: true });

  const nodes: FileNode[] = [];

  for (const entry of entries) {
    const entryRelativePath = path.join(relativePath, entry.name);

    // Skip excluded directories
    if (entry.isDirectory() && FILE_EXPLORER.EXCLUDE_DIRS.includes(entry.name)) {
      continue;
    }

    if (entry.isDirectory()) {
      const children = await readDirectoryRecursive(basePath, entryRelativePath);

      nodes.push({
        name: entry.name,
        path: entryRelativePath,
        type: 'directory',
        children,
      });
    } else {
      nodes.push({
        name: entry.name,
        path: entryRelativePath,
        type: 'file',
        hasChanges: false,
      });
    }
  }

  // Sort directories first, then files, both alphabetically
  return nodes.sort((a, b) => {
    if (a.type === 'directory' && b.type === 'file') return -1;
    if (a.type === 'file' && b.type === 'directory') return 1;
    return a.name.localeCompare(b.name);
  });
}

/**
 * Get the content of a file in a project
 */
export async function getFileContent(projectId: number, filePath: string): Promise<string> {
  try {
    const projectDir = getProjectPath(projectId);
    const fullPath = path.join(projectDir, filePath);

    // Check if the file exists
    await fs.access(fullPath);

    // Read the file content using the existing readFile function
    return await readFile(fullPath);
  } catch (error) {
    console.error('Error reading file:', error);
    throw error;
  }
}
