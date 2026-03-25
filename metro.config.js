const { getDefaultConfig } = require('expo/metro-config');
const config = getDefaultConfig(__dirname);
config.resolver.useWatchman = false;
config.watcher = {
  watchman: { deferStates: [] },
  health: { enabled: false },
};
config.watchFolders = [__dirname];
module.exports = config;
