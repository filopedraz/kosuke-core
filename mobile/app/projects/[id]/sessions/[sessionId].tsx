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

import { useTheme } from '@/contexts/ThemeContext';

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
  const { colors } = useTheme();
  const isUser = message.role === 'user';

  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: isUser ? 'flex-end' : 'flex-start',
        marginBottom: 16,
        paddingHorizontal: 16,
      }}
    >
      <View
        style={{
          maxWidth: '80%',
          backgroundColor: isUser ? colors.primary : colors.card,
          borderRadius: 16,
          borderBottomRightRadius: isUser ? 4 : 16,
          borderBottomLeftRadius: isUser ? 16 : 4,
          padding: 12,
          borderWidth: 1,
          borderColor: colors.border,
        }}
      >
        <Text
          style={{
            fontSize: 16,
            color: isUser ? colors['primary-foreground'] : colors['card-foreground'],
            lineHeight: 22,
          }}
        >
          {message.content}
        </Text>
        <Text
          style={{
            fontSize: 12,
            color: isUser ? colors['primary-foreground'] : colors['muted-foreground'],
            marginTop: 4,
            opacity: 0.7,
          }}
        >
          {formatTime(message.createdAt)}
        </Text>
      </View>
    </View>
  );
}

export default function SessionDetailScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { sessionId } = useLocalSearchParams<{ id: string; sessionId: string }>();

  const session = sessionId ? mockSessions[sessionId] : null;

  if (!session) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ color: colors.foreground }}>Session not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 20,
          paddingVertical: 16,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        }}
      >
        <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 16 }}>
          <Ionicons name="arrow-back" size={24} color={colors.foreground} />
        </TouchableOpacity>

        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text
            style={{
              fontSize: 18,
              fontWeight: '600',
              color: colors.foreground,
              textAlign: 'center',
            }}
            numberOfLines={1}
          >
            {session.title}
          </Text>
        </View>

        {/* Placeholder for potential action button */}
        <View style={{ width: 24 }} />
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
      <View
        style={{
          padding: 16,
          backgroundColor: colors.muted,
          borderTopWidth: 1,
          borderTopColor: colors.border,
        }}
      >
        <Text
          style={{
            textAlign: 'center',
            color: colors['muted-foreground'],
            fontSize: 14,
          }}
        >
          This is a read-only view of the chat session
        </Text>
      </View>
    </SafeAreaView>
  );
}
