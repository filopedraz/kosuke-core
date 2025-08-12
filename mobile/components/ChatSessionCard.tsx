import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';

type ChatSession = {
  id: string;
  title: string;
  updatedAt: Date;
  messageCount: number;
};

interface ChatSessionCardProps {
  session: ChatSession;
}

export function ChatSessionCard({ session }: ChatSessionCardProps) {
  return (
    <TouchableOpacity className="bg-card rounded-xl p-4 mx-5 mb-3 border border-border">
      <View>
        <Text className="text-base font-semibold text-card-foreground mb-2">{session.title}</Text>
        <Text className="text-sm text-muted-foreground">{session.messageCount} messages</Text>
      </View>
    </TouchableOpacity>
  );
}
