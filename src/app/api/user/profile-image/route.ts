import { ApiErrorHandler } from '@/lib/api/errors';
import { auth } from '@/lib/auth';
import { clerkService } from '@/lib/clerk';
import { NextRequest, NextResponse } from 'next/server';

export async function PUT(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return ApiErrorHandler.unauthorized();
    }

    const formData = await request.formData();
    const file = formData.get('profileImage') as File;

    if (!file) {
      return ApiErrorHandler.badRequest('No image file provided');
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return ApiErrorHandler.badRequest('File must be an image');
    }

    // Validate file size (max 2MB - Clerk's limit, recommended 1:1 aspect ratio)
    const maxSize = 2 * 1024 * 1024; // 2MB
    if (file.size > maxSize) {
      return ApiErrorHandler.badRequest('File size must be less than 2MB');
    }

    try {
      // Update user's image using Clerk's native API
      await clerkService.updateUserImage(userId, file);

      // Get updated user to return new image URL
      const updatedUser = await clerkService.getUser(userId);

      return NextResponse.json({
        success: 'Profile image updated successfully',
        imageUrl: updatedUser.imageUrl,
      });
    } catch (uploadError) {
      console.error('Error uploading image:', uploadError);
      return ApiErrorHandler.handle(uploadError);
    }
  } catch (error) {
    console.error('Error updating profile image:', error);
    return ApiErrorHandler.handle(error);
  }
}
