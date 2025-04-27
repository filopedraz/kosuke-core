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
  scope: 'root' | 'dark' | 'light' | 'unknown';
};

// Combined color variable with light/dark variants
type ColorVariable = {
  name: string;
  lightValue: string;
  darkValue?: string; // Optional dark theme value
  scope: 'root' | 'dark' | 'light' | 'unknown';
};

// Zod schema for PUT request
const UpdateColorsSchema = z.object({
  colors: z.record(z.string(), z.string()),
});

/**
 * Parse CSS variables from a CSS file
 * Returns both root (light) and dark theme variables
 */
function parseCssVariables(cssContent: string): { light: CssVariable[], dark: CssVariable[] } {
  const lightVariables: CssVariable[] = [];
  const darkVariables: CssVariable[] = [];

  try {
    // Function to parse variables from a CSS block
    const parseBlock = (block: string, scope: 'root' | 'dark' | 'light' | 'unknown') => {
      const variables: CssVariable[] = [];
      // Match CSS variable declarations
      const regex = /--([\w-]+)\s*:\s*([^;]+);/g;
      let match;
      
      while ((match = regex.exec(block)) !== null) {
        const name = '--' + match[1];
        const value = match[2].trim();
        variables.push({ name, value, scope });
      }
      
      return variables;
    };

    // Extract root variables (light theme)
    const rootMatch = cssContent.match(/:root\s*{([^}]*)}/);
    if (rootMatch && rootMatch[1]) {
      lightVariables.push(...parseBlock(rootMatch[1], 'root'));
    }

    // Extract .dark class variables (dark theme)
    const darkMatch = cssContent.match(/\.dark\s*{([^}]*)}/);
    if (darkMatch && darkMatch[1]) {
      darkVariables.push(...parseBlock(darkMatch[1], 'dark'));
    }

    // Also try to match media query for dark mode
    const darkMediaMatch = cssContent.match(/@media\s+\(prefers-color-scheme:\s*dark\)\s*{([^}]*)}/);
    if (darkMediaMatch && darkMediaMatch[1]) {
      // Look for :root or html/body inside the media query
      const nestedRootMatch = darkMediaMatch[1].match(/:root\s*{([^}]*)}/);
      if (nestedRootMatch && nestedRootMatch[1]) {
        darkVariables.push(...parseBlock(nestedRootMatch[1], 'dark'));
      }
    }

    // If no variables found, try to find them in the entire file
    if (lightVariables.length === 0) {
      lightVariables.push(...parseBlock(cssContent, 'unknown'));
    }

    console.log(`Parsed ${lightVariables.length} light theme variables and ${darkVariables.length} dark theme variables`);
  } catch (error) {
    console.error('Error parsing CSS variables:', error);
  }

  return { light: lightVariables, dark: darkVariables };
}

/**
 * Combine light and dark variables into a single structure for easier access
 */
function combineVariables(light: CssVariable[], dark: CssVariable[]): ColorVariable[] {
  const combined: ColorVariable[] = [];
  const darkMap = new Map<string, string>();
  
  // Create a map of dark variables for quick lookup
  dark.forEach(variable => {
    darkMap.set(variable.name, variable.value);
  });
  
  // Process light variables and add dark values where available
  light.forEach(lightVar => {
    combined.push({
      name: lightVar.name,
      lightValue: lightVar.value,
      darkValue: darkMap.get(lightVar.name),
      scope: lightVar.scope
    });
  });
  
  // Add any dark variables that weren't in the light set
  dark.forEach(darkVar => {
    if (!combined.some(c => c.name === darkVar.name)) {
      combined.push({
        name: darkVar.name,
        lightValue: '', // No light value available
        darkValue: darkVar.value,
        scope: darkVar.scope
      });
    }
  });
  
  return combined;
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
      path.join(projectPath, 'public', 'globals.css'),
      // Add additional paths for theme files
      path.join(projectPath, 'app', 'theme.css'),
      path.join(projectPath, 'styles', 'theme.css'),
    ];
    
    let cssContent: string | null = null;
    let foundLocation: string | null = null;
    
    for (const location of possibleLocations) {
      if (await fileExists(location)) {
        console.log(`Found CSS file at: ${location}`);
        try {
          cssContent = await readFile(location);
          foundLocation = location;
          console.log(`Successfully read CSS file, length: ${cssContent?.length} characters`);
          break;
        } catch (readError) {
          console.error(`Error reading file at ${location}:`, readError);
        }
      }
    }

    if (!cssContent) {
      console.error('Could not find or read CSS files in any expected location.');
      return NextResponse.json({ 
        colors: [],
        message: 'No CSS files found or readable for this project'
      }, { status: 404 });
    }
    
    // Parse CSS variables for both light and dark themes
    const { light, dark } = parseCssVariables(cssContent);
    
    // Combine variables for easier consumption by the client
    const combinedColors = combineVariables(light, dark);
    
    return NextResponse.json({ 
      colors: combinedColors,
      foundLocation,
      lightCount: light.length,
      darkCount: dark.length
    }, { status: 200 });
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
    throw error;
  }
}

/**
 * Update CSS variables in a CSS file
 * This function takes the original CSS content and a map of variables to update
 * The mode parameter determines where to update the variables (light = :root, dark = .dark)
 */
function updateCssVariables(cssContent: string, updates: Record<string, string>, mode: 'light' | 'dark' = 'light'): string {
  let updatedContent = cssContent;
  
  // Get the selector based on the mode
  const selector = mode === 'light' ? ':root' : '.dark';
  
  // Find the section for the specified mode
  const sectionRegex = new RegExp(`(${selector}\\s*{)([^}]*)(})`, 'g');
  const sectionMatch = sectionRegex.exec(updatedContent);
  
  if (sectionMatch) {
    let sectionContent = sectionMatch[2];
    let updated = false;
    
    // Update each variable in the section
    Object.entries(updates).forEach(([name, value]) => {
      // Make sure the name has the -- prefix
      const varName = name.startsWith('--') ? name : `--${name}`;
      
      // Create regex to find the variable declaration within the section
      const varRegex = new RegExp(`(\\s*${varName}\\s*:\\s*)([^;]+)(;)`, 'g');
      
      // Check if the variable exists in this section
      if (varRegex.test(sectionContent)) {
        // Reset lastIndex after test
        varRegex.lastIndex = 0;
        
        // Replace the value in the section content
        sectionContent = sectionContent.replace(varRegex, `$1${value}$3`);
        console.log(`Updated ${varName} to ${value} in ${selector} section`);
        updated = true;
      } else {
        console.warn(`Variable ${varName} not found in ${selector} section, cannot update.`);
      }
    });
    
    // If any updates were made, replace the entire section in the original content
    if (updated) {
      updatedContent = updatedContent.replace(
        sectionRegex,
        `$1${sectionContent}$3`
      );
    }
  } else {
    console.warn(`Could not find ${selector} section in CSS content, cannot update variables for ${mode} mode.`);
  }
  
  return updatedContent;
}

// PUT route handler - Update a CSS color
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
    const mode = body.mode || 'light';
    
    const projectPath = getProjectPath(projectId);
    
    // Find the correct globals.css path again for writing
    const possibleLocations = [
      path.join(projectPath, 'app', 'globals.css'),
      path.join(projectPath, 'src', 'app', 'globals.css'),
      path.join(projectPath, 'styles', 'globals.css'),
      path.join(projectPath, 'css', 'globals.css'),
      path.join(projectPath, 'src', 'styles', 'globals.css'),
      path.join(projectPath, 'public', 'globals.css'),
      // Add additional paths for theme files
      path.join(projectPath, 'app', 'theme.css'),
      path.join(projectPath, 'styles', 'theme.css'),
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
        { error: 'No CSS file found to update' },
        { status: 404 }
      );
    }
    
    // Read the current content
    const currentCssContent = await readFile(globalsCssPath);
    
    // Update CSS variables with the specified mode
    const updatedContent = updateCssVariables(currentCssContent, colors, mode as 'light' | 'dark');
    
    // Write the updated content back to the file
    await fs.mkdir(path.dirname(globalsCssPath), { recursive: true });
    await updateFile(globalsCssPath, updatedContent);
    
    return NextResponse.json(
      { success: true, message: `CSS variables updated successfully in ${mode} mode` },
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

// POST route handler - Update a single CSS color variable
export async function POST(
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
    
    // Parse request body
    const body = await req.json();
    
    // Validate required fields
    if (!body.name || !body.value) {
      return NextResponse.json(
        { error: 'Missing required fields: name and value are required' },
        { status: 400 }
      );
    }
    
    const { name, value, mode = 'light' } = body;
    
    const projectPath = getProjectPath(projectId);
    
    // Find the correct globals.css path for writing
    const possibleLocations = [
      path.join(projectPath, 'app', 'globals.css'),
      path.join(projectPath, 'src', 'app', 'globals.css'),
      path.join(projectPath, 'styles', 'globals.css'),
      path.join(projectPath, 'css', 'globals.css'),
      path.join(projectPath, 'src', 'styles', 'globals.css'),
      path.join(projectPath, 'public', 'globals.css'),
      // Add additional paths for theme files
      path.join(projectPath, 'app', 'theme.css'),
      path.join(projectPath, 'styles', 'theme.css'),
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
        { error: 'No CSS file found to update' },
        { status: 404 }
      );
    }
    
    // Read the current content
    const currentCssContent = await readFile(globalsCssPath);
    
    // Prepare a single update
    const update = { [name]: value };
    
    // Update CSS variables with the specified mode
    const updatedContent = updateCssVariables(currentCssContent, update, mode as 'light' | 'dark');
    
    // Write the updated content back to the file
    await fs.mkdir(path.dirname(globalsCssPath), { recursive: true });
    await updateFile(globalsCssPath, updatedContent);
    
    return NextResponse.json(
      { 
        success: true, 
        message: `CSS variable ${name} updated successfully with value ${value} in ${mode} mode`,
        mode
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error updating CSS variable:', error);
    return NextResponse.json(
      { error: 'Failed to update CSS variable' },
      { status: 500 }
    );
  }
} 