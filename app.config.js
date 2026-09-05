// Config dinâmica do Expo: mescla o app.json e injeta a Google Maps API key
// a partir do ambiente (EXPO_PUBLIC_GOOGLE_MAPS_API_KEY), para não versionar a chave.
//
// O google-services.json também fica fora do git, e a EAS Build só recebe arquivos
// versionados — sem o caminho abaixo o build quebra com
// EAS_BUILD_MISSING_GOOGLE_SERVICES_JSON_ERROR. Na EAS o arquivo chega pela file
// environment variable GOOGLE_SERVICES_JSON (`eas env:set --type file`), que aponta
// para o arquivo baixado; localmente cai no ./google-services.json do app.json.
module.exports = ({ config }) => ({
  ...config,
  android: {
    ...config.android,
    googleServicesFile:
      process.env.GOOGLE_SERVICES_JSON || (config.android && config.android.googleServicesFile),
    config: {
      ...(config.android && config.android.config),
      googleMaps: {
        apiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || '',
      },
    },
  },
});
