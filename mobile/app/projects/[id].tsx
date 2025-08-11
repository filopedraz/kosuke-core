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

import { useTheme } from '@/hooks/useTheme';




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
  return (
    <Link href={`/projects/${useLocalSearchParams().id}/sessions/${session.id}`} asChild>
      <TouchableOpacity className="bg-card rounded-xl p-4 mb-3 border border-border">
        <View>
          <Text className="text-base font-semibold text-card-foreground mb-2">
            {session.title}
          </Text>
          <View className="flex-row justify-between items-center">
            <Text className="text-sm text-muted-foreground">
              {session.messageCount} messages
            </Text>
            <Text className="text-xs text-muted-foreground">
              {formatTimeAgo(session.updatedAt)}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    </Link>
  );
}

export default function ProjectDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getColors } = useTheme();
  const colors = getColors();

  const project = id ? mockProjects[id] : null;

  if (!project) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <View className="flex-1 justify-center items-center">
          <Text className="text-foreground">Project not found</Text>
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
            {project.name}
          </Text>
        </View>

        {/* Placeholder for potential action button */}
        <View className="w-6" />
      </View>

      {/* Chat Sessions List */}
      <View className="flex-1">
        <View className="px-5 pt-5 pb-3">
          <Text className="text-2xl font-bold text-foreground mb-2">
            Chat Sessions
          </Text>
          <Text className="text-base text-muted-foreground">
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
