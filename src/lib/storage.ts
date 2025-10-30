import { put } from '@vercel/blob';
import { promises as fs } from 'fs';
import path from 'path';
import { IS_PRODUCTION, STORAGE_BASE_URL, UPLOADS_DIR } from './constants';

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

// Production storage functions (Vercel Blob)
async function uploadFileProduction(file: globalThis.File, filename: string): Promise<string> {
  try {
    const blob = await put(filename, file, {
      access: 'public',
    });

    return blob.url;
  } catch (error) {
    console.error('Error uploading to Vercel Blob:', error);
    throw new Error('Failed to upload file to cloud storage');
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
