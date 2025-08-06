import { S3Client, PutObjectCommand, DeleteObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { promises as fs } from 'fs';
import path from 'path';
import { IS_PRODUCTION, STORAGE_BASE_URL, UPLOADS_DIR, DO_SPACES_ENDPOINT, DO_SPACES_REGION, DO_SPACES_BUCKET, DO_SPACES_CDN_URL } from './constants';

// Types for file info
interface FileInfo {
  name: string;
  size: number;
  lastModified: Date;
  url: string;
}

// Digital Ocean Spaces client (S3-compatible)
const s3Client = new S3Client({
  endpoint: DO_SPACES_ENDPOINT,
  region: DO_SPACES_REGION,
  credentials: {
    accessKeyId: process.env.DO_SPACES_KEY || '',
    secretAccessKey: process.env.DO_SPACES_SECRET || '',
  },
  forcePathStyle: false, // Digital Ocean Spaces uses virtual-hosted-style
});

// Ensure uploads directory exists (development only)
async function ensureUploadsDir(dir: string = UPLOADS_DIR): Promise<void> {
  if (IS_PRODUCTION) return;

  try {
    await fs.access(dir);
  } catch {
    await fs.mkdir(dir, { recursive: true });
  }
}

// Generate unique filename
function generateFilename(originalName: string, prefix: string = ''): string {
  const timestamp = Date.now();
  const sanitizedPrefix = prefix ? (prefix.endsWith('/') ? prefix : `${prefix}/`) : '';
  return `${sanitizedPrefix}${timestamp}-${originalName}`;
}

// Get file URL based on environment
function getFileUrl(filename: string): string {
  if (IS_PRODUCTION) {
    // For production, the URL will be returned by Vercel Blob
    return filename; // Vercel Blob returns the full URL
  } else {
    // For development, construct local URL
    return `${STORAGE_BASE_URL}/uploads/${filename}`;
  }
}

// Development storage functions
async function uploadFileLocal(file: globalThis.File, filename: string): Promise<string> {
  await ensureUploadsDir();

  const buffer = Buffer.from(await file.arrayBuffer());
  const filePath = path.join(UPLOADS_DIR, filename);

  // Ensure the directory exists for the file
  const fileDir = path.dirname(filePath);
  try {
    await fs.access(fileDir);
  } catch {
    await fs.mkdir(fileDir, { recursive: true });
  }

  await fs.writeFile(filePath, buffer);
  return getFileUrl(filename);
}

async function deleteFileLocal(filename: string): Promise<void> {
  try {
    const filePath = path.join(UPLOADS_DIR, filename);
    await fs.unlink(filePath);
  } catch (error) {
    // File might not exist, which is fine for delete operations
    console.warn('Could not delete local file:', filename, error);
  }
}

async function listFilesLocal(
  prefix: string = '',
  recursive: boolean = false
): Promise<FileInfo[]> {
  await ensureUploadsDir();

  const targetDir = prefix ? path.join(UPLOADS_DIR, prefix) : UPLOADS_DIR;
  const files: FileInfo[] = [];

  try {
    const items = await fs.readdir(targetDir, { withFileTypes: true });

    for (const item of items) {
      if (item.isFile()) {
        const filePath = path.join(targetDir, item.name);
        const stats = await fs.stat(filePath);
        const relativeName = prefix ? `${prefix}/${item.name}` : item.name;

        files.push({
          name: relativeName,
          size: stats.size,
          lastModified: stats.mtime,
          url: getFileUrl(relativeName),
        });
      } else if (item.isDirectory() && recursive) {
        const subPrefix = prefix ? `${prefix}/${item.name}` : item.name;
        const subFiles = await listFilesLocal(subPrefix, recursive);
        files.push(...subFiles);
      }
    }
  } catch (error) {
    console.error('Error listing local files:', error);
  }

  return files;
}

// Production storage functions (Digital Ocean Spaces)
async function uploadFileProduction(file: globalThis.File, filename: string): Promise<string> {
  try {
    const upload = new Upload({
      client: s3Client,
      params: {
        Bucket: DO_SPACES_BUCKET,
        Key: filename,
        Body: file,
        ACL: 'public-read',
        ContentType: file.type,
      },
    });

    await upload.done();
    
    // Return the CDN URL for the uploaded file
    return `${DO_SPACES_CDN_URL}/${filename}`;
  } catch (error) {
    console.error('Error uploading to Digital Ocean Spaces:', error);
    throw new Error('Failed to upload file to cloud storage');
  }
}

async function deleteFileProduction(url: string): Promise<void> {
  try {
    // Extract the key from the URL
    const key = url.replace(`${DO_SPACES_CDN_URL}/`, '');
    
    const command = new DeleteObjectCommand({
      Bucket: DO_SPACES_BUCKET,
      Key: key,
    });

    await s3Client.send(command);
  } catch (error) {
    console.error('Error deleting from Digital Ocean Spaces:', error);
    throw new Error('Failed to delete file from cloud storage');
  }
}

async function listFilesProduction(prefix: string = ''): Promise<FileInfo[]> {
  try {
    const command = new ListObjectsV2Command({
      Bucket: DO_SPACES_BUCKET,
      Prefix: prefix || undefined,
      MaxKeys: 1000,
    });

    const response = await s3Client.send(command);
    const objects = response.Contents || [];

    return objects.map(obj => ({
      name: obj.Key || '',
      size: obj.Size || 0,
      lastModified: obj.LastModified || new Date(),
      url: `${DO_SPACES_CDN_URL}/${obj.Key}`,
    }));
  } catch (error) {
    console.error('Error listing Digital Ocean Spaces files:', error);
    throw new Error('Failed to list files from cloud storage');
  }
}

// Extract filename from URL
function extractFilenameFromUrl(url: string): string {
  if (IS_PRODUCTION) {
    // For production URLs, extract the key from Digital Ocean Spaces URL
    return url.replace(`${DO_SPACES_CDN_URL}/`, '');
  } else {
    // For local URLs, extract the filename part
    const urlParts = url.split('/');
    return urlParts[urlParts.length - 1];
  }
}

// Public API functions
export async function uploadProfileImage(file: globalThis.File, userId: string | number) {
  try {
    if (IS_PRODUCTION) {
      // For production, use the full path with prefix
      const filename = generateFilename(file.name, 'profiles');
      return await uploadFileProduction(file, `profile-${userId}-${filename}`);
    } else {
      // For local development, use flat structure to avoid directory creation issues
      const timestamp = Date.now();
      const filename = `profile-${userId}-${timestamp}-${file.name}`;
      return await uploadFileLocal(file, filename);
    }
  } catch (error) {
    console.error('Error uploading profile image:', error);
    throw new Error('Failed to upload profile image');
  }
}

export async function deleteProfileImage(url: string) {
  try {
    if (!url) return;

    const filename = extractFilenameFromUrl(url);

    if (IS_PRODUCTION) {
      await deleteFileProduction(filename);
    } else {
      await deleteFileLocal(filename);
    }
  } catch (error) {
    console.error('Error deleting profile image:', error);
    throw new Error('Failed to delete profile image');
  }
}

/**
 * Generic file upload function
 * @param file File to upload
 * @param prefix Optional prefix for organizing files (e.g., 'documents/', 'images/')
 * @returns URL of the uploaded file
 */
export async function uploadFile(file: globalThis.File, prefix: string = '') {
  try {
    const filename = generateFilename(file.name, prefix);

    if (IS_PRODUCTION) {
      return await uploadFileProduction(file, filename);
    } else {
      return await uploadFileLocal(file, filename);
    }
  } catch (error) {
    console.error('Error uploading file:', error);
    throw new Error('Failed to upload file');
  }
}

/**
 * Delete a file by its URL
 * @param url URL of the file to delete
 */
export async function deleteFile(url: string) {
  try {
    if (!url) return;

    const filename = extractFilenameFromUrl(url);

    if (IS_PRODUCTION) {
      await deleteFileProduction(filename);
    } else {
      await deleteFileLocal(filename);
    }
  } catch (error) {
    console.error('Error deleting file:', error);
    throw new Error('Failed to delete file');
  }
}

/**
 * List files in a directory
 * @param prefix Directory prefix to list files from (e.g., 'documents/', 'images/')
 * @param recursive Whether to list files recursively in subdirectories
 * @returns Array of objects containing file info
 */
export async function listFiles(
  prefix: string = '',
  recursive: boolean = false
): Promise<FileInfo[]> {
  try {
    if (IS_PRODUCTION) {
      // Note: Digital Ocean Spaces lists all files with the prefix by default
      // (recursive behavior is built-in for S3-compatible storage)
      return await listFilesProduction(prefix);
    } else {
      return await listFilesLocal(prefix, recursive);
    }
  } catch (error) {
    console.error('Error listing files:', error);
    throw new Error('Failed to list files');
  }
}
