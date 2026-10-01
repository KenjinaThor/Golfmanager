const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// zustand (ESM-Build) nutzt import.meta, das im Web-Bundle nicht läuft → CJS-Einstiegspunkte verwenden.
config.resolver.unstable_enablePackageExports = false;

module.exports = config;
