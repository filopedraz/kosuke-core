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
  type: 'text' | 'image' | 'thinking';
  content: string;
}

// Function to process message content and extract image URLs and thinking blocks
export const processMessageContent = (content: string): ContentPart[] => {
  const parts: ContentPart[] = [];

  // First, process thinking blocks
  const thinkingRegex = /<thinking>([\s\S]*?)<\/thinking>/g;
  const imageRegex = /\[Attached Image\]\(([^)]+)\)/g;

  const thinkingMatches: { match: RegExpExecArray; content: string }[] = [];

  // Extract thinking blocks first
  let thinkingMatch;
  while ((thinkingMatch = thinkingRegex.exec(content)) !== null) {
    thinkingMatches.push({
      match: thinkingMatch,
      content: thinkingMatch[1].trim(),
    });
  }

  // Process content by splitting around thinking blocks and images
  let lastIndex = 0;

  // Sort all matches by index to process them in order
  const allMatches: Array<{
    index: number;
    length: number;
    type: 'thinking' | 'image';
    content: string;
  }> = [];

  // Add thinking matches
  thinkingMatches.forEach(({ match, content: thinkingContent }) => {
    allMatches.push({
      index: match.index!,
      length: match[0].length,
      type: 'thinking',
      content: thinkingContent,
    });
  });

  // Add image matches
  imageRegex.lastIndex = 0; // Reset regex
  let imageMatch;
  while ((imageMatch = imageRegex.exec(content)) !== null) {
    allMatches.push({
      index: imageMatch.index,
      length: imageMatch[0].length,
      type: 'image',
      content: imageMatch[1],
    });
  }

  // Sort by index
  allMatches.sort((a, b) => a.index - b.index);

  // Process content in order
  allMatches.forEach(match => {
    // Add text before this match if there is any
    const textBefore = content.substring(lastIndex, match.index).trim();
    if (textBefore) {
      parts.push({ type: 'text', content: textBefore });
    }

    // Add the match (thinking or image)
    parts.push({ type: match.type, content: match.content });

    // Update last index
    lastIndex = match.index + match.length;
  });

  // Add any remaining text after the last match
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
