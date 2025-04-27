import { generateAICompletion, ChatMessage } from '@/lib/llm/api/ai';
import fs from 'fs/promises';
import path from 'path';

/**
 * Color variable types to match API response
 */
export interface CssVariable {
  name: string;
  lightValue: string;
  darkValue?: string;
  scope: 'root' | 'dark' | 'light' | 'unknown';
}

/**
 * Response from the color palette generation
 */
export interface GeneratePaletteResponse {
  success: boolean;
  message: string;
  colors?: CssVariable[];
}

/**
 * Generate a color palette using Gemini 2.5 Pro
 */
export async function generateColorPalette(
  projectId: number,
  existingColors: CssVariable[],
  projectHomePage: string
): Promise<GeneratePaletteResponse> {
  try {
    // Create an organized prompt for the AI
    const messages: ChatMessage[] = [
      {
        role: 'system',
        content: `You are an expert UI/UX designer and color specialist. Your task is to analyze the provided website content and existing colors, then generate a cohesive, modern, and accessible color palette for both light and dark modes. 
        
Follow these requirements:
1. Keep the palette cohesive with the existing design
2. Ensure proper contrast ratios for accessibility (WCAG AA compliance)
3. Create a balanced palette with primary, secondary, and accent colors
4. Maintain semantic meaning of color variables (e.g., destructive should be red-based)
5. Format ALL output as a valid JSON array of color objects
6. All colors should be in HSL format as string like "220 100% 50%" (NOT hsl(220, 100%, 50%))
7. Return only the JSON array, no explanations or additional text

Example output format:
[
  {
    "name": "--background",
    "lightValue": "0 0% 100%",
    "darkValue": "240 10% 3.9%",
    "scope": "root"
  },
  // more colors...
]`,
      },
      {
        role: 'user',
        content: `I need you to generate a color palette for my project. Here's the data:

Project ID: ${projectId}

Existing color variables:
${JSON.stringify(existingColors, null, 2)}

Project home page content:
${projectHomePage}

Please analyze this and generate a cohesive, modern color palette. Return it as a valid JSON array of color objects that I can directly use in my application.`,
      },
    ];

    // Call Gemini 2.5 Pro with our prompt
    const completion = await generateAICompletion(messages, {
      temperature: 0.7,
      maxTokens: 2048,
    });

    // Parse the response
    let colors: CssVariable[];
    try {
      // Extract JSON array from response (in case AI adds explanatory text)
      const jsonMatch = completion.text.match(/\[\s*\{[\s\S]*\}\s*\]/);
      const jsonStr = jsonMatch ? jsonMatch[0] : completion.text;
      colors = JSON.parse(jsonStr);

      // Validate the response has the correct structure
      if (!Array.isArray(colors) || colors.length === 0) {
        throw new Error('Invalid color palette format');
      }

      // Ensure each color has required properties
      colors.forEach(color => {
        if (!color.name || !color.lightValue || !color.scope) {
          throw new Error('Color missing required properties');
        }
      });
    } catch (parseError) {
      console.error('Failed to parse color palette:', parseError);
      return {
        success: false,
        message: 'Failed to parse the generated color palette',
      };
    }

    return {
      success: true,
      message: 'Successfully generated color palette',
      colors,
    };
  } catch (error) {
    console.error('Error generating color palette:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

/**
 * Apply a generated color palette to a project's globals.css file
 */
export async function applyColorPalette(
  projectId: number,
  colors: CssVariable[]
): Promise<{ success: boolean; message: string }> {
  try {
    // Find the project's globals.css file
    const projectDir = path.join(process.cwd(), 'projects', projectId.toString());
    const globalsPath = path.join(projectDir, 'app', 'globals.css');

    // Read the current file content
    let cssContent = await fs.readFile(globalsPath, 'utf-8');

    // Create the CSS variables blocks
    const rootVariables: string[] = [];
    const darkVariables: string[] = [];

    // Process each color
    colors.forEach(color => {
      if (color.scope === 'root' || color.scope === 'light') {
        rootVariables.push(`  ${color.name}: ${color.lightValue};`);
      }

      if (color.darkValue && (color.scope === 'root' || color.scope === 'dark')) {
        darkVariables.push(`  ${color.name}: ${color.darkValue};`);
      }
    });

    // Create CSS blocks
    const rootBlock = `:root {\n${rootVariables.join('\n')}\n}`;
    const darkBlock = darkVariables.length > 0 ? `.dark {\n${darkVariables.join('\n')}\n}` : '';

    // Check if the file already has color variables defined
    const rootRegex = /:root\s*{[^}]*}/;
    const darkRegex = /\.dark\s*{[^}]*}/;

    // Replace or add CSS variable blocks
    if (rootRegex.test(cssContent)) {
      cssContent = cssContent.replace(rootRegex, rootBlock);
    } else {
      // Add after any @import statements
      const importEndIndex = cssContent.lastIndexOf('@import');
      if (importEndIndex >= 0) {
        const nextLineIndex = cssContent.indexOf('\n', importEndIndex);
        cssContent =
          nextLineIndex >= 0
            ? cssContent.slice(0, nextLineIndex + 1) +
              '\n' +
              rootBlock +
              '\n' +
              cssContent.slice(nextLineIndex + 1)
            : cssContent + '\n\n' + rootBlock;
      } else {
        cssContent = rootBlock + '\n\n' + cssContent;
      }
    }

    // Handle dark mode variables
    if (darkBlock) {
      if (darkRegex.test(cssContent)) {
        cssContent = cssContent.replace(darkRegex, darkBlock);
      } else {
        // Add after :root block
        const rootEndIndex = cssContent.indexOf('}', cssContent.indexOf(':root'));
        if (rootEndIndex >= 0) {
          cssContent =
            cssContent.slice(0, rootEndIndex + 1) +
            '\n\n' +
            darkBlock +
            cssContent.slice(rootEndIndex + 1);
        } else {
          cssContent += '\n\n' + darkBlock;
        }
      }
    }

    // Write the updated content back to the file
    await fs.writeFile(globalsPath, cssContent, 'utf-8');

    return {
      success: true,
      message: 'Successfully applied color palette to globals.css',
    };
  } catch (error) {
    console.error('Error applying color palette:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}
