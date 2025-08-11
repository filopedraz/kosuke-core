import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { HelloWave } from '@/components/HelloWave';
import { useTheme } from '@/contexts/ThemeContext';

export default function HomeScreen() {
  console.log('🏠 HomeScreen rendering...');

  try {
    const { colors, mode, isDark } = useTheme();
    console.log('🏠 HomeScreen theme data:', { mode, isDark, colorsExist: !!colors });

    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        {/* Header */}
        <View
          style={{
            backgroundColor: colors.primary,
            paddingTop: 60,
            paddingBottom: 24,
            paddingHorizontal: 20,
          }}
        >
          <View style={styles.titleContainer}>
            <Text
              style={{
                fontSize: 32,
                fontWeight: 'bold',
                color: colors['primary-foreground'],
              }}
            >
              Welcome to Kosuke!
            </Text>
            <HelloWave />
          </View>
          <Text
            style={{
              fontSize: 16,
              color: colors['primary-foreground'],
              opacity: 0.9,
              marginTop: 8,
            }}
          >
            Your semantic design system is working perfectly
          </Text>
        </View>

        {/* Content */}
        <View style={{ flex: 1, padding: 20 }}>
          {/* Theme Status Card */}
          <View
            style={{
              backgroundColor: colors.card,
              borderRadius: 12,
              padding: 16,
              marginBottom: 20,
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
              <Ionicons
                name={isDark ? 'moon' : 'sunny'}
                size={24}
                color={colors.primary}
                style={{ marginRight: 8 }}
              />
              <Text
                style={{
                  fontSize: 18,
                  fontWeight: '600',
                  color: colors['card-foreground'],
                }}
              >
                Theme System Active
              </Text>
            </View>
            <Text
              style={{
                fontSize: 14,
                color: colors['muted-foreground'],
                lineHeight: 20,
              }}
            >
              Currently using <Text style={{ fontWeight: '600' }}>{mode}</Text> mode
              {mode === 'system' && ` (${isDark ? 'dark' : 'light'})`}
            </Text>
          </View>

          {/* Feature Cards */}
          <View style={{ gap: 16 }}>
            <TouchableOpacity
              style={{
                backgroundColor: colors.secondary,
                padding: 16,
                borderRadius: 8,
                borderWidth: 1,
                borderColor: colors.border,
              }}
            >
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: '600',
                  color: colors['secondary-foreground'],
                  marginBottom: 4,
                }}
              >
                🎨 Semantic Design Tokens
              </Text>
              <Text
                style={{
                  fontSize: 14,
                  color: colors['muted-foreground'],
                  lineHeight: 18,
                }}
              >
                Colors automatically adapt to theme changes
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={{
                backgroundColor: colors.accent,
                padding: 16,
                borderRadius: 8,
                borderWidth: 1,
                borderColor: colors.border,
              }}
            >
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: '600',
                  color: colors['accent-foreground'],
                  marginBottom: 4,
                }}
              >
                📱 Web Parity
              </Text>
              <Text
                style={{
                  fontSize: 14,
                  color: colors['muted-foreground'],
                  lineHeight: 18,
                }}
              >
                Same design system as the web app
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={{
                backgroundColor: colors.muted,
                padding: 16,
                borderRadius: 8,
                borderWidth: 1,
                borderColor: colors.border,
              }}
            >
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: '600',
                  color: colors.foreground,
                  marginBottom: 4,
                }}
              >
                ⚙️ Settings Page
              </Text>
              <Text
                style={{
                  fontSize: 14,
                  color: colors['muted-foreground'],
                  lineHeight: 18,
                }}
              >
                Try the theme toggle in the Settings tab
              </Text>
            </TouchableOpacity>
          </View>

          {/* Action Button */}
          <TouchableOpacity
            style={{
              backgroundColor: colors.primary,
              padding: 16,
              borderRadius: 8,
              alignItems: 'center',
              marginTop: 24,
            }}
          >
            <Text
              style={{
                color: colors['primary-foreground'],
                fontSize: 16,
                fontWeight: '600',
              }}
            >
              Get Started
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  } catch (error) {
    console.error('💥 Error in HomeScreen:', error);
    return (
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: '#ff0000',
        }}
      >
        <Text style={{ color: '#ffffff', fontSize: 18 }}>HomeScreen Error: {String(error)}</Text>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stepContainer: {
    gap: 8,
    marginBottom: 8,
  },
  reactLogo: {
    height: 178,
    width: 290,
    bottom: 0,
    left: 0,
    position: 'absolute',
  },
});
