import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import { promisify } from 'util';
import { exec as execCallback } from 'child_process';

import { getSession } from '@/lib/auth/session';
import { getProjectById } from '@/lib/db/projects';
import { getProjectFiles, getProjectPath, deleteDir, fileExists } from '@/lib/fs/operations';

const exec = promisify(execCallback);

/**
 * GET /api/projects/[id]/files
 * Get files for a specific project
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Get the session
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const projectId = Number(id);
    if (isNaN(projectId)) {
      return NextResponse.json(
        { error: 'Invalid project ID' },
        { status: 400 }
      );
    }

    // Get the project
    const project = await getProjectById(projectId);
    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    // Check if the user has access to the project
    if (project.createdBy !== session.user.id) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    // Get the project files using the shared file operations
    const files = await getProjectFiles(projectId);

    return NextResponse.json({ files });
  } catch (error) {
    console.error('Error getting project files:', error);
    return NextResponse.json(
      { error: 'Failed to get project files' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/projects/[id]/files
 * Delete all files for a specific project
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Get the session
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const projectId = Number(id);
    if (isNaN(projectId)) {
      return NextResponse.json(
        { error: 'Invalid project ID' },
        { status: 400 }
      );
    }

    // Get the project
    const project = await getProjectById(projectId);
    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    // Check if the user has access to the project
    if (project.createdBy !== session.user.id) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    // Get the project directory path
    const projectDir = getProjectPath(projectId);
    let warning = null;

    // First, proactively handle node_modules which often causes issues
    try {
      const nodeModulesPath = path.join(projectDir, 'node_modules');
      if (await fileExists(nodeModulesPath)) {
        console.log(`Proactively removing node_modules at ${nodeModulesPath}`);
        
        // On macOS/Linux
        if (process.platform === 'darwin' || process.platform === 'linux') {
          // Make it fully writable
          await exec(`chmod -R 777 "${nodeModulesPath}"`);
          // Force delete
          await exec(`rm -rf "${nodeModulesPath}"`);
        }
        // On Windows
        else if (process.platform === 'win32') {
          await exec(`attrib -R "${nodeModulesPath}\\*.*" /S /D`);
          await exec(`rd /s /q "${nodeModulesPath}"`);
        }
        
        console.log(`Successfully removed node_modules directory`);
      }
    } catch (nodeModulesError) {
      console.error(`Failed to pre-delete node_modules:`, nodeModulesError);
      // Continue with the rest of the deletion
    }

    // Try to delete the project directory but don't fail if it can't be deleted
    try {
      await deleteDir(projectDir);
      console.log(`Successfully deleted project directory: ${projectDir}`);
    } catch (dirError) {
      console.error(`Error deleting project directory: ${projectDir}`, dirError);
      warning = "Project deleted but some files could not be removed";
      
      // Try one more time with direct system commands as a last resort
      try {
        console.log("Attempting last resort cleanup...");
        if (process.platform === 'darwin' || process.platform === 'linux') {
          // Use sudo if available, otherwise fall back to regular rm
          try {
            // First try to at least clean node_modules as it's often the biggest issue
            await exec(`rm -rf "${path.join(projectDir, 'node_modules')}"`);
            await exec(`rm -rf "${path.join(projectDir, '.next')}"`);
          } catch (e) {
            console.error("Error in last resort cleanup:", e);
          }
        }
      } catch (finalError) {
        console.error("Final cleanup attempt failed:", finalError);
      }
    }

    // Always return success so the project can be deleted from the database
    return NextResponse.json({ 
      success: true,
      warning
    });
  } catch (error) {
    console.error('Error in DELETE project files handler:', error);
    // Even in case of other errors, we want to allow the project deletion to continue
    return NextResponse.json({ 
      success: true,
      warning: "An error occurred during file deletion, but project will be deleted"
    });
  }
} 