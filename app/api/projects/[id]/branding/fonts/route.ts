import { parseLayoutForFonts } from '@/lib/utils/font-parser';
import * as fs from 'fs/promises';
import { NextResponse } from 'next/server';
import * as path from 'path';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Await params object before accessing properties
    const paramsObj = await params;
    const projectId = paramsObj.id;

    const layoutPath = path.join(process.cwd(), 'projects', projectId, 'app/layout.tsx');

    const layoutContent = await fs.readFile(layoutPath, 'utf-8');
    const fontData = parseLayoutForFonts(layoutContent);

    return NextResponse.json({ fonts: fontData });
  } catch (error) {
    console.error('Error fetching fonts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch fonts' },
      { status: 500 }
    );
  }
}
