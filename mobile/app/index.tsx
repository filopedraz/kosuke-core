'use client';

import { useUser } from '@clerk/clerk-expo';
import { Redirect } from 'expo-router';
import React, { useState } from 'react';
import { FlatList, RefreshControl, SafeAreaView, Text, View } from 'react-native';

import { HomeHeader } from '@/components/HomeHeader';
import { ProjectCard, ProjectCardSkeleton } from '@/components/ProjectCard';
import { useProjects } from '@/hooks/use-projects';

function DateSeparator({ date }: { date: string }) {
  return (
    <View className="px-5 py-3">
      <Text className="text-sm font-medium text-muted-foreground">{date}</Text>
    </View>
  );
}

function ProjectListSkeleton() {
  return (
    <>
      <View className="px-5 py-3">
        <View className="w-16 h-4 bg-muted rounded" />
      </View>
      {Array.from({ length: 3 }).map((_, index) => (
        <ProjectCardSkeleton key={`skeleton-${index}`} />
      ))}
    </>
  );
}

export default function HomeScreen() {
  const { isLoaded, isSignedIn } = useUser();
  const [searchText, setSearchText] = useState('');

  // Always call hooks before any conditional returns
  const { flatData, isLoading, error, refetch, isFetching } = useProjects({
    searchText,
    enabled: isLoaded && isSignedIn,
  });

  // Don't render anything while authentication is loading
  if (!isLoaded) {
    return null;
  }

  // Redirect to sign-in if not authenticated
  if (!isSignedIn) {
    return <Redirect href="/(auth)/sign-in" />;
  }

  type FlatDataItem =
    | { id: string | number; name: string; description: string; updatedAt: Date }
    | { type: 'separator'; date: string; id: string };

  const renderItem = ({ item }: { item: FlatDataItem }) => {
    if ('type' in item && item.type === 'separator') {
      return <DateSeparator date={item.date} />;
    }
    return (
      <ProjectCard
        project={
          item as unknown as {
            id: string | number;
            name: string;
            description: string;
            updatedAt: Date;
          }
        }
      />
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <HomeHeader
        searchText={searchText}
        onSearchChange={setSearchText}
        searchPlaceholder="Search Projects"
      />

      {error && !isLoading && (
        <View className="px-5 py-4">
          <Text className="text-destructive text-center">
            {error.message || 'Failed to load projects'}
          </Text>
        </View>
      )}

      {isLoading ? (
        <ProjectListSkeleton />
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
              refreshing={isFetching && !isLoading}
              onRefresh={refetch}
              tintColor="#666"
            />
          }
          ListEmptyComponent={
            !isLoading && !error ? (
              <View className="flex-1 justify-center items-center py-20">
                <Text className="text-muted-foreground text-center">
                  {searchText ? 'No projects found matching your search' : 'No projects yet'}
                </Text>
              </View>
            ) : null
          }
        />
      )}
    </SafeAreaView>
  );
}
