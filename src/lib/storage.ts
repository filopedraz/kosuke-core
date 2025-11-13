import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';

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

// Upload to Digital Ocean Spaces
async function uploadFileToS3(file: globalThis.File, filename: string): Promise<string> {
  const buffer = Buffer.from(await file.arrayBuffer());

  const command = new PutObjectCommand({
    Bucket: S3_BUCKET,
    Key: filename,
    Body: buffer,
    ContentType: file.type,
    ACL: 'public-read', // Make files publicly accessible
  });

  await s3Client.send(command);
  return getFileUrl(filename);
}

/**
 * Generic file upload function
 * Uploads files to Digital Ocean Spaces in both development and production
 * @param file File to upload
 * @param prefix Optional prefix for organizing files (e.g., 'documents/', 'images/')
 * @returns URL of the uploaded file
 */
export async function uploadFile(file: globalThis.File, prefix: string = '') {
  try {
    const filename = generateFilename(file.name, prefix);
    return await uploadFileToS3(file, filename);
  } catch (error) {
    console.error('Error uploading file:', error);
    throw new Error('Failed to upload file');
  }
}
