export interface ChatSession {
  id: number;
  projectId: number;
  userId: string;
  sessionId: string;
  title: string;
  description?: string;
  status: string;
  messageCount: number;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastActivityAt: Date;
}

export interface GroupedChatSessions {
  date: string;
  data: ChatSession[];
}

export interface UseChatSessionsOptions {
  projectId: number;
  enabled?: boolean;
}

export type FlatChatSessionData = ChatSession | { type: 'separator'; date: string; id: string };
