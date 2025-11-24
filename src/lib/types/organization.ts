export interface AdminOrganization {
  id: string;
  name: string;
  slug: string | null;
  imageUrl: string;
  isPersonal: boolean;
  createdAt: Date;

  // Aggregated metrics
  membersCount: number;
  projectsCount: number;
  totalTokensInput: number;
  totalTokensOutput: number;
  totalTokens: number;
  totalCost: string; // decimal as string
  totalLogs: number;
}

export interface OrganizationStats {
  totalOrganizations: number;
  totalTokensUsed: number;
  totalCost: string;
  totalActiveProjects: number;
  totalLogs: number;
}

export interface OrganizationDetailMetrics {
  // Token breakdown by command
  tokensByCommand: {
    command: string;
    tokensInput: number;
    tokensOutput: number;
    totalTokens: number;
    count: number;
  }[];

  // Cost trend over time
  costTrend: {
    date: string;
    cost: number;
    tokens: number;
  }[];

  // Chat metrics
  chatMetrics: {
    totalSessions: number;
    totalMessages: number;
    totalTokensFromChat: number;
  };
}
