'use client';

import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import {
  FlatList,
  SafeAreaView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { useTheme } from '@/hooks/useTheme';

// Mock messages data
const mockMessages = [
  {
    id: '1',
    role: 'user' as const,
    content: 'Hello! I need help setting up a new React project.',
    createdAt: new Date('2024-01-15T10:30:00'),
  },
  {
    id: '2',
    role: 'assistant' as const,
    content: 'I\'d be happy to help you set up a new React project! Let\'s start by creating a new project using Create React App or Vite. Which would you prefer?',
    createdAt: new Date('2024-01-15T10:31:00'),
  },
  {
    id: '3',
    role: 'user' as const,
    content: 'I\'d like to use Vite for better performance.',
    createdAt: new Date('2024-01-15T10:32:00'),
  },
  {
    id: '4',
    role: 'assistant' as const,
    content: 'Great choice! Vite is indeed faster for development. Here\'s how to set up a new React project with Vite:\n\n```bash\nnpm create vite@latest my-react-app -- --template react-ts\ncd my-react-app\nnpm install\nnpm run dev\n```\n\nThis will create a new React project with TypeScript support.',
    createdAt: new Date('2024-01-15T10:33:00'),
  },
  {
    id: '5',
    role: 'user' as const,
    content: 'Perfect! The project is now running. What should I do next?',
    createdAt: new Date('2024-01-15T10:35:00'),
  },
];

// Mock session data
const mockSessions: { [key: string]: { title: string } } = {
  'session-1': { title: 'Initial project setup' },
  'session-2': { title: 'Database schema design' },
  'session-3': { title: 'API endpoint implementation' },
  'session-4': { title: 'Frontend component structure' },
  'session-5': { title: 'Authentication flow' },
};

function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

function MessageBubble({ message }: { message: typeof mockMessages[0] }) {
  const isUser = message.role === 'user';

  return (
    <View
      className={`flex-row ${isUser ? 'justify-end' : 'justify-start'} mb-4 px-4`}
    >
      <View
        className={`max-w-[80%] rounded-2xl p-3 border border-border ${
          isUser
            ? 'bg-primary rounded-br-sm'
            : 'bg-card rounded-bl-sm'
        }`}
      >
        <Text
          className={`text-base leading-6 ${
            isUser ? 'text-primary-foreground' : 'text-card-foreground'
          }`}
        >
          {message.content}
        </Text>
        <Text
          className={`text-xs mt-1 opacity-70 ${
            isUser ? 'text-primary-foreground' : 'text-muted-foreground'
          }`}
        >
          {formatTime(message.createdAt)}
        </Text>
      </View>
    </View>
  );
}

export default function SessionDetailScreen() {
  const router = useRouter();
  const { sessionId } = useLocalSearchParams<{ id: string; sessionId: string }>();
  const { getColors } = useTheme();
  const colors = getColors();

  const session = sessionId ? mockSessions[sessionId] : null;

  if (!session) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <View className="flex-1 justify-center items-center">
          <Text className="text-foreground">Session not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      {/* Header */}
      <View className="flex-row items-center px-5 py-4 border-b border-border">
        <TouchableOpacity onPress={() => router.back()} className="mr-4">
          <Ionicons name="arrow-back" size={24} color={colors.foreground} />
        </TouchableOpacity>

        <View className="flex-1 items-center">
          <Text
            className="text-lg font-semibold text-foreground text-center"
            numberOfLines={1}
          >
            {session.title}
          </Text>
        </View>

        {/* Placeholder for potential action button */}
        <View className="w-6" />
      </View>

      {/* Messages List */}
      <FlatList
        data={mockMessages}
        keyExtractor={item => item.id}
        renderItem={({ item }) => <MessageBubble message={item} />}
        contentContainerStyle={{
          paddingVertical: 20,
        }}
        showsVerticalScrollIndicator={false}
        inverted={false}
      />

      {/* Note: This is read-only as specified in the requirements */}
      <View className="p-4 bg-muted border-t border-border">
        <Text className="text-center text-muted-foreground text-sm">
          This is a read-only view of the chat session
        </Text>
      </View>
    </SafeAreaView>
  );
}
