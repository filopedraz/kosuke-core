const isDevelopment = process.env.APP_VARIANT === 'development';

const config = {
  expo: {
    name: isDevelopment ? 'kosuke (Dev)' : 'kosuke',
    slug: isDevelopment ? 'kosuke-dev' : 'kosuke',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/images/icon.png',
    scheme: isDevelopment ? 'kosuke-dev' : 'kosuke',
    userInterfaceStyle: 'automatic',
    newArchEnabled: true,
    ios: {
      supportsTablet: true,
      bundleIdentifier: isDevelopment ? 'com.joandko.kosuke.dev' : 'com.joandko.kosuke',
      buildNumber: '1',
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false,
      },
    },
    android: {
      adaptiveIcon: {
        foregroundImage: './assets/images/adaptive-icon.png',
        backgroundColor: '#ffffff',
      },
      edgeToEdgeEnabled: true,
      package: isDevelopment ? 'com.joandko.kosuke.dev' : 'com.joandko.kosuke',
    },
    web: {
      bundler: 'metro',
      output: 'static',
      favicon: './assets/images/favicon.png',
    },
    plugins: [
      'expo-router',
      'sentry-expo',
      [
        'expo-splash-screen',
        {
          image: './assets/images/splash-icon-simple.png',
          imageWidth: 100,
          resizeMode: 'contain',
          backgroundColor: '#0a0a0a',
          hideNameInSplashScreen: true,
        },
      ],
    ],
    extra: {
      API_BASE_URL: isDevelopment ? 'http://localhost:3000/api' : 'https://kosuke.ai/api',
      CLERK_PUBLISHABLE_KEY: isDevelopment
        ? 'pk_test_cHJpbWFyeS1kb25rZXktNDkuY2xlcmsuYWNjb3VudHMuZGV2JA'
        : 'pk_live_Y2xlcmsua29zdWtlLmFpJA',
      SENTRY_DSN:
        'https://9d63971f39fa9f4799e0a75224c46d05@o4508021471576064.ingest.de.sentry.io/4509820516761680',
      router: {},
      eas: {
        projectId: 'c556b153-731f-4326-9bac-5ee2cf0150eb',
      },
      SPLASH_MIN_DURATION_MS: isDevelopment ? 1500 : 0,
    },
    experiments: {
      typedRoutes: true,
    },
    owner: 'filopedraz',
  },
};

export default config;
