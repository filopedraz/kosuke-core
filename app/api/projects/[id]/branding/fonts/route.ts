import { NextResponse } from 'next/server';
import * as fs from 'fs/promises';
import * as path from 'path';
import { parseLayoutForFonts } from '@/lib/font-parser';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const projectId = params.id;
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