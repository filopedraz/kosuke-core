/**
 * Color palette generation using Agent microservice
 */

// Agent service configuration
const AGENT_BASE_URL = process.env.AGENT_SERVICE_URL || 'http://localhost:8000';

export interface ColorVariable {
  name: string;
  lightValue: string;
  darkValue?: string;
  scope: 'root' | 'dark' | 'light' | 'unknown';
  description?: string;
}

export interface ColorPaletteResult {
  success: boolean;
  message?: string;
  colors?: Array<{
    name: string;
    value: string;
    description?: string;
  }>;
  applied?: boolean;
  projectContent?: string;
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

    // Convert existing colors to the agent's expected format
    const formattedExistingColors: ColorVariable[] = existingColors.map(color => ({
      name: color.name,
      lightValue: typeof color.value === 'string' ? color.value.replace(/hsl\(([^)]+)\)/, '$1') : '',
      scope: 'root' as const,
      description: color.description as string | undefined,
    }));

    // Call agent microservice
    const response = await fetch(
      `${AGENT_BASE_URL}/api/projects/${projectId}/branding/generate-palette`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          keywords,
          existingColors: formattedExistingColors,
          applyImmediately: false,
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Agent service error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    
    console.log(`✅ Successfully generated ${result.colors?.length || 0} colors`);

    // Convert back to the expected format for compatibility
    const compatibleColors = result.colors?.map((color: ColorVariable) => ({
      name: color.name,
      value: `hsl(${color.lightValue})`,
      description: color.description,
    })) || [];

    return {
      success: result.success,
      message: result.message,
      colors: compatibleColors,
      applied: result.applied,
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
  colors: Array<{ name: string; value: string; description?: string }>
): Promise<ColorPaletteResult> {
  try {
    console.log(`🎨 Applying color palette to project ${projectId} via agent microservice`);
    console.log(`Applying ${colors.length} colors`);

    // Convert colors to the agent's expected format
    const formattedColors: ColorVariable[] = colors.map(color => ({
      name: color.name,
      lightValue: color.value.replace(/hsl\(([^)]+)\)/, '$1'),
      scope: 'root' as const,
      description: color.description,
    }));

    // Call agent microservice
    const response = await fetch(
      `${AGENT_BASE_URL}/api/projects/${projectId}/branding/apply-palette`,
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
      applied: result.success,
    };

  } catch (error) {
    console.error('❌ Error applying color palette:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}
