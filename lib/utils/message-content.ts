// Utility functions for processing message content

// Function to get file name from URL
export const getFileName = (url: string): string => {
  const urlParts = url.split('/');
  let fileName = urlParts[urlParts.length - 1];

  // Remove query parameters
  if (fileName.includes('?')) {
    fileName = fileName.split('?')[0];
  }

  // Try to decode URI component to handle encoded characters
  try {
    fileName = decodeURIComponent(fileName);
  } catch {
    console.error('Error decoding file name');
    // If decoding fails, use the original
  }

  // Return the name or a default
  return fileName || 'image.png';
};

// Content part type for processed content
export interface ContentPart {
  type: 'text' | 'image';
  content: string;
}

// Function to process message content and extract image URLs
export const processMessageContent = (content: string): ContentPart[] => {
  const imageRegex = /\[Attached Image\]\(([^)]+)\)/g;
  const parts: ContentPart[] = [];

  let lastIndex = 0;
  let match;

  // Find all image matches and process text between them
  while ((match = imageRegex.exec(content)) !== null) {
    // Add text before this image if there is any
    const textBefore = content.substring(lastIndex, match.index).trim();
    if (textBefore) {
      parts.push({ type: 'text', content: textBefore });
    }

    // Add the image
    parts.push({ type: 'image', content: match[1] });

    // Update last index
    lastIndex = match.index + match[0].length;
  }

  // Add any remaining text after the last image
  const textAfter = content.substring(lastIndex).trim();
  if (textAfter) {
    parts.push({ type: 'text', content: textAfter });
  }

  // If no parts were found, treat the entire content as text
  if (parts.length === 0) {
    parts.push({ type: 'text', content });
  }

  return parts;
};
