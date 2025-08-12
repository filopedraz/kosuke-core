'use client';

import { useLocalSearchParams } from 'expo-router';
import React from 'react';
import {
  FlatList,
  RefreshControl,
  SafeAreaView,
  Text,
  View,
} from 'react-native';

import { ChatSessionCard, ChatSessionCardSkeleton } from '@/components/ChatSessionCard';
import { NavigationHeader, NavigationHeaderSkeleton } from '@/components/NavigationHeader';
import { useChatSessions } from '@/hooks/use-chat-sessions';
import { useProject } from '@/hooks/use-projects';




function DateSeparator({ date }: { date: string }) {
  return (
    <View className="px-5 py-3">
      <Text className="text-sm font-medium text-muted-foreground">{date}</Text>
    </View>
  );
}

function SessionListSkeleton() {
  return (
    <>
      <View className="px-5 py-3">
        <View className="w-16 h-4 bg-muted rounded" />
      </View>
      {Array.from({ length: 4 }).map((_, index) => (
        <ChatSessionCardSkeleton key={`skeleton-${index}`} />
      ))}
    </>
  );
}

export default function ProjectDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const projectId = id ? parseInt(id) : 0;

  // Always call hooks before any conditional returns
  const {
    data: project,
    isLoading: isProjectLoading,
    error: projectError,
  } = useProject(projectId);

  const {
    flatData,
    isLoading: isSessionsLoading,
    error: sessionsError,
    refetch,
    isFetching,
  } = useChatSessions({ projectId, enabled: !!projectId });

  // Show loading state while project is loading
  if (isProjectLoading) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <NavigationHeaderSkeleton />
        <SessionListSkeleton />
      </SafeAreaView>
    );
  }

  // Show error state if project failed to load
  if (projectError || !project) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <NavigationHeader title={`Project ${projectId}`} />
        <View className="flex-1 justify-center items-center px-5">
          <Text className="text-destructive text-center">
            {projectError?.message || 'Project not found'}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  type FlatDataItem =
    | { id: string | number; title: string; messageCount: number; lastActivityAt: Date }
    | { type: 'separator'; date: string; id: string };

  const renderItem = ({ item }: { item: FlatDataItem }) => {
    if ('type' in item && item.type === 'separator') {
      return <DateSeparator date={item.date} />;
    }
    return <ChatSessionCard session={item as unknown as { id: string | number; title: string; messageCount: number; updatedAt: Date }} />;
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <NavigationHeader title={project.name} />

      <View className="flex-1">
        {sessionsError && !isSessionsLoading && (
          <View className="px-5 py-4">
            <Text className="text-destructive text-center">
              {sessionsError.message || 'Failed to load chat sessions'}
            </Text>
          </View>
        )}

        {isSessionsLoading ? (
          <SessionListSkeleton />
        ) : (
          <FlatList
            data={flatData}
            keyExtractor={item => String(item.id)}
            renderItem={renderItem}
            contentContainerStyle={{
              paddingBottom: 20,
            }}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={isFetching && !isSessionsLoading}
                onRefresh={refetch}
                tintColor="#666"
              />
            }
            ListEmptyComponent={
              !isSessionsLoading && !sessionsError ? (
                <View className="flex-1 justify-center items-center py-20">
                  <Text className="text-muted-foreground text-center">
                    No chat sessions yet
                  </Text>
                </View>
              ) : null
            }
          />
        )}
      </View>
    </SafeAreaView>
  );
}
