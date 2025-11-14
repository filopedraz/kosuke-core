/**
 * Message Builder
 * Constructs Claude-compatible MessageParam structures from various inputs
 * Used to format messages for the Claude Agent SDK
 */

import type { UploadResult } from '@/lib/storage';
import type {
  DocumentBlockParam,
  ImageBlockParam,
  MessageParam,
  TextBlockParam,
  URLPDFSource,
} from '@anthropic-ai/sdk/resources';

// Supported image MIME types for Claude API
type SupportedImageMediaType = 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp';

function isSupportedImageMediaType(mediaType: string): mediaType is SupportedImageMediaType {
  return (
    mediaType === 'image/jpeg' ||
    mediaType === 'image/png' ||
    mediaType === 'image/gif' ||
    mediaType === 'image/webp'
  );
}

/**
 * Create an image block using URL source
 * Claude will fetch the image from the public URL
 */
function createImageBlock(upload: UploadResult): ImageBlockParam | TextBlockParam {
  if (!isSupportedImageMediaType(upload.mediaType)) {
    return {
      type: 'text',
      text: `Attached image available at ${upload.fileUrl}`,
    };
  }

  return {
    type: 'image',
    source: {
      type: 'url',
      url: upload.fileUrl,
    },
  } satisfies ImageBlockParam;
}

/**
 * Create a document block using URL source
 * Claude will fetch the PDF from the public URL
 */
function createDocumentBlock(upload: UploadResult): DocumentBlockParam {
  const source: URLPDFSource = {
    type: 'url',
    url: upload.fileUrl,
  };

  return {
    type: 'document',
    source,
  } satisfies DocumentBlockParam;
}

export interface MessageAttachmentPayload {
  upload: UploadResult;
  // Note: base64Data is no longer needed - we use public URLs instead
}

/**
 * Build Claude MessageParam from text and optional attachments
 * Creates properly typed content blocks for images, documents, and text
 * Uses public URLs for file attachments instead of base64 encoding
 *
 * @param text - The text content of the message
 * @param attachments - Optional array of file attachments (images or PDFs)
 * @returns MessageParam with properly structured content blocks
 *
 * @example
 * // Text only
 * buildMessageParam("Hello, Claude!");
 *
 * @example
 * // Text with single image (URL-based)
 * buildMessageParam("Analyze this image", [{ upload: uploadResult }]);
 *
 * @example
 * // Text with multiple files (URL-based)
 * buildMessageParam("Review these documents", [attachment1, attachment2]);
 */
export function buildMessageParam(
  text: string,
  attachments?: MessageAttachmentPayload[]
): MessageParam {
  const contentBlocks: Array<TextBlockParam | ImageBlockParam | DocumentBlockParam> = [];

  // Add text block if present
  if (text.trim()) {
    const textBlock: TextBlockParam = {
      type: 'text',
      text: text.trim(),
    };
    contentBlocks.push(textBlock);
  }

  // Add image or document blocks for all attachments using public URLs
  if (attachments && attachments.length > 0) {
    for (const attachment of attachments) {
      const { upload } = attachment;

      if (upload.fileType === 'image') {
        const imageBlock = createImageBlock(upload);
        contentBlocks.push(imageBlock);
      } else if (upload.fileType === 'document') {
        const documentBlock = createDocumentBlock(upload);
        contentBlocks.push(documentBlock);
      }
    }
  }

  return {
    role: 'user',
    content: contentBlocks,
  };
}
