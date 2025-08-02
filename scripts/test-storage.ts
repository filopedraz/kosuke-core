#!/usr/bin/env npx tsx

/**
 * Test script for the new storage system
 * Tests both filesystem (development) and Vercel Blob (production) storage
 */

import { deleteFile, listFiles, uploadFile } from '../lib/storage';

async function testStorageSystem() {
  console.log('🧪 Testing Storage System');
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log('─'.repeat(50));

  try {
    // Create a test file
    const testContent = 'Hello, Storage World!';
    const testFile = new File([testContent], 'test.txt', { type: 'text/plain' });

    console.log('📁 Testing file upload...');
    const fileUrl = await uploadFile(testFile, 'test');
    console.log(`✅ File uploaded: ${fileUrl}`);

    console.log('📋 Testing file listing...');
    const files = await listFiles('test');
    console.log(`✅ Found ${files.length} files in test directory:`);
    files.forEach(file => {
      console.log(`   - ${file.name} (${file.size} bytes)`);
    });

    console.log('🗑️  Testing file deletion...');
    await deleteFile(fileUrl);
    console.log('✅ File deleted successfully');

    console.log('📋 Testing file listing after deletion...');
    const filesAfterDelete = await listFiles('test');
    console.log(`✅ Found ${filesAfterDelete.length} files in test directory`);

    console.log('─'.repeat(50));
    console.log('🎉 All storage tests passed!');
  } catch (error) {
    console.error('❌ Storage test failed:', error);
    process.exit(1);
  }
}

// Run the test
testStorageSystem().catch(console.error);

export { testStorageSystem };
