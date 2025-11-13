# File Handling Improvements: S3 Storage & PDF Support

## Overview

Migrates file storage from Vercel Blob to Digital Ocean Spaces (S3-compatible) and adds support for PDF document attachments in addition to images.

## Key Changes

### Storage Migration

- ✅ Migrated from Vercel Blob to Digital Ocean Spaces (S3-compatible)
- ✅ Updated storage utilities to use AWS SDK S3 client
- ✅ Removed local file serving endpoint (was dev-only)
- ✅ Updated environment variables and configuration

### File Type Support

- ✅ Added PDF document support alongside existing image support
- ✅ Updated file upload hook to handle both images and PDFs
- ✅ Enhanced file validation (10MB max size, type checking)

### Database Schema

- ✅ Added `attachments` table for file metadata
- ✅ Added `message_attachments` junction table for message-file relationships
- ✅ Tracks file URLs, types, sizes, and metadata

### Claude API Integration

- ✅ Created `MessageBuilder` utility for constructing Claude-compatible `MessageParam` structures
- ✅ Supports base64-encoded images and PDFs in message content blocks
- ✅ Updated agent service to handle structured message content

### Code Quality

- ✅ Improved type safety with proper TypeScript types
- ✅ Better error handling and validation
- ✅ Cleaner separation of concerns

## Demo

[Video demonstration](https://www.loom.com/share/2c66de78be3844dfb7e82f8dab3864b7)

## Environment Variables

New required variables:

- `S3_REGION` - Digital Ocean Spaces region
- `S3_ENDPOINT` - Spaces endpoint URL
- `S3_BUCKET` - Bucket name
- `S3_ACCESS_KEY_ID` - Access key
- `S3_SECRET_ACCESS_KEY` - Secret key

## Breaking Changes

- Removed `UPLOADS_DIR` environment variable (no longer needed)
- File serving endpoint `/api/uploads/[...filepath]` removed (files now served directly from S3)
