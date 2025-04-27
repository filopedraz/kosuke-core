/**
 * Test script for the color palette generator
 *
 * Usage:
 * npm run test:palette <projectId>
 *
 * Example:
 * npm run test:palette 30
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { generateColorPalette, CssVariable } from '../lib/llm/brand/colorPalette';

// Get the project ID from command line arguments
const projectId = process.argv[2];
if (!projectId || isNaN(parseInt(projectId))) {
  console.error('❌ Please provide a valid project ID');
  console.log('Usage: npm run test:palette <projectId>');
  process.exit(1);
}

async function testColorPalette(): Promise<void> {
  console.log(`🧪 Testing color palette generator for project ID: ${projectId}`);

  try {
    // Step 1: Read the project's CSS file to get existing colors
    console.log('\n📁 Step 1: Reading globals.css...');
    const projectDir = path.join(process.cwd(), 'projects', projectId);
    const globalsPath = path.join(projectDir, 'app', 'globals.css');

    let cssContent: string;
    try {
      cssContent = await fs.readFile(globalsPath, 'utf-8');
      console.log(`✅ Successfully read globals.css (${cssContent.length} bytes)`);
      console.log(
        `📊 First 100 characters: ${cssContent.substring(0, 100).replace(/\n/g, '\\n')}...`
      );
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      console.error(`❌ Error reading globals.css: ${error.message}`);
      throw new Error('Failed to read CSS file');
    }

    // Step 2: Parse CSS variables
    console.log('\n🔍 Step 2: Parsing CSS variables...');
    const existingColors = extractCssVariables(cssContent);
    console.log(`✅ Found ${existingColors.length} color variables`);
    console.log('📊 Sample of color variables:');
    existingColors.slice(0, 3).forEach(color => {
      console.log(
        `   - ${color.name}: ${color.lightValue}${color.darkValue ? ` (dark: ${color.darkValue})` : ''}`
      );
    });

    // Step 3: Read a project file for content analysis
    console.log('\n📄 Step 3: Reading project homepage...');
    let homePageContent = '';
    const possiblePaths = [
      path.join(projectDir, 'app', 'page.tsx'),
      path.join(projectDir, 'app', 'page.jsx'),
      path.join(projectDir, 'app', 'layout.tsx'),
      path.join(projectDir, 'app', 'layout.jsx'),
    ];

    for (const filePath of possiblePaths) {
      try {
        const content = await fs.readFile(filePath, 'utf-8');
        if (content) {
          homePageContent = content;
          console.log(`✅ Found content in ${filePath} (${content.length} bytes)`);
          break;
        }
      } catch {
        // Continue to next path
      }
    }

    if (!homePageContent) {
      homePageContent = 'No content found. Generate a modern, accessible color palette.';
      console.log('⚠️ No project files found, using fallback content');
    }

    // Step 4: Call our color palette generator
    console.log('\n🤖 Step 4: Calling color palette generator...');
    const result = await generateColorPalette(parseInt(projectId), existingColors, homePageContent);

    // Step 5: Handle the result
    console.log('\n✨ Step 5: Processing result...');
    if (!result.success || !result.colors || result.colors.length === 0) {
      console.error(`❌ Failed to generate color palette: ${result.message}`);
    } else {
      console.log(`✅ Successfully generated ${result.colors.length} colors`);
      console.log('📊 Generated palette sample:');
      result.colors.slice(0, 5).forEach(color => {
        console.log(
          `   - ${color.name}: ${color.lightValue}${color.darkValue ? ` (dark: ${color.darkValue})` : ''}`
        );
      });

      // Step 6: Simulate applying to CSS
      console.log('\n📝 Step 6: Simulating CSS update...');
      const { rootBlock, darkBlock } = generateCssBlocks(result.colors);
      console.log('📊 Generated CSS blocks:');
      console.log(`\n:root block:\n${rootBlock.substring(0, 200)}...\n`);
      if (darkBlock) {
        console.log(`\n.dark block:\n${darkBlock.substring(0, 200)}...\n`);
      }
    }

    console.log('\n🏁 Test completed!');
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));
    console.error(`\n❌ Test failed: ${err.message}`);
    console.error(err);
  }
}

/**
 * Extract CSS variables from a CSS file
 */
function extractCssVariables(cssContent: string): CssVariable[] {
  const variables: CssVariable[] = [];

  // Extract root variables
  const rootMatch = cssContent.match(/:root\s*{([^}]*)}/);
  if (rootMatch && rootMatch[1]) {
    const rootVars = rootMatch[1].match(/--[\w-]+:\s*[^;]+;/g) || [];
    rootVars.forEach(varDef => {
      const parts = varDef.match(/(--([\w-]+)):\s*([^;]+);/);
      if (parts) {
        variables.push({
          name: parts[1],
          lightValue: parts[3].trim(),
          scope: 'root',
        });
      }
    });
  }

  // Extract dark theme variables
  const darkMatch = cssContent.match(/\.dark\s*{([^}]*)}/);
  if (darkMatch && darkMatch[1]) {
    const darkVars = darkMatch[1].match(/--[\w-]+:\s*[^;]+;/g) || [];
    darkVars.forEach(varDef => {
      const parts = varDef.match(/(--([\w-]+)):\s*([^;]+);/);
      if (parts) {
        // Check if this variable already exists
        const existingVar = variables.find(v => v.name === parts[1]);
        if (existingVar) {
          existingVar.darkValue = parts[3].trim();
        } else {
          variables.push({
            name: parts[1],
            lightValue: '',
            darkValue: parts[3].trim(),
            scope: 'dark',
          });
        }
      }
    });
  }

  return variables;
}

/**
 * Generate CSS blocks from a palette
 */
function generateCssBlocks(colors: CssVariable[]): { rootBlock: string; darkBlock: string } {
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

  return { rootBlock, darkBlock };
}

// Run the test
testColorPalette().catch(err => {
  console.error('Unhandled error:', err);
  process.exit(1);
});
