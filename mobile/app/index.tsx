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

import { useTheme } from '@/contexts/ThemeContext';

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
  const { colors } = useTheme();

  return (
    <Link href={`/projects/${project.id}`} asChild>
      <TouchableOpacity
        style={{
          backgroundColor: colors.card,
          borderRadius: 12,
          padding: 16,
          marginBottom: 12,
          borderWidth: 1,
          borderColor: colors.border,
        }}
      >
        <View>
          <Text
            style={{
              fontSize: 18,
              fontWeight: '600',
              color: colors['card-foreground'],
              marginBottom: 8,
            }}
          >
            {project.name}
          </Text>
          <Text
            style={{
              fontSize: 14,
              color: colors['muted-foreground'],
              lineHeight: 20,
              marginBottom: 8,
            }}
          >
            {project.description}
          </Text>
          <Text
            style={{
              fontSize: 12,
              color: colors['muted-foreground'],
            }}
          >
            Updated {formatTimeAgo(project.updatedAt)}
          </Text>
        </View>
      </TouchableOpacity>
    </Link>
  );
}

function UserModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { colors, mode, setThemeMode, isDark } = useTheme();
  const { user, isLoaded } = useUser();
  const { signOut } = useAuth();

  const getThemeDisplayText = () => {
    switch (mode) {
      case 'light':
        return 'Light';
      case 'dark':
        return 'Dark';
      case 'system':
        return `System (${isDark ? 'Dark' : 'Light'})`;
      default:
        return 'System';
    }
  };

  const handleThemeChange = () => {
    // Simple cycling: system -> light -> dark -> system
    const nextMode = mode === 'system' ? 'light' : mode === 'light' ? 'dark' : 'system';
    setThemeMode(nextMode);
  };

  if (!isLoaded || !user) return null;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        {/* Header */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 20,
            paddingVertical: 16,
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
          }}
        >
          <Text
            style={{
              fontSize: 20,
              fontWeight: '600',
              color: colors.foreground,
            }}
          >
            Settings
          </Text>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={24} color={colors.foreground} />
          </TouchableOpacity>
        </View>

        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20 }}>
          {/* User Profile Section */}
          <View
            style={{
              backgroundColor: colors.card,
              borderRadius: 12,
              padding: 16,
              marginBottom: 24,
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <Text
              style={{
                fontSize: 18,
                fontWeight: '600',
                color: colors['card-foreground'],
                marginBottom: 16,
              }}
            >
              Profile
            </Text>

            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
              {user.imageUrl ? (
                <Image
                  source={{ uri: user.imageUrl }}
                  style={{
                    width: 60,
                    height: 60,
                    borderRadius: 30,
                    marginRight: 16,
                    borderWidth: 1,
                    borderColor: colors.border,
                  }}
                />
              ) : (
                <View
                  style={{
                    width: 60,
                    height: 60,
                    borderRadius: 30,
                    backgroundColor: colors.primary,
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: 16,
                    borderWidth: 1,
                    borderColor: colors.border,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 24,
                      fontWeight: 'bold',
                      color: colors['primary-foreground'],
                    }}
                  >
                    {user.firstName?.[0] ||
                      user.emailAddresses[0]?.emailAddress[0]?.toUpperCase() ||
                      'U'}
                  </Text>
                </View>
              )}

              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontSize: 18,
                    fontWeight: '600',
                    color: colors['card-foreground'],
                    marginBottom: 4,
                  }}
                >
                  {user.fullName ||
                    `${user.firstName || ''} ${user.lastName || ''}`.trim() ||
                    'User'}
                </Text>
                <Text
                  style={{
                    fontSize: 14,
                    color: colors['muted-foreground'],
                  }}
                >
                  {user.primaryEmailAddress?.emailAddress || 'No email'}
                </Text>
              </View>
            </View>
          </View>

          {/* Appearance Section */}
          <View
            style={{
              backgroundColor: colors.card,
              borderRadius: 12,
              padding: 16,
              marginBottom: 24,
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <Text
              style={{
                fontSize: 18,
                fontWeight: '600',
                color: colors['card-foreground'],
                marginBottom: 16,
              }}
            >
              Appearance
            </Text>

            <TouchableOpacity
              onPress={handleThemeChange}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingVertical: 12,
                paddingHorizontal: 16,
                backgroundColor: colors.secondary,
                borderRadius: 8,
                borderWidth: 1,
                borderColor: colors.border,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons
                  name={isDark ? 'moon' : 'sunny'}
                  size={20}
                  color={colors['secondary-foreground']}
                  style={{ marginRight: 12 }}
                />
                <View>
                  <Text
                    style={{
                      fontSize: 16,
                      fontWeight: '500',
                      color: colors['secondary-foreground'],
                    }}
                  >
                    Theme
                  </Text>
                  <Text
                    style={{
                      fontSize: 14,
                      color: colors['muted-foreground'],
                      marginTop: 2,
                    }}
                  >
                    {getThemeDisplayText()}
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors['muted-foreground']} />
            </TouchableOpacity>
          </View>

          {/* Sign Out Button */}
          <TouchableOpacity
            onPress={() => {
              onClose();
              signOut();
            }}
            style={{
              backgroundColor: colors.destructive,
              borderRadius: 12,
              padding: 16,
              marginTop: 24,
              borderWidth: 1,
              borderColor: colors.border,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons
              name="log-out-outline"
              size={20}
              color={colors['destructive-foreground']}
              style={{ marginRight: 8 }}
            />
            <Text
              style={{
                fontSize: 16,
                fontWeight: '600',
                color: colors['destructive-foreground'],
              }}
            >
              Sign Out
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

export default function HomeScreen() {
  const { colors } = useTheme();
  const { isLoaded, isSignedIn, user } = useUser();
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
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header with Search and Avatar */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 20,
          paddingVertical: 16,
          gap: 12,
        }}
      >
        {/* Search Bar */}
        <View
          style={{
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: colors.muted,
            borderRadius: 12,
            paddingHorizontal: 16,
            paddingVertical: 12,
            borderWidth: 1,
            borderColor: colors.border,
          }}
        >
          <Ionicons name="search" size={20} color={colors['muted-foreground']} />
          <TextInput
            style={{
              flex: 1,
              marginLeft: 8,
              fontSize: 16,
              color: colors.foreground,
            }}
            placeholder="Search projects..."
            placeholderTextColor={colors['muted-foreground']}
            value={searchText}
            onChangeText={setSearchText}
          />
        </View>

        {/* User Avatar */}
        <TouchableOpacity onPress={() => setUserModalVisible(true)}>
          {user?.imageUrl ? (
            <Image
              source={{ uri: user.imageUrl }}
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                borderWidth: 1,
                borderColor: colors.border,
              }}
            />
          ) : (
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: colors.primary,
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 1,
                borderColor: colors.border,
              }}
            >
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: 'bold',
                  color: colors['primary-foreground'],
                }}
              >
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
