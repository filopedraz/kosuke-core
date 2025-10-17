import { IS_PRODUCTION, UPLOADS_DIR } from '@/lib/constants';
import { promises as fs } from 'fs';
import { NextRequest, NextResponse } from 'next/server';
import path from 'path';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ filepath: string[] }> }
) {
  // Only serve files in development
  if (IS_PRODUCTION) {
    return NextResponse.json(
      { error: 'File serving not available in production' },
      { status: 404 }
    );
  }

  try {
    const { filepath } = await params;
    const filename = filepath.join('/');

    if (!filename) {
      return NextResponse.json({ error: 'Filename is required' }, { status: 400 });
    }

    // Prevent directory traversal attacks
    const safePath = path.normalize(filename).replace(/^(\.\.[\/\\])+/, '');
    const filePath = path.join(process.cwd(), UPLOADS_DIR, safePath);

    // Ensure the file is within the uploads directory
    const uploadsPath = path.join(process.cwd(), UPLOADS_DIR);
    if (!filePath.startsWith(uploadsPath)) {
      return NextResponse.json({ error: 'Invalid file path' }, { status: 400 });
    }

    try {
      const fileBuffer = await fs.readFile(filePath);

      // Get file extension to determine content type
      const ext = path.extname(filename).toLowerCase();
      let contentType = 'application/octet-stream';

      switch (ext) {
        case '.jpg':
        case '.jpeg':
          contentType = 'image/jpeg';
          break;
        case '.png':
          contentType = 'image/png';
          break;
        case '.gif':
          contentType = 'image/gif';
          break;
        case '.webp':
          contentType = 'image/webp';
          break;
        case '.svg':
          contentType = 'image/svg+xml';
          break;
        case '.pdf':
          contentType = 'application/pdf';
          break;
        case '.txt':
          contentType = 'text/plain';
          break;
        case '.json':
          contentType = 'application/json';
          break;
      }

      return new NextResponse(fileBuffer, {
        headers: {
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=31536000, immutable',
        },
      });
    } catch (error) {
      console.error('Error reading file:', error);
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }
  } catch (error) {
    console.error('Error serving file:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
