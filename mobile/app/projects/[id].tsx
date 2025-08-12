'use client';

import { useLocalSearchParams } from 'expo-router';
import React from 'react';
import {
  FlatList,
  SafeAreaView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { NavigationHeader } from '@/components/NavigationHeader';


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

function getDateGroup(date: Date): string {
  const now = new Date();
  const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

  if (diffInDays === 0) {
    return 'Today';
  } else if (diffInDays === 1) {
    return 'Yesterday';
  } else if (diffInDays < 7) {
    return `${diffInDays} days ago`;
  } else if (diffInDays < 14) {
    return '1 week ago';
  } else if (diffInDays < 30) {
    const weeks = Math.floor(diffInDays / 7);
    return `${weeks} weeks ago`;
  } else {
    const months = Math.floor(diffInDays / 30);
    return `${months} month${months === 1 ? '' : 's'} ago`;
  }
}

function groupSessionsByDate(sessions: typeof mockChatSessions) {
  const groups: { [key: string]: typeof mockChatSessions } = {};

  sessions.forEach(session => {
    const group = getDateGroup(session.updatedAt);
    if (!groups[group]) {
      groups[group] = [];
    }
    groups[group].push(session);
  });

  return Object.entries(groups).map(([date, items]) => ({
    date,
    data: items,
  }));
}

function DateSeparator({ date }: { date: string }) {
  return (
    <View className="px-5 py-3">
      <Text className="text-sm font-medium text-muted-foreground">{date}</Text>
    </View>
  );
}

function ChatSessionCard({ session }: { session: typeof mockChatSessions[0] }) {
  return (
    <TouchableOpacity className="bg-card rounded-xl p-4 mx-5 mb-3 border border-border">
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
  );
}

export default function ProjectDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

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

  type FlatDataItem =
    | (typeof mockChatSessions[0])
    | { type: 'separator'; date: string; id: string };

  const groupedSessions = groupSessionsByDate(mockChatSessions);

  const renderItem = ({ item }: { item: FlatDataItem }) => {
    if ('type' in item && item.type === 'separator') {
      return <DateSeparator date={item.date} />;
    }
    return <ChatSessionCard session={item as typeof mockChatSessions[0]} />;
  };

  // Create flat data with separators
  const flatData: FlatDataItem[] = groupedSessions.reduce((acc: FlatDataItem[], group) => {
    acc.push({ type: 'separator', date: group.date, id: `separator-${group.date}` });
    acc.push(...group.data);
    return acc;
  }, []);

  return (
    <SafeAreaView className="flex-1 bg-background">
      <NavigationHeader title={project.name} />

      <View className="flex-1">
        <FlatList
          data={flatData}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={{
            paddingBottom: 20,
          }}
          showsVerticalScrollIndicator={false}
        />
      </View>
    </SafeAreaView>
  );
}
