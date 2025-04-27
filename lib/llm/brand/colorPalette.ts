import { ChatMessage } from '@/lib/llm/api/ai';
import { generateText, CoreMessage } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { getModelForUser } from '@/lib/models';
import { countTokens, formatTokenCount } from '@/lib/llm/utils';
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

// Core message content type for Vercel AI SDK
type CoreMessageContent = {
  type: 'text' | 'image_url';
  text?: string;
  image_url?: {
    url: string;
    detail?: 'auto' | 'low' | 'high';
  };
};

type FormattedMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string | CoreMessageContent[];
};

/**
 * Generate a color palette using Gemini 2.5 Pro
 */
export async function generateColorPalette(
  projectId: number,
  existingColors: CssVariable[],
  projectHomePage: string,
  keywords: string = ''
): Promise<GeneratePaletteResponse> {
  try {
    // Get the user's model info
    const userModel = await getModelForUser();
    console.log(
      `🎨 Using ${userModel.model} for color palette generation (tier: ${userModel.tier})`
    );

    // Create an organized prompt for the AI
    const messages: ChatMessage[] = [
      {
        role: 'system',
        content: `You are an expert UI/UX designer and color specialist. Your task is to generate a cohesive, modern, and accessible color palette for both light and dark modes. 
        
Follow these requirements:
1. CRITICAL: Return ALL existing color variables with their exact names - do not miss any!
2. IGNORE ALL EXISTING COLOR VALUES - only keep the variable names and generate entirely new color values
3. Ensure proper contrast ratios for accessibility (WCAG AA compliance)
4. Create a balanced palette with primary, secondary, and accent colors
5. Maintain semantic meaning of color variables (e.g., destructive should be red-based)
6. Format ALL output as a valid JSON array of color objects
7. All colors should be in HSL format as string like "220 100% 50%" (NOT hsl(220, 100%, 50%))
8. Return only the JSON array, no explanations or additional text
9. IMPORTANT: Your response MUST include ALL existing color variables without exception

Example output format:
[
  {
    "name": "--background",
    "lightValue": "0 0% 100%",
    "darkValue": "240 10% 3.9%",
    "scope": "root"
  },
  {
    "name": "--foreground",
    "lightValue": "240 10% 3.9%",
    "darkValue": "0 0% 98%",
    "scope": "root"
  }
]`,
      },
      {
        role: 'user',
        content: `Generate a color palette for my website. Here are my existing color variables which MUST ALL be included in your response:
${JSON.stringify(existingColors, null, 2)}

Project ID: ${projectId}
${projectHomePage ? `\nProject content summary (for context):\n${projectHomePage.substring(0, 500)}${projectHomePage.length > 500 ? '...' : ''}` : ''}
${keywords ? `\nKeywords to influence the palette: ${keywords}` : ''}

Create a cohesive, modern color palette ${keywords ? ` with influence from the provided keywords` : ''}. You MUST include ALL existing color variables in your response - do not miss any variables that were in the input list.`,
      },
    ];

    // Print debug information for the request
    console.log('\n========== DEBUGGING LLM REQUEST ==========');

    // Log keywords if provided
    if (keywords) {
      console.log(`Using keywords for palette generation: "${keywords}"`);
    }

    // Count tokens in each message
    let totalTokens = 0;
    messages.forEach((msg, i) => {
      const content = typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content);
      const tokenCount = countTokens(content);
      totalTokens += tokenCount;
      console.log(`Message ${i} (${msg.role}) - Tokens: ${formatTokenCount(tokenCount)}`);
      // Print a preview of the content
      const preview = content.length > 300 ? content.substring(0, 300) + '...' : content;
      console.log(`Content preview: ${preview.replace(/\n/g, ' ')}`);
    });

    console.log(`Total tokens for request: ${formatTokenCount(totalTokens)}`);
    console.log('===========================================\n');

    // Make sure we have the API key
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY is not set in environment variables');
    }

    // Create Google provider with the API key
    const googleProvider = createGoogleGenerativeAI({
      apiKey: process.env.GEMINI_API_KEY,
    });

    // Format messages for Google
    const formattedMessages = messages.map(msg => {
      if (typeof msg.content === 'string') {
        return {
          role: msg.role,
          content: msg.content,
        } as FormattedMessage;
      } else {
        return {
          role: msg.role,
          content: msg.content.map(part => {
            if (part.type === 'text') {
              return { type: 'text', text: part.text };
            } else if (part.type === 'image') {
              return {
                type: 'image_url',
                image_url: part.image_url,
              } as CoreMessageContent;
            }
            return part as CoreMessageContent;
          }),
        } as FormattedMessage;
      }
    });

    console.log(`Color palette prompt prepared with ${formattedMessages.length} messages`);

    // Call Gemini model directly using generateText from the 'ai' package
    console.log(`Calling ${userModel.model} for color palette generation...`);
    const startTime = Date.now();

    const response = await generateText({
      model: googleProvider(userModel.model),
      messages: formattedMessages as CoreMessage[],
      temperature: 0.5,
      maxTokens: 10000,
    });

    const duration = (Date.now() - startTime) / 1000;
    console.log(`Color palette generation completed in ${duration.toFixed(2)}s`);
    console.log(`Response length: ${response.text.length} characters`);

    if (!response.text || response.text.trim() === '') {
      return {
        success: false,
        message: 'Received empty response from the AI model',
      };
    }

    // Parse the response
    try {
      // Extract JSON array from response (in case AI adds explanatory text)
      const jsonMatch = response.text.match(/\[\s*\{[\s\S]*\}\s*\]/);
      const jsonStr = jsonMatch ? jsonMatch[0] : response.text;

      console.log('Attempting to parse JSON response...');
      const colors = JSON.parse(jsonStr);

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

      console.log(`Successfully parsed palette with ${colors.length} colors`);
      return {
        success: true,
        message: 'Successfully generated color palette',
        colors,
      };
    } catch (parseError) {
      console.error('Failed to parse color palette:', parseError);
      return {
        success: false,
        message: 'Failed to parse the generated color palette',
      };
    }
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
