import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import type { FileType } from './db/schema';

// S3 Client configuration for Digital Ocean Spaces
// Used for both development and production environments
const s3Client = new S3Client({
  endpoint: process.env.S3_ENDPOINT,
  region: process.env.S3_REGION,
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || '',
  },
  forcePathStyle: false, // Digital Ocean Spaces uses virtual-hosted-style
});

const S3_BUCKET = process.env.S3_BUCKET || '';

// File upload result with metadata
export interface UploadResult {
  fileUrl: string;
  filename: string; // Original filename
  storedFilename: string; // Sanitized filename used in storage
  fileType: FileType; // Uses enum from schema for type consistency
  mediaType: string; // MIME type
  fileSize: number;
}

// Generate unique filename with sanitization
function generateFilename(originalName: string, prefix: string = ''): string {
  const timestamp = Date.now();
  const sanitizedPrefix = prefix ? (prefix.endsWith('/') ? prefix : `${prefix}/`) : '';

  // Sanitize filename: replace spaces with hyphens, remove special chars except dots, hyphens, underscores
  const sanitizedName = originalName
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/[^a-zA-Z0-9._-]/g, '') // Remove special characters except . _ -
    .toLowerCase(); // Convert to lowercase for consistency

  return `${sanitizedPrefix}${timestamp}-${sanitizedName}`;
}

// Get Digital Ocean Spaces CDN URL
function getFileUrl(filename: string): string {
  const endpoint = process.env.S3_ENDPOINT || '';
  const bucket = process.env.S3_BUCKET || '';
  // Remove protocol from endpoint
  const endpointWithoutProtocol = endpoint.replace(/^https?:\/\//, '');
  return `https://${bucket}.${endpointWithoutProtocol}/${filename}`;
}

// Determine file type from MIME type
function getFileType(mediaType: string): FileType {
  if (mediaType.startsWith('image/')) {
    return 'image';
  }
  if (mediaType === 'application/pdf') {
    return 'document';
  }
  // Default to document for unsupported types
  return 'document';
}

// Upload to Digital Ocean Spaces
async function uploadFileToS3(
  file: globalThis.File,
  filename: string,
  buffer: Buffer
): Promise<UploadResult> {
  const command = new PutObjectCommand({
    Bucket: S3_BUCKET,
    Key: filename,
    Body: buffer,
    ContentType: file.type,
    ACL: 'public-read', // Make files publicly accessible
  });

  await s3Client.send(command);

  return {
    fileUrl: getFileUrl(filename),
    filename: file.name,
    storedFilename: filename,
    fileType: getFileType(file.type),
    mediaType: file.type,
    fileSize: file.size,
  };
}

/**
 * Generic file upload function
 * Uploads files to Digital Ocean Spaces in both development and production
 * @param file File to upload
 * @param prefix Optional prefix for organizing files (e.g., 'documents/', 'images/')
 * @param buffer Optional precomputed Buffer to avoid re-reading the file
 * @returns Upload result with file metadata
 */
export async function uploadFile(
  file: globalThis.File,
  prefix: string = '',
  buffer?: Buffer
): Promise<UploadResult> {
  try {
    const filename = generateFilename(file.name, prefix);
    const fileBuffer = buffer ?? Buffer.from(await file.arrayBuffer());
    return await uploadFileToS3(file, filename, fileBuffer);
  } catch (error) {
    console.error('Error uploading file:', error);
    throw new Error(
      `Failed to upload file: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}
