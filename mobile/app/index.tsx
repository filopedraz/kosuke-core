'use client';

import { useUser } from '@clerk/clerk-expo';
import { Link, Redirect } from 'expo-router';
import React, { useState } from 'react';
import { FlatList, SafeAreaView, Text, TouchableOpacity, View } from 'react-native';

import { HomeHeader } from '@/components/HomeHeader';

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

function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

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

function ProjectCard({ project }: { project: (typeof mockProjects)[0] }) {
  return (
    <Link href={`/projects/${project.id}`} asChild>
      <TouchableOpacity className="bg-card rounded-xl p-4 mb-3 border border-border">
        <View>
          <Text className="text-lg font-semibold text-card-foreground mb-2">{project.name}</Text>
          <Text className="text-sm text-muted-foreground leading-5 mb-2">
            {project.description}
          </Text>
          <Text className="text-xs text-muted-foreground">
            Updated {formatTimeAgo(project.updatedAt)}
          </Text>
        </View>
      </TouchableOpacity>
    </Link>
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

  return (
    <SafeAreaView className="flex-1 bg-background">
      <HomeHeader
        searchText={searchText}
        onSearchChange={setSearchText}
        searchPlaceholder="Search Projects"
      />

      {/* Projects List */}
      <FlatList
        data={filteredProjects}
        keyExtractor={item => item.id}
        renderItem={({ item }) => <ProjectCard project={item} />}
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingBottom: 20,
        }}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}
