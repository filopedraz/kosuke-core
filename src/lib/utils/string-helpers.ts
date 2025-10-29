/**
 * Converts a project name to dash-case for GitHub repository naming
 * Examples: "My Awesome Project" -> "my-awesome-project"
 */
export function toDashCase(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with dashes
    .replace(/-+/g, '-') // Replace multiple dashes with single dash
    .replace(/^-|-$/g, ''); // Remove leading/trailing dashes
}

/**
 * Validates GitHub repository name
 */
export function isValidRepoName(name: string): boolean {
  return /^[a-zA-Z0-9._-]+$/.test(name) && name.length > 0 && name.length <= 100;
}
