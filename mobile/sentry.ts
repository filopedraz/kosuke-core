import Constants from 'expo-constants';
import * as Sentry from 'sentry-expo';

const dsn = Constants.expoConfig?.extra?.SENTRY_DSN as string | undefined;

Sentry.init({
  dsn,
  enableInExpoDevelopment: true,
  debug: __DEV__,
  tracesSampleRate: 1.0,
  attachStacktrace: true,
});

export default Sentry;