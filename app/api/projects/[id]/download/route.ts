import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs';
import { getProjectById } from '@/lib/db/projects';
import { join } from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { readFile, unlink } from 'fs/promises';
import { CONTEXT } from '@/lib/constants';

const execAsync = promisify(exec);

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = auth();
    
    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 });
    }
    
    const { id } = await Promise.resolve(params);
    const projectId = Number(id);
    if (isNaN(projectId)) {
      return new NextResponse('Invalid project ID', { status: 400 });
    }
    
    const project = await getProjectById(projectId);
    
    if (!project || project.createdBy !== userId) {
      return new NextResponse('Project not found', { status: 404 });
    }
    
    // Get the project directory path
    const projectDir = join(process.cwd(), 'projects', projectId.toString());
    const zipFileName = `${project.name.replace(/[^a-zA-Z0-9]/g, '_')}_${projectId}.zip`;
    const zipFilePath = join('/tmp', zipFileName);
    
    // Create exclude patterns for zip command
    const excludePatterns = [
      ...CONTEXT.EXCLUDE_DIRS.map(dir => `-x "*${dir}/*"`),
      ...CONTEXT.EXCLUDE_FILES.map(file => `-x "${file}"`)
    ].join(' ');
    
    // Create zip file with exclusions
    await execAsync(`cd "${projectDir}" && zip -r "${zipFilePath}" . ${excludePatterns}`);
    
    // Read the zip file using fs.readFile
    const zipBuffer = await readFile(zipFilePath);
    
    // Delete the temporary zip file
    await unlink(zipFilePath);
    
    // Return the zip file
    return new NextResponse(zipBuffer, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${zipFileName}"`,
      },
    });
  } catch (error) {
    console.error('Error downloading project:', error);
    return new NextResponse(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Internal Server Error' }), 
      { 
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }
} 