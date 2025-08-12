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

function getNotificationIcon(type: string) {
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
      className={`bg-card rounded-xl p-4 mb-3 border border-border ${
        !notification.read ? 'border-primary/20' : ''
      }`}
    >
      <View className="flex-row items-start">
        <View
          className={`p-2 rounded-full mr-3 ${!notification.read ? 'bg-primary/10' : 'bg-muted'}`}
        >
          <Ionicons
            name={getNotificationIcon(notification.type) as any}
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

export default function NotificationsScreen() {
  const unreadCount = mockNotifications.filter(n => !n.read).length;

  return (
    <SafeAreaView className="flex-1 bg-background">
      <NavigationHeader title="Notifications" />

      <View className="flex-1">
        {/* Header Info */}
        <View className="px-5 pt-5 pb-3">
          <Text className="text-2xl font-bold text-foreground mb-2">Notifications</Text>
          <Text className="text-base text-muted-foreground">
            {unreadCount > 0
              ? `${unreadCount} unread notification${unreadCount === 1 ? '' : 's'}`
              : 'All caught up!'}
          </Text>
        </View>

        {/* Notifications List */}
        <FlatList
          data={mockNotifications}
          keyExtractor={item => item.id}
          renderItem={({ item }) => <NotificationCard notification={item} />}
          contentContainerStyle={{
            paddingHorizontal: 20,
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
