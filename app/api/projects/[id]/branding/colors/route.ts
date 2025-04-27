import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import { z } from 'zod';
import { getSession } from '@/lib/auth/session';
import { fileExists, getFileContent, updateFile, getProjectPath } from '@/lib/fs/operations';

// Type for CSS variable
type CssVariable = {
  name: string;
  value: string;
  description?: string;
};

// Zod schema for PUT request
const UpdateColorsSchema = z.object({
  colors: z.record(z.string(), z.string()),
});

/**
 * Parse CSS variables from a CSS file
 * This function extracts CSS variables and their values
 */
function parseCssVariables(cssContent: string): CssVariable[] {
  const variables: CssVariable[] = [];
  
  // Match CSS variable declarations
  // Format: --variable-name: value;
  const regex = /(--([\w-]+)\s*:\s*([^;]+);)/g;
  let match;
  
  while ((match = regex.exec(cssContent)) !== null) {
    // Only include color-related variables
    const varName = match[2];
    const varValue = match[3].trim();
    
    // Check if it's likely a color variable (contains color-related keywords or is a color format)
    const isColorVar = 
      varName.includes('color') || 
      varName.includes('bg') || 
      varName.includes('background') || 
      varName.includes('border') ||
      varName.includes('accent') ||
      varName.includes('foreground') ||
      varName.includes('primary') ||
      varName.includes('secondary') ||
      varName.includes('muted') ||
      /^#([0-9A-F]{3}){1,2}$/i.test(varValue) || // hex color
      /rgba?\(/i.test(varValue) || // rgb/rgba color
      /hsla?\(/i.test(varValue); // hsl/hsla color
    
    if (isColorVar) {
      variables.push({
        name: '--' + varName,
        value: varValue,
      });
    }
  }
  
  return variables;
}

/**
 * Update CSS variables in a CSS file
 * This function takes the original CSS content and a map of variables to update
 */
function updateCssVariables(cssContent: string, updates: Record<string, string>): string {
  let updatedContent = cssContent;
  
  // Update each variable in the content
  Object.entries(updates).forEach(([name, value]) => {
    // Make sure the name has the -- prefix
    const varName = name.startsWith('--') ? name : `--${name}`;
    
    // Create regex to find the variable declaration
    const regex = new RegExp(`(${varName}\\s*:\\s*)([^;]+)(;)`, 'g');
    
    // Replace the value
    updatedContent = updatedContent.replace(regex, `$1${value}$3`);
  });
  
  return updatedContent;
}

// GET route handler
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Get session
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const projectId = parseInt(params.id);
    if (isNaN(projectId)) {
      return NextResponse.json({ error: 'Invalid project ID' }, { status: 400 });
    }
    
    // Get the project path
    const projectPath = getProjectPath(projectId);
    const globalsCssPath = path.join(projectPath, 'app', 'globals.css');
    
    // Check if the globals.css file exists
    const exists = await fileExists(globalsCssPath);
    if (!exists) {
      return NextResponse.json({ 
        colors: [],
        message: 'No globals.css file found for this project'
      }, { status: 200 });
    }
    
    // Read the globals.css file
    const cssContent = await getFileContent(projectId, path.join('app', 'globals.css'));
    
    // Parse CSS variables
    const cssVariables = parseCssVariables(cssContent);
    
    return NextResponse.json({ colors: cssVariables }, { status: 200 });
  } catch (error) {
    console.error('Error getting CSS variables:', error);
    return NextResponse.json(
      { error: 'Failed to get CSS variables' },
      { status: 500 }
    );
  }
}

// PUT route handler
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Get session
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const projectId = parseInt(params.id);
    if (isNaN(projectId)) {
      return NextResponse.json({ error: 'Invalid project ID' }, { status: 400 });
    }
    
    // Parse request body
    const body = await req.json();
    const validation = UpdateColorsSchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: validation.error },
        { status: 400 }
      );
    }
    
    const { colors } = validation.data;
    
    // Get the project path
    const projectPath = getProjectPath(projectId);
    const globalsCssPath = path.join(projectPath, 'app', 'globals.css');
    
    // Check if the globals.css file exists
    const exists = await fileExists(globalsCssPath);
    if (!exists) {
      return NextResponse.json(
        { error: 'No globals.css file found for this project' },
        { status: 404 }
      );
    }
    
    // Read the globals.css file
    const cssContent = await getFileContent(projectId, path.join('app', 'globals.css'));
    
    // Update CSS variables
    const updatedContent = updateCssVariables(cssContent, colors);
    
    // Write the updated content back to the file
    await updateFile(globalsCssPath, updatedContent);
    
    return NextResponse.json(
      { success: true, message: 'CSS variables updated successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error updating CSS variables:', error);
    return NextResponse.json(
      { error: 'Failed to update CSS variables' },
      { status: 500 }
    );
  }
} 