/**
 * KOSUKE MOBILE - SETTINGS PAGE
 *
 * Settings page with theme toggle and other app preferences.
 */

import { useAuth, useUser } from '@clerk/clerk-expo';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Alert, Image, ScrollView, Text, TouchableOpacity, View } from 'react-native';

import { useTheme } from '@/contexts/ThemeContext';

export default function SettingsScreen() {
  const { colors, mode, setThemeMode, isDark } = useTheme();
  const { user } = useUser();
  const { signOut } = useAuth();

  const handleThemeChange = () => {
    Alert.alert('Theme Selection', 'Choose your preferred theme', [
      {
        text: 'Light',
        onPress: () => setThemeMode('light'),
        style: mode === 'light' ? 'destructive' : 'default',
      },
      {
        text: 'Dark',
        onPress: () => setThemeMode('dark'),
        style: mode === 'dark' ? 'destructive' : 'default',
      },
      {
        text: 'System',
        onPress: () => setThemeMode('system'),
        style: mode === 'system' ? 'destructive' : 'default',
      },
      {
        text: 'Cancel',
        style: 'cancel',
      },
    ]);
  };

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      {
        text: 'Cancel',
        style: 'cancel',
      },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: () => signOut(),
      },
    ]);
  };

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

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={{ padding: 16 }}
    >
      {/* Header */}
      <View style={{ marginBottom: 32 }}>
        <Text
          style={{
            fontSize: 32,
            fontWeight: 'bold',
            color: colors.foreground,
            marginBottom: 8,
          }}
        >
          Settings
        </Text>
        <Text
          style={{
            fontSize: 16,
            color: colors['muted-foreground'],
          }}
        >
          Customize your Kosuke experience
        </Text>
      </View>

      {/* User Profile Section */}
      {user && (
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
                {user.fullName || `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'User'}
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

          {/* Sign Out Button */}
          <TouchableOpacity
            onPress={handleSignOut}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              paddingVertical: 12,
              paddingHorizontal: 16,
              backgroundColor: colors.destructive,
              borderRadius: 8,
              borderWidth: 1,
              borderColor: colors.border,
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
        </View>
      )}

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

        {/* Theme Toggle */}
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

      {/* Demo Section - Showing off semantic tokens */}
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
          Theme Preview
        </Text>

        {/* Color Swatches */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {[
            { name: 'Primary', color: colors.primary },
            { name: 'Secondary', color: colors.secondary },
            { name: 'Accent', color: colors.accent },
            { name: 'Muted', color: colors.muted },
          ].map(item => (
            <View
              key={item.name}
              style={{
                backgroundColor: item.color,
                padding: 12,
                borderRadius: 8,
                minWidth: 80,
                alignItems: 'center',
                borderWidth: 1,
                borderColor: colors.border,
              }}
            >
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: '500',
                  color: colors.foreground,
                }}
              >
                {item.name}
              </Text>
            </View>
          ))}
        </View>

        {/* Sample Button */}
        <TouchableOpacity
          style={{
            backgroundColor: colors.primary,
            padding: 12,
            borderRadius: 8,
            alignItems: 'center',
            marginTop: 16,
          }}
        >
          <Text
            style={{
              color: colors['primary-foreground'],
              fontSize: 16,
              fontWeight: '600',
            }}
          >
            Primary Button
          </Text>
        </TouchableOpacity>

        {/* Destructive Button */}
        <TouchableOpacity
          style={{
            backgroundColor: colors.destructive,
            padding: 12,
            borderRadius: 8,
            alignItems: 'center',
            marginTop: 8,
          }}
        >
          <Text
            style={{
              color: colors['destructive-foreground'],
              fontSize: 16,
              fontWeight: '600',
            }}
          >
            Destructive Action
          </Text>
        </TouchableOpacity>
      </View>

      {/* Info Section */}
      <View
        style={{
          backgroundColor: colors.muted,
          borderRadius: 8,
          padding: 16,
          borderWidth: 1,
          borderColor: colors.border,
        }}
      >
        <Text
          style={{
            fontSize: 14,
            color: colors['muted-foreground'],
            textAlign: 'center',
            lineHeight: 20,
          }}
        >
          🎨 This app uses semantic design tokens that match the web app exactly. All colors adapt
          automatically to your chosen theme.
        </Text>
      </View>
    </ScrollView>
  );
}
