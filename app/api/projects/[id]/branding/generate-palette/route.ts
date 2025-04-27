import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { generateColorPalette, applyColorPalette } from '@/lib/llm/brand/colorPalette';

/**
 * Generate a color palette for a project
 * ?apply=true - Generate and apply the palette
 * ?apply=false - Only generate the palette without applying (default)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Authentication would normally be checked here
    // Since we don't know exact auth implementation, skipping for now
    
    const projectId = parseInt(await params.id, 10);
    if (isNaN(projectId)) {
      return NextResponse.json(
        { success: false, message: 'Invalid project ID' },
        { status: 400 }
      );
    }

    // Check if we should apply the palette or just generate it
    const url = new URL(request.url);
    const shouldApply = url.searchParams.get('apply') === 'true';
    
    // Extract request body
    let requestBody;
    try {
      requestBody = await request.json();
    } catch {
      requestBody = {};
    }
    
    // If the request body contains colors, apply those instead of generating new ones
    let colors;
    if (shouldApply && requestBody.colors && Array.isArray(requestBody.colors)) {
      colors = requestBody.colors;
    }

    // If we don't have colors from the request body, generate new ones
    if (!colors) {
      // Extract keywords from request body
      const keywords = requestBody.keywords || '';
      
      // Fetch existing colors
      const colorsResponse = await fetch(
        `${request.nextUrl.origin}/api/projects/${projectId}/branding/colors`,
        { 
          headers: { 
            cookie: request.headers.get('cookie') || '',
          }
        }
      );

      if (!colorsResponse.ok) {
        return NextResponse.json(
          { success: false, message: 'Failed to fetch existing colors' },
          { status: 500 }
        );
      }

      const colorsData = await colorsResponse.json();
      const existingColors = colorsData.colors || [];

      // Fetch project home page to analyze
      const projectDir = path.join(process.cwd(), 'projects', projectId.toString());
      
      // Try to find the home page file (page.tsx, index.tsx, etc.)
      let homePageContent = '';
      try {
        const possiblePaths = [
          path.join(projectDir, 'app', 'page.tsx'),
          path.join(projectDir, 'app', 'page.jsx'),
          path.join(projectDir, 'app', 'index.tsx'),
          path.join(projectDir, 'app', 'index.jsx'),
          path.join(projectDir, 'pages', 'index.tsx'),
          path.join(projectDir, 'pages', 'index.jsx')
        ];

        for (const filePath of possiblePaths) {
          try {
            const content = await fs.readFile(filePath, 'utf-8');
            if (content) {
              homePageContent = content;
              break;
            }
          } catch {
            // Continue to next path
          }
        }

        // If no home page found, use the layout or another key page
        if (!homePageContent) {
          const layoutPaths = [
            path.join(projectDir, 'app', 'layout.tsx'),
            path.join(projectDir, 'app', 'layout.jsx')
          ];

          for (const filePath of layoutPaths) {
            try {
              const content = await fs.readFile(filePath, 'utf-8');
              if (content) {
                homePageContent = content;
                break;
              }
            } catch {
              // Continue to next path
            }
          }
        }
      } catch (error) {
        console.error('Error reading project files:', error);
      }

      if (!homePageContent) {
        homePageContent = "No content found. Generate a modern, accessible color palette.";
      }

      // Generate the color palette with keywords
      const paletteResult = await generateColorPalette(
        projectId,
        existingColors,
        homePageContent,
        keywords
      );

      if (!paletteResult.success || !paletteResult.colors) {
        return NextResponse.json(
          { 
            success: false, 
            message: paletteResult.message || 'Failed to generate color palette' 
          },
          { status: 500 }
        );
      }
      
      colors = paletteResult.colors;
    }

    // If we should apply the palette, do so
    if (shouldApply) {
      // Apply the generated palette to globals.css
      const applyResult = await applyColorPalette(projectId, colors);

      if (!applyResult.success) {
        return NextResponse.json(
          { 
            success: false, 
            message: applyResult.message || 'Failed to apply color palette' 
          },
          { status: 500 }
        );
      }
      
      return NextResponse.json({
        success: true,
        message: 'Successfully generated and applied color palette',
        colors: colors
      });
    }

    // Return just the generated palette without applying
    return NextResponse.json({
      success: true,
      message: 'Successfully generated color palette',
      colors: colors
    });
  } catch (error) {
    console.error('Error in generate-palette API:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: error instanceof Error ? error.message : 'Unknown error occurred' 
      },
      { status: 500 }
    );
  }
} 