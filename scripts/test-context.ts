import dotenv from 'dotenv';
dotenv.config(); // Load environment variables if needed for project paths

import * as fs from 'fs';
import * as path from 'path';
import { getProjectContextWithDirectoryStructureAndAnalysis } from '../lib/llm/utils/context';

async function testContextGeneration() {
  const projectId = 27; // Use the desired project ID
  const outputDir = './tmp'; // Directory to save the context file
  const outputFileName = `project-${projectId}-context.txt`;
  const outputFilePath = path.join(outputDir, outputFileName);

  console.log(`🧪 Testing context generation for project ID: ${projectId}`);
  console.log(`💾 Saving output to: ${outputFilePath}`);

  try {
    // Ensure output directory exists
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Call the enhanced context function
    const context = await getProjectContextWithDirectoryStructureAndAnalysis(projectId, {
      maxSize: 150000, // Adjust max size as needed
      includeUtilityMethods: true,
      analyzeRelationships: true,
    });

    // Write the context to the file
    fs.writeFileSync(outputFilePath, context);

    console.log('\n================================================================');
    console.log(`✅ Context generation test completed. Output saved to ${outputFilePath}`);
    console.log('================================================================');
  } catch (error) {
    console.error('❌ Error during context generation test:', error);
  }
}

// Run the test function
testContextGeneration();
