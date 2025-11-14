/**
 * Message Builder
 * Constructs Claude-compatible MessageParam structures from various inputs
 * Used to format messages for the Claude Agent SDK
 */

import type { UploadResult } from '@/lib/storage';
import type {
  Base64ImageSource,
  Base64PDFSource,
  DocumentBlockParam,
  ImageBlockParam,
  MessageParam,
  TextBlockParam,
} from '@anthropic-ai/sdk/resources';

type SupportedImageMediaType = Base64ImageSource['media_type'];

function isSupportedImageMediaType(mediaType: string): mediaType is SupportedImageMediaType {
  return (
    mediaType === 'image/jpeg' ||
    mediaType === 'image/png' ||
    mediaType === 'image/gif' ||
    mediaType === 'image/webp'
  );
}

function createImageBlock(
  upload: UploadResult,
  base64Data: string
): ImageBlockParam | TextBlockParam {
  if (!isSupportedImageMediaType(upload.mediaType)) {
    return {
      type: 'text',
      text: `Attached image available at ${upload.fileUrl}`,
    };
  }

  return {
    type: 'image',
    source: {
      type: 'base64',
      media_type: upload.mediaType,
      data: base64Data,
    },
  } satisfies ImageBlockParam;
}

function createDocumentBlock(
  upload: UploadResult,
  base64Data: string
): DocumentBlockParam | TextBlockParam {
  const source: Base64PDFSource = {
    type: 'base64',
    media_type: 'application/pdf',
    data: base64Data,
  };

  return {
    type: 'document',
    source,
  } satisfies DocumentBlockParam;
}

export interface MessageAttachmentPayload {
  upload: UploadResult;
  base64Data: string;
}

/**
 * Build Claude MessageParam from text and optional attachments
 * Creates properly typed content blocks for images, documents, and text
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
 * // Text with single image
 * buildMessageParam("Analyze this image", [{ upload: result, base64Data }]);
 *
 * @example
 * // Text with multiple files
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

  // Add image or document blocks for all attachments
  if (attachments && attachments.length > 0) {
    for (const attachment of attachments) {
      const { upload, base64Data } = attachment;

      if (upload.fileType === 'image') {
        const imageBlock = createImageBlock(upload, base64Data);
        contentBlocks.push(imageBlock);
      } else if (upload.fileType === 'document') {
        const documentBlock = createDocumentBlock(upload, base64Data);
        contentBlocks.push(documentBlock);
      }
    }
  }

  return {
    role: 'user',
    content: contentBlocks,
  };
}
