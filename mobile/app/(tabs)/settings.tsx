import { useAuth, useUser } from '@clerk/clerk-expo';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

export default function SettingsScreen() {
  const { signOut, isSignedIn } = useAuth();
  const { user } = useUser();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Settings</Text>
      <View style={styles.section}>
        <Text style={styles.text}>Signed in: {isSignedIn ? 'Yes' : 'No'}</Text>
        {user && (
          <>
            <Text style={styles.text}>Name: {user.fullName || user.username}</Text>
            <Text style={styles.text}>Email: {user.primaryEmailAddress?.emailAddress}</Text>
          </>
        )}
      </View>

      <Pressable onPress={() => signOut()} style={styles.signOutButton}>
        <Text style={styles.signOutText}>Sign Out</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingVertical: 32,
    gap: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '600',
  },
  section: {
    gap: 8,
  },
  text: {
    fontSize: 16,
  },
  signOutButton: {
    height: 48,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#dc2626',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    maxWidth: 320,
  },
  signOutText: {
    color: '#ffffff',
    fontWeight: '500',
  },
});
