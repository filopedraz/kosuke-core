/**
 * Format organization name for display
 * - Shows "Personal Workspace" for personal organizations
 * - Shows actual name for team organizations
 */
export function getOrganizationDisplayName(
  name: string,
  isPersonal: boolean | null | undefined
): string {
  return isPersonal ? 'Personal Workspace' : name;
}
