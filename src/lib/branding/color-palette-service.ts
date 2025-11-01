/**
 * Color Palette Service
 * AI-powered color palette generation using Claude
 */

import { extractExistingColors } from '@/lib/branding/operations';
import type { ColorVariable } from '@/lib/types/branding';
import Anthropic from '@anthropic-ai/sdk';

const SYSTEM_PROMPT = `
You are an expert UI/UX designer and color specialist.
Your task is to generate a cohesive, modern, and accessible color palette for
both light and dark modes for a web application.

You will receive a short list of user-provided keywords in the user message.
Generate the palette to be consistent with, inspired by, and reflective of
those keywords (tone, mood, industry, style), while still adhering to the
accessibility and structural requirements below.

### CRITICAL INSTRUCTIONS:
1. Return ALL existing color variables with their exact names — do not miss any.
2. IGNORE ALL EXISTING COLOR VALUES — only keep variable names and generate entirely new values.
3. Ensure proper contrast ratios for accessibility (WCAG AA compliance).
4. Create a balanced palette with primary, secondary, accent, and semantic colors.
5. Maintain semantic meaning (e.g., destructive should be red-based).
6. Output MUST be a valid JSON array of color objects, and nothing else.
7. Always maintain the format of the existing colors (OKLCH, HSL, RGB, etc.).

### INVALID EXAMPLES TO AVOID:
- "1 0 0 / 15%" ❌
- "0.5 0.2 200" ❌
- "0.5, 0.2, 200" ❌

### VALID EXAMPLES:
- "oklch(0.5 0.2 200)" ✅
- "hsl(0.5 0.2 200)" ✅
- "rgb(0.5 0.2 200)" ✅
- "#000000" ✅
`;

/**
 * Color Palette Service
 * Generates AI-powered color palettes using Claude
 */
export class ColorPaletteService {
  private client: Anthropic;

  constructor() {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY environment variable is required');
    }
    this.client = new Anthropic({ apiKey });
  }

  /**
   * Generate a color palette for a session using Claude
   */
  async generateColorPalette(
    projectId: number,
    sessionId: string,
    keywords: string = ''
  ): Promise<{
    success: boolean;
    message: string;
    colors: ColorVariable[];
    projectContent?: string;
  }> {
    try {
      console.log(`🎨 Generating color palette for project ${projectId}, session ${sessionId}`);

      // Extract existing colors to provide format context to the model
      const existingColors = await extractExistingColors(projectId, sessionId);

      console.log(`📊 Found ${existingColors.length} existing colors`);

      // Generate colors using Claude
      const generatedColors = await this.generateColorsWithClaude(
        projectId,
        keywords,
        existingColors
      );

      console.log(`✅ Successfully generated ${generatedColors.length} colors`);

      return {
        success: true,
        message: `Successfully generated ${generatedColors.length} colors`,
        colors: generatedColors,
        projectContent: '',
      };
    } catch (error) {
      console.error(`❌ Error generating color palette:`, error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to generate color palette',
        colors: [],
      };
    }
  }

  /**
   * Use Claude to generate a color palette
   */
  private async generateColorsWithClaude(
    projectId: number,
    keywords: string,
    existingColors: ColorVariable[]
  ): Promise<ColorVariable[]> {
    try {
      // Build system content with dynamic context
      const systemContent =
        SYSTEM_PROMPT +
        '\n\nExisting color variables (names only, include ALL in output):\n' +
        JSON.stringify(existingColors, null, 2) +
        `\n\nProject ID: ${projectId}` +
        '\n\nRemember: Maintain the exact format of existing colors (with wrappers like oklch(), hsl(), etc.)';

      // User prompt contains only the keywords
      const userPrompt = keywords || '';

      console.log('🤖 Calling Claude for color generation...');

      // Call Claude API with retry logic
      const response = await this.client.messages.create({
        model: 'claude-3-haiku-20240307',
        max_tokens: 4000,
        temperature: 0.7,
        system: systemContent,
        messages: [{ role: 'user', content: userPrompt }],
      });

      // Extract text from response
      const responseText = response.content[0].type === 'text' ? response.content[0].text : '';
      console.log(`📝 Claude response length: ${responseText.length} characters`);

      // Extract JSON from response
      const jsonMatch = responseText.match(/\[\s*\{[\s\S]*\}\s*\]/);
      if (!jsonMatch) {
        throw new Error('No valid JSON array found in Claude response');
      }

      const jsonStr = jsonMatch[0];
      const colorsData: ColorVariable[] = JSON.parse(jsonStr);

      // Convert to ColorVariable objects
      console.log(`✅ Successfully parsed ${colorsData.length} colors from Claude response`);
      return colorsData;
    } catch (error) {
      console.error(`❌ Error calling Claude:`, error);
      throw error;
    }
  }
}
