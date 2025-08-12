import React from 'react';
import { Text, View } from 'react-native';

type Notification = {
  id: string;
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  type: string;
};

interface NotificationCardProps {
  notification: Notification;
}

export function NotificationCard({ notification }: NotificationCardProps) {
  return (
    <View
      className={`bg-card rounded-xl p-4 mx-5 mb-3 border border-border ${
        !notification.read ? 'border-primary/20' : ''
      }`}
    >
      <View className="flex-row items-start">
        <View className="flex-1">
          <Text
            className={`font-semibold mb-1 ${
              !notification.read ? 'text-card-foreground' : 'text-muted-foreground'
            }`}
          >
            {notification.title}
          </Text>
          <Text
            className="text-sm text-muted-foreground leading-5"
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {notification.message}
          </Text>
        </View>

        {!notification.read && <View className="w-2 h-2 bg-primary rounded-full mt-1" />}
      </View>
    </View>
  );
}
