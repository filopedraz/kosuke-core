'use client';

import { Ionicons } from '@expo/vector-icons';
import { Link, useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import {
    FlatList,
    SafeAreaView,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

import { useTheme } from '@/contexts/ThemeContext';

// Mock chat sessions data for UI development
const mockChatSessions = [
  {
    id: 'session-1',
    title: 'Initial project setup',
    updatedAt: new Date('2024-01-15T10:30:00'),
    messageCount: 12,
  },
  {
    id: 'session-2',
    title: 'Database schema design',
    updatedAt: new Date('2024-01-14T16:45:00'),
    messageCount: 8,
  },
  {
    id: 'session-3',
    title: 'API endpoint implementation',
    updatedAt: new Date('2024-01-13T14:20:00'),
    messageCount: 15,
  },
  {
    id: 'session-4',
    title: 'Frontend component structure',
    updatedAt: new Date('2024-01-12T09:15:00'),
    messageCount: 6,
  },
  {
    id: 'session-5',
    title: 'Authentication flow',
    updatedAt: new Date('2024-01-11T11:30:00'),
    messageCount: 10,
  },
];

// Mock project data
const mockProjects: { [key: string]: { name: string; description: string } } = {
  '1': { name: 'E-commerce Platform', description: 'A modern e-commerce platform built with React and Node.js' },
  '2': { name: 'Task Management App', description: 'Collaborative task management tool for teams' },
  '3': { name: 'Social Media Dashboard', description: 'Analytics dashboard for social media management' },
  '4': { name: 'Weather App', description: 'Beautiful weather forecasting application' },
};

function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

  if (diffInHours < 1) {
    return 'Just now';
  }

  if (diffInHours < 24) {
    return `${diffInHours}h ago`;
  }

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) {
    return `${diffInDays}d ago`;
  }

  const diffInWeeks = Math.floor(diffInDays / 7);
  return `${diffInWeeks}w ago`;
}

function ChatSessionCard({ session }: { session: typeof mockChatSessions[0] }) {
  const { colors } = useTheme();

  return (
    <Link href={`/projects/${useLocalSearchParams().id}/sessions/${session.id}`} asChild>
      <TouchableOpacity
        style={{
          backgroundColor: colors.card,
          borderRadius: 12,
          padding: 16,
          marginBottom: 12,
          borderWidth: 1,
          borderColor: colors.border,
        }}
      >
        <View>
          <Text
            style={{
              fontSize: 16,
              fontWeight: '600',
              color: colors['card-foreground'],
              marginBottom: 8,
            }}
          >
            {session.title}
          </Text>
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <Text
              style={{
                fontSize: 14,
                color: colors['muted-foreground'],
              }}
            >
              {session.messageCount} messages
            </Text>
            <Text
              style={{
                fontSize: 12,
                color: colors['muted-foreground'],
              }}
            >
              {formatTimeAgo(session.updatedAt)}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    </Link>
  );
}

export default function ProjectDetailScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const project = id ? mockProjects[id] : null;

  if (!project) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ color: colors.foreground }}>Project not found</Text>
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
            {project.name}
          </Text>
        </View>

        {/* Placeholder for potential action button */}
        <View style={{ width: 24 }} />
      </View>

      {/* Chat Sessions List */}
      <View style={{ flex: 1 }}>
        <View style={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 12 }}>
          <Text
            style={{
              fontSize: 24,
              fontWeight: 'bold',
              color: colors.foreground,
              marginBottom: 8,
            }}
          >
            Chat Sessions
          </Text>
          <Text
            style={{
              fontSize: 16,
              color: colors['muted-foreground'],
            }}
          >
            {mockChatSessions.length} sessions
          </Text>
        </View>

        <FlatList
          data={mockChatSessions}
          keyExtractor={item => item.id}
          renderItem={({ item }) => <ChatSessionCard session={item} />}
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingBottom: 20,
          }}
          showsVerticalScrollIndicator={false}
        />
      </View>
    </SafeAreaView>
  );
}
