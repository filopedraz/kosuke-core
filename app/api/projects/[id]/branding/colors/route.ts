import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import { z } from 'zod';
import fs from 'fs/promises';
import { getSession } from '@/lib/auth/session';
import { fileExists, updateFile, getProjectPath } from '@/lib/fs/operations';

// Type for CSS variable
type CssVariable = {
  name: string;
  value: string;
  scope?: 'root' | 'dark' | 'light' | 'unknown'; // Add scope
};

// Zod schema for PUT request
const UpdateColorsSchema = z.object({
  colors: z.record(z.string(), z.string()),
});

/**
 * Parse CSS variables from a CSS file
 * Prioritizes :root, then .dark, then falls back to global scope.
 */
function parseCssVariables(cssContent: string): CssVariable[] {
  const variablesMap = new Map<string, CssVariable>();

  try {
    // Regex to match variable declarations
    const varRegex = /--([\w-]+)\s*:\s*([^;]+);/g;
    
    // Function to process a block of CSS
    const processBlock = (blockContent: string, scope: CssVariable['scope']) => {
      let match;
      while ((match = varRegex.exec(blockContent)) !== null) {
        const name = '--' + match[1];
        const value = match[2].trim();
        // Only add if not already found in a more specific scope
        if (!variablesMap.has(name)) {
          variablesMap.set(name, { name, value, scope });
        }
      }
      varRegex.lastIndex = 0; // Reset regex index
    };

    // 1. Process :root block
    const rootMatch = cssContent.match(/:root\s*{([^}]*)}/);
    if (rootMatch && rootMatch[1]) {
      processBlock(rootMatch[1], 'root');
    }

    // 2. Process .dark block (often overrides root for dark theme)
    const darkMatch = cssContent.match(/\.dark\s*{([^}]*)}/);
    if (darkMatch && darkMatch[1]) {
      processBlock(darkMatch[1], 'dark');
    }
    
    // 3. Process .light block (less common, but possible)
    const lightMatch = cssContent.match(/\.light\s*{([^}]*)}/);
    if (lightMatch && lightMatch[1]) {
      processBlock(lightMatch[1], 'light');
    }

    // 4. Fallback: Process the entire file content if specific blocks weren't found or didn't contain variables
    // AND if no root variables were found at all (to avoid adding global vars if root exists)
    if (variablesMap.size === 0) {
       processBlock(cssContent, 'unknown');
    }

    console.log(`Parsed ${variablesMap.size} unique CSS variables.`);

  } catch (error) {
    console.error('Error parsing CSS variables:', error);
  }

  // Convert map values to array
  return Array.from(variablesMap.values());
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
    
    // Create regex to find the variable declaration, ensuring it captures the full definition line
    // Looks for start of line or { or ; followed by whitespace, then the variable, :, value, ;
    const regex = new RegExp(`([;{]|^)(\s*${varName}\s*:\s*)([^;]+)(;)`, 'gm');
    
    // Replace the value part (group 3) 
    if (regex.test(updatedContent)) { // Check if variable exists before replacing
      updatedContent = updatedContent.replace(regex, `$1$2${value}$4`);
      console.log(`Updating ${varName} to ${value}`);
    } else {
      console.warn(`Variable ${varName} not found in CSS content, cannot update.`);
      // Optionally, decide whether to add the variable if it doesn't exist
      // e.g., append to :root block or create it
    }
  });
  
  return updatedContent;
}

// GET route handler - Enhanced file finding
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const projectId = parseInt(params.id);
    if (isNaN(projectId)) {
      return NextResponse.json({ error: 'Invalid project ID' }, { status: 400 });
    }
    
    const projectPath = getProjectPath(projectId);
    
    // Define possible locations for globals.css
    const possibleLocations = [
      path.join(projectPath, 'app', 'globals.css'),
      path.join(projectPath, 'src', 'app', 'globals.css'),
      path.join(projectPath, 'styles', 'globals.css'),
      path.join(projectPath, 'css', 'globals.css'),
      path.join(projectPath, 'src', 'styles', 'globals.css'),
      path.join(projectPath, 'public', 'globals.css'), // Another common location
    ];
    
    let globalsCssPath: string | null = null;
    let cssContent: string | null = null;
    
    for (const location of possibleLocations) {
      if (await fileExists(location)) {
        globalsCssPath = location;
        console.log(`Found globals.css at: ${globalsCssPath}`);
        try {
          // Use the generic readFile helper
          cssContent = await readFile(globalsCssPath);
          console.log(`Successfully read globals.css, length: ${cssContent?.length} characters`);
          break; // Stop searching once found and read
        } catch (readError) {
          console.error(`Error reading file at ${location}:`, readError);
          // Continue searching if reading fails
        }
      }
    }

    if (!cssContent) {
      console.error('Could not find or read globals.css in any expected location.');
      return NextResponse.json({ 
        colors: [],
        message: 'No globals.css file found or readable for this project'
      }, { status: 404 }); // Use 404 if not found
    }
    
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

// Helper function to read arbitrary files (ensure it's defined)
async function readFile(filePath: string): Promise<string> {
  try {
    return await fs.readFile(filePath, 'utf-8');
  } catch (error) {
    console.error(`Error reading file: ${filePath}`, error);
    throw error; // Re-throw the error to be caught by the main handler
  }
}

// PUT route handler
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const projectId = parseInt(params.id);
    if (isNaN(projectId)) {
      return NextResponse.json({ error: 'Invalid project ID' }, { status: 400 });
    }
    
    const body = await req.json();
    const validation = UpdateColorsSchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: validation.error.errors },
        { status: 400 }
      );
    }
    
    const { colors } = validation.data;
    
    const projectPath = getProjectPath(projectId);
    
     // Find the correct globals.css path again for writing
    const possibleLocations = [
      path.join(projectPath, 'app', 'globals.css'),
      path.join(projectPath, 'src', 'app', 'globals.css'),
      path.join(projectPath, 'styles', 'globals.css'),
      path.join(projectPath, 'css', 'globals.css'),
      path.join(projectPath, 'src', 'styles', 'globals.css'),
      path.join(projectPath, 'public', 'globals.css'),
    ];

    let globalsCssPath: string | null = null;
    for (const location of possibleLocations) {
      if (await fileExists(location)) {
        globalsCssPath = location;
        break;
      }
    }

    if (!globalsCssPath) {
       return NextResponse.json(
        { error: 'No globals.css file found to update' },
        { status: 404 }
      );
    }
    
    // Read the current content
    const currentCssContent = await readFile(globalsCssPath);
    
    // Update CSS variables
    const updatedContent = updateCssVariables(currentCssContent, colors);
    
    // Write the updated content back to the file
    // Ensure the directory exists before writing
    const dirPath = path.dirname(globalsCssPath);
    await fs.mkdir(dirPath, { recursive: true });
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