/**
 * app.config.js — Dynamic Expo configuration
 *
 * Expo automatically loads .env variables into process.env when evaluating
 * this file (SDK 49+).
 *
 * Development (.env):
 *   API_URL=http://192.168.18.27:8000/api/
 *
 * Production (set in EAS Secrets or eas.json env):
 *   API_URL=https://api.finora.app/api/
 */
module.exports = ({ config }) => {
  const rawUrl = process.env.API_URL || 'http://192.168.18.27:8000/api/';
  const apiUrl = rawUrl.endsWith('/') ? rawUrl : rawUrl + '/';

  return {
    ...config,
    plugins: [
      ...(config.plugins || []),
      '@react-native-community/datetimepicker',
      'expo-font',
    ],
    extra: {
      ...config.extra,
      apiUrl,
    },
  };
};
