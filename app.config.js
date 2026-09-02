// Config dinâmica do Expo: mescla o app.json e injeta a Google Maps API key
// a partir do ambiente (EXPO_PUBLIC_GOOGLE_MAPS_API_KEY), para não versionar a chave.
module.exports = ({ config }) => ({
  ...config,
  android: {
    ...config.android,
    config: {
      ...(config.android && config.android.config),
      googleMaps: {
        apiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || '',
      },
    },
  },
});
