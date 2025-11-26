/**
 * Preview resource naming conventions
 * Centralized naming for databases, containers, and services within preview sessions
 */

/**
 * Sanitize UUID parts for preview resource names
 * Replace hyphens with underscores for consistency across databases and containers
 */
function sanitizeUUID(part: string): string {
  return part.toLowerCase().replace(/-/g, '_');
}

/**
 * Generate standardized preview resource name
 * Used for databases, containers, and services within a preview session
 * Format: kosuke_preview_<projectId>_<sessionId>[_<type>]
 *
 * @param projectId - Project ID (UUID)
 * @param sessionId - Session ID (UUID)
 * @param type - Optional resource type (e.g., 'redis', 'bun', 'python')
 *               Omit for database name
 * @returns Sanitized resource name
 *
 * @example
 * generatePreviewResourceName('550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440001')
 * // => 'kosuke_preview_550e8400e29b41d4a716446655440000_550e8400e29b41d4a716446655440001'
 *
 * @example
 * generatePreviewResourceName('550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440001', 'redis')
 * // => 'kosuke_preview_550e8400e29b41d4a716446655440000_550e8400e29b41d4a716446655440001_redis'
 */
export function generatePreviewResourceName(
  projectId: string,
  sessionId: string,
  type?: string
): string {
  const name = `kosuke_preview_${sanitizeUUID(projectId)}_${sanitizeUUID(sessionId)}`;
  return type ? `${name}_${type}` : name;
}
