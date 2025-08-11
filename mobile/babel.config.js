module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // Required for Reanimated (must be last)
      'react-native-reanimated/plugin',
    ],
  };
};
