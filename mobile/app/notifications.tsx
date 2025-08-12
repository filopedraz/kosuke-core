'use client';

import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { FlatList, SafeAreaView, Text, View } from 'react-native';

import { NavigationHeader } from '@/components/NavigationHeader';
import { useTheme } from '@/hooks/useTheme';

// Mock notifications data for UI development
const mockNotifications = [
  {
    id: '1',
    title: 'Project Update',
    message: 'Your E-commerce Platform project has been updated.',
    timestamp: new Date('2024-01-15T10:30:00'),
    read: false,
    type: 'project',
  },
  {
    id: '2',
    title: 'New Chat Session',
    message: 'A new chat session has been created for Task Management App.',
    timestamp: new Date('2024-01-14T16:45:00'),
    read: true,
    type: 'chat',
  },
  {
    id: '3',
    title: 'System Update',
    message: 'Kosuke has been updated with new features and improvements.',
    timestamp: new Date('2024-01-13T14:20:00'),
    read: false,
    type: 'system',
  },
  {
    id: '4',
    title: 'Project Created',
    message: 'Weather App project has been successfully created.',
    timestamp: new Date('2024-01-12T09:15:00'),
    read: true,
    type: 'project',
  },
  {
    id: '5',
    title: 'Welcome',
    message: 'Welcome to Kosuke! Get started by creating your first project.',
    timestamp: new Date('2024-01-10T08:00:00'),
    read: true,
    type: 'system',
  },
];

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

function groupNotificationsByDate(notifications: typeof mockNotifications) {
  const groups: { [key: string]: typeof mockNotifications } = {};

  notifications.forEach(notification => {
    const group = getDateGroup(notification.timestamp);
    if (!groups[group]) {
      groups[group] = [];
    }
    groups[group].push(notification);
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

function getNotificationIcon(type: string): keyof typeof Ionicons.glyphMap {
  switch (type) {
    case 'project':
      return 'folder-outline';
    case 'chat':
      return 'chatbubble-outline';
    case 'system':
      return 'settings-outline';
    default:
      return 'notifications-outline';
  }
}

function NotificationCard({ notification }: { notification: (typeof mockNotifications)[0] }) {
  const { getColors } = useTheme();
  const colors = getColors();

  return (
    <View
      className={`bg-card rounded-xl p-4 mx-5 mb-3 border border-border ${
        !notification.read ? 'border-primary/20' : ''
      }`}
    >
      <View className="flex-row items-start">
        <View
          className={`p-2 rounded-full mr-3 ${!notification.read ? 'bg-primary/10' : 'bg-muted'}`}
        >
          <Ionicons
            name={getNotificationIcon(notification.type)}
            size={16}
            color={!notification.read ? colors.primary : colors.mutedForeground}
          />
        </View>

        <View className="flex-1">
          <Text
            className={`font-semibold mb-1 ${
              !notification.read ? 'text-card-foreground' : 'text-muted-foreground'
            }`}
          >
            {notification.title}
          </Text>
          <Text className="text-sm text-muted-foreground leading-5 mb-2">
            {notification.message}
          </Text>
          <Text className="text-xs text-muted-foreground">
            {formatTimeAgo(notification.timestamp)}
          </Text>
        </View>

        {!notification.read && <View className="w-2 h-2 bg-primary rounded-full mt-1" />}
      </View>
    </View>
  );
}

type FlatDataItem = (typeof mockNotifications)[0] | { type: 'separator'; date: string; id: string };

export default function NotificationsScreen() {
  const groupedNotifications = groupNotificationsByDate(mockNotifications);

  const renderItem = ({ item }: { item: FlatDataItem }) => {
    if ('type' in item && item.type === 'separator') {
      return (
        <DateSeparator date={(item as { type: 'separator'; date: string; id: string }).date} />
      );
    }
    return <NotificationCard notification={item as (typeof mockNotifications)[0]} />;
  };

  // Create flat data with separators
  const flatData: FlatDataItem[] = groupedNotifications.reduce((acc: FlatDataItem[], group) => {
    acc.push({ type: 'separator', date: group.date, id: `separator-${group.date}` });
    acc.push(...group.data);
    return acc;
  }, []);

  return (
    <SafeAreaView className="flex-1 bg-background">
      <NavigationHeader title="Notifications" />

      <View className="flex-1">
        <FlatList
          data={flatData}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={{
            paddingBottom: 20,
          }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View className="flex-1 justify-center items-center py-20">
              <Ionicons name="notifications-outline" size={48} color="#9CA3AF" />
              <Text className="text-muted-foreground mt-4 text-center">No notifications yet</Text>
            </View>
          }
        />
      </View>
    </SafeAreaView>
  );
}
