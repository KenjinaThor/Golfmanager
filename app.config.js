// Erweitert app.json: EXPO_BASE_URL setzt den Unterpfad für Web-Hosting (z. B. /Golfmanager auf GitHub Pages).
module.exports = ({ config }) => ({
  ...config,
  experiments: { ...(config.experiments ?? {}), baseUrl: process.env.EXPO_BASE_URL || undefined },
});
