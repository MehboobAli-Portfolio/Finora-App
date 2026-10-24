/**
 * app.config.js — Dynamic Expo configuration
 *
 * Expo automatically loads .env variables into process.env when evaluating
 * this file (SDK 49+). Set API_URL in Finora/.env to override the default.
 *
 * Example .env:
 *   API_URL=http://192.168.1.158:8000/api/
 */
module.exports = ({ config }) => {
  // Read API_URL from .env (Expo injects it automatically); fall back to
  // the LAN IP so that local device testing still works without a .env.
  const rawUrl = process.env.API_URL || 'http://192.168.1.158:8000/api/';

  // Normalise: always end with a trailing slash
  const apiUrl = rawUrl.endsWith('/') ? rawUrl : rawUrl + '/';

  return {
    ...config,
    extra: {
      ...config.extra,
      apiUrl,
    },
  };
};
