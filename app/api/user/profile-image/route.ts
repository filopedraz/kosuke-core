import { auth } from '@/lib/auth';
import { db } from '@/lib/db/drizzle';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { existsSync } from 'fs';
import { mkdir, writeFile } from 'fs/promises';
import { NextRequest, NextResponse } from 'next/server';
import { join } from 'path';

export async function PUT(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('profileImage') as File;

    if (!file) {
      return NextResponse.json({ error: 'No image file provided' }, { status: 400 });
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'File must be an image' }, { status: 400 });
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return NextResponse.json({ error: 'File size must be less than 5MB' }, { status: 400 });
    }

    const isProduction = process.env.NODE_ENV === 'production';
    let imageUrl: string;

    try {
      if (isProduction && process.env.BLOB_READ_WRITE_TOKEN) {
        // Production: Use Vercel Blob
        const { put } = await import('@vercel/blob');
        const blob = await put(`profile-images/${userId}-${Date.now()}-${file.name}`, file, {
          access: 'public',
        });
        imageUrl = blob.url;
      } else {
        // Development: Use local file system
        const fileName = `${userId}-${Date.now()}-${file.name}`;
        const uploadsDir = join(process.cwd(), 'public', 'uploads');

        // Ensure uploads directory exists
        if (!existsSync(uploadsDir)) {
          await mkdir(uploadsDir, { recursive: true });
        }

        // Convert file to buffer
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Write file to public/uploads
        const filePath = join(uploadsDir, fileName);
        await writeFile(filePath, buffer);

        // Set URL for local development
        imageUrl = `/uploads/${fileName}`;
      }

      // Update user's image URL in database
      await db
        .update(users)
        .set({
          imageUrl,
          updatedAt: new Date(),
        })
        .where(eq(users.clerkUserId, userId));

      return NextResponse.json({
        success: 'Profile image updated successfully',
        imageUrl,
      });
    } catch (uploadError) {
      console.error('Error uploading image:', uploadError);
      return NextResponse.json({ error: 'Failed to upload image' }, { status: 500 });
    }
  } catch (error) {
    console.error('Error updating profile image:', error);
    return NextResponse.json({ error: 'Failed to update profile image' }, { status: 500 });
  }
}
