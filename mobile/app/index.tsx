'use client';

import { useUser } from '@clerk/clerk-expo';
import { Redirect } from 'expo-router';
import React, { useState } from 'react';
import { FlatList, SafeAreaView, Text, View } from 'react-native';

import { HomeHeader } from '@/components/HomeHeader';
import { ProjectCard } from '@/components/ProjectCard';

// Mock project data for UI development
const mockProjects = [
  {
    id: '1',
    name: 'E-commerce Platform',
    description: 'A modern e-commerce platform built with React and Node.js',
    updatedAt: new Date('2024-01-15'),
  },
  {
    id: '2',
    name: 'Task Management App',
    description: 'Collaborative task management tool for teams',
    updatedAt: new Date('2024-01-12'),
  },
  {
    id: '3',
    name: 'Social Media Dashboard',
    description: 'Analytics dashboard for social media management',
    updatedAt: new Date('2024-01-10'),
  },
  {
    id: '4',
    name: 'Weather App',
    description: 'Beautiful weather forecasting application',
    updatedAt: new Date('2024-01-08'),
  },
];

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

function groupProjectsByDate(projects: typeof mockProjects) {
  const groups: { [key: string]: typeof mockProjects } = {};

  projects.forEach(project => {
    const group = getDateGroup(project.updatedAt);
    if (!groups[group]) {
      groups[group] = [];
    }
    groups[group].push(project);
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

export default function HomeScreen() {
  const { isLoaded, isSignedIn } = useUser();
  const [searchText, setSearchText] = useState('');

  // Don't render anything while authentication is loading
  if (!isLoaded) {
    return null;
  }

  // Redirect to sign-in if not authenticated
  if (!isSignedIn) {
    return <Redirect href="/(auth)/sign-in" />;
  }

  const filteredProjects = mockProjects.filter(
    project =>
      project.name.toLowerCase().includes(searchText.toLowerCase()) ||
      project.description.toLowerCase().includes(searchText.toLowerCase())
  );

  type FlatDataItem = (typeof mockProjects)[0] | { type: 'separator'; date: string; id: string };

  const groupedProjects = groupProjectsByDate(filteredProjects);

  const renderItem = ({ item }: { item: FlatDataItem }) => {
    if ('type' in item && item.type === 'separator') {
      return <DateSeparator date={item.date} />;
    }
    return <ProjectCard project={item as (typeof mockProjects)[0]} />;
  };

  // Create flat data with separators
  const flatData: FlatDataItem[] = groupedProjects.reduce((acc: FlatDataItem[], group) => {
    acc.push({ type: 'separator', date: group.date, id: `separator-${group.date}` });
    acc.push(...group.data);
    return acc;
  }, []);

  return (
    <SafeAreaView className="flex-1 bg-background">
      <HomeHeader
        searchText={searchText}
        onSearchChange={setSearchText}
        searchPlaceholder="Search Projects"
      />

      <FlatList
        data={flatData}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        contentContainerStyle={{
          paddingBottom: 20,
        }}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}
