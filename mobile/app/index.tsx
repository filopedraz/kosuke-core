'use client';

import { useAuth, useUser } from '@clerk/clerk-expo';
import { Ionicons } from '@expo/vector-icons';
import { Link, Redirect } from 'expo-router';
import React, { useState } from 'react';
import {
  FlatList,
  Image,
  Modal,
  SafeAreaView,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { useTheme } from '@/hooks/useTheme';

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

function UserModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { isDark, getThemeDisplayText, cycleTheme } = useTheme();
  const { user, isLoaded } = useUser();
  const { signOut } = useAuth();

  if (!isLoaded || !user) return null;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView className="flex-1 bg-background">
        {/* Header */}
        <View className="flex-row items-center justify-between px-5 py-4 border-b border-border">
          <Text className="text-xl font-semibold text-foreground">Settings</Text>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={24} color="hsl(var(--foreground))" />
          </TouchableOpacity>
        </View>

        <ScrollView className="flex-1" contentContainerStyle={{ padding: 20 }}>
          {/* User Profile Section */}
          <View className="bg-card rounded-xl p-4 mb-6 border border-border">
            <Text className="text-lg font-semibold text-card-foreground mb-4">Profile</Text>

            <View className="flex-row items-center mb-4">
              {user.imageUrl ? (
                <Image
                  source={{ uri: user.imageUrl }}
                  className="w-15 h-15 rounded-full mr-4 border border-border"
                />
              ) : (
                <View className="w-15 h-15 rounded-full bg-primary items-center justify-center mr-4 border border-border">
                  <Text className="text-2xl font-bold text-primary-foreground">
                    {user.firstName?.[0] ||
                      user.emailAddresses[0]?.emailAddress[0]?.toUpperCase() ||
                      'U'}
                  </Text>
                </View>
              )}

              <View className="flex-1">
                <Text className="text-lg font-semibold text-card-foreground mb-1">
                  {user.fullName ||
                    `${user.firstName || ''} ${user.lastName || ''}`.trim() ||
                    'User'}
                </Text>
                <Text className="text-sm text-muted-foreground">
                  {user.primaryEmailAddress?.emailAddress || 'No email'}
                </Text>
              </View>
            </View>
          </View>

          {/* Appearance Section */}
          <View className="bg-card rounded-xl p-4 mb-6 border border-border">
            <Text className="text-lg font-semibold text-card-foreground mb-4">Appearance</Text>

            <TouchableOpacity
              onPress={cycleTheme}
              className="flex-row items-center justify-between py-3 px-4 bg-secondary rounded-lg border border-border"
            >
              <View className="flex-row items-center">
                <Ionicons
                  name={isDark ? 'moon' : 'sunny'}
                  size={20}
                  color="hsl(var(--secondary-foreground))"
                  style={{ marginRight: 12 }}
                />
                <View>
                  <Text className="text-base font-medium text-secondary-foreground">Theme</Text>
                  <Text className="text-sm text-muted-foreground mt-0.5">
                    {getThemeDisplayText()}
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={16} color="hsl(var(--muted-foreground))" />
            </TouchableOpacity>
          </View>

          {/* Sign Out Button */}
          <TouchableOpacity
            onPress={() => {
              onClose();
              signOut();
            }}
            className="bg-destructive rounded-xl p-4 mt-6 border border-border flex-row items-center justify-center"
          >
            <Ionicons
              name="log-out-outline"
              size={20}
              color="hsl(var(--destructive-foreground))"
              style={{ marginRight: 8 }}
            />
            <Text className="text-base font-semibold text-destructive-foreground">Sign Out</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

export default function HomeScreen() {
  const { isLoaded, isSignedIn, user } = useUser();
  const { isDark } = useTheme();
  const [searchText, setSearchText] = useState('');
  const [userModalVisible, setUserModalVisible] = useState(false);

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
      {/* Header with Search and Avatar */}
      <View className="flex-row items-center px-5 py-4 gap-3">
        {/* Search Bar */}
        <View className="flex-1 flex-row items-center bg-muted rounded-xl px-4 py-3 border border-border">
          <Ionicons name="search" size={20} color="hsl(var(--muted-foreground))" />
          <TextInput
            className="flex-1 ml-2 text-base text-foreground"
            placeholder="Search projects..."
            placeholderTextColor="hsl(var(--muted-foreground))"
            value={searchText}
            onChangeText={setSearchText}
          />
        </View>

        {/* User Avatar */}
        <TouchableOpacity onPress={() => setUserModalVisible(true)}>
          {user?.imageUrl ? (
            <Image
              source={{ uri: user.imageUrl }}
              className="w-10 h-10 rounded-full border border-border"
            />
          ) : (
            <View className="w-10 h-10 rounded-full bg-primary items-center justify-center border border-border">
              <Text className="text-base font-bold text-primary-foreground">
                {user?.firstName?.[0] ||
                  user?.emailAddresses[0]?.emailAddress[0]?.toUpperCase() ||
                  'U'}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

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

      {/* User Modal */}
      <UserModal visible={userModalVisible} onClose={() => setUserModalVisible(false)} />
    </SafeAreaView>
  );
}
