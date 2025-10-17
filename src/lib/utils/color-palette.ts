/**
 * Color palette generation using Agent microservice
 */

import { AGENT_SERVICE_URL } from '@/lib/constants';
import type { ColorPaletteResult } from '@/lib/types/branding';

// Backend response format (snake_case)
interface BackendColorVariable {
  name: string;
  light_value: string;
  dark_value?: string;
  scope: 'root' | 'dark' | 'light' | 'unknown';
  description?: string;
}

// Extended color format for apply function
interface ExtendedColor {
  name: string;
  value: string;
  lightValue?: string;
  darkValue?: string;
  description?: string;
}

/**
 * Generate a color palette for a project using the agent microservice
 */
export async function generateColorPalette(
  projectId: number,
  existingColors: Array<{ name: string; value: string; [key: string]: unknown }>,
  homePageContent: string,
  keywords: string
): Promise<ColorPaletteResult> {
  try {
    console.log(`🎨 Generating color palette for project ${projectId} via agent microservice`);
    console.log(`Keywords: ${keywords}`);
    console.log(`Existing colors: ${existingColors.length}`);

    // Call agent microservice (no need to send existing colors, backend extracts them)
    const response = await fetch(
      `${AGENT_SERVICE_URL}/api/projects/${projectId}/branding/generate-palette`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          keywords,
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Agent service error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();

    console.log(`✅ Successfully generated ${result.colors?.length || 0} colors`);

    // Convert backend response to frontend format
    // Each backend color has both light_value and dark_value
    // We need to return them in a format the frontend can use
    const compatibleColors =
      result.colors?.map((color: BackendColorVariable) => ({
        name: color.name,
        lightValue: color.light_value, // Keep raw value for light mode
        darkValue: color.dark_value, // Keep raw value for dark mode
        value: `oklch(${color.light_value})`, // Default value for compatibility
        description: color.description,
      })) || [];

    return {
      success: result.success,
      message: result.message,
      colors: compatibleColors,
    };
  } catch (error) {
    console.error('❌ Error generating color palette:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error occurred',
      colors: [],
    };
  }
}

/**
 * Apply a color palette to a project's CSS files using the agent microservice
 */
export async function applyColorPalette(
  projectId: number,
  colors: ExtendedColor[]
): Promise<ColorPaletteResult> {
  try {
    console.log(`🎨 Applying color palette to project ${projectId} via agent microservice`);
    console.log(`Applying ${colors.length} colors`);

    // Convert colors to the agent's expected format (snake_case)
    const formattedColors = colors.map(color => ({
      name: color.name,
      light_value:
        (color as ExtendedColor).lightValue ||
        color.value.replace(/oklch\(([^)]+)\)|hsl\(([^)]+)\)/, '$1$2'),
      dark_value: (color as ExtendedColor).darkValue,
      scope: 'root' as const,
      description: color.description,
    }));

    // Call agent microservice
    const response = await fetch(
      `${AGENT_SERVICE_URL}/api/projects/${projectId}/branding/apply-palette`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          colors: formattedColors,
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Agent service error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();

    console.log(`✅ Successfully applied ${result.appliedColors || 0} colors`);

    return {
      success: result.success,
      message: result.message,
    };
  } catch (error) {
    console.error('❌ Error applying color palette:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}
