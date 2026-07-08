// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// CSV dosyalarını varlıklı (asset) olarak taşıyabilmesi için uzantıyı ekliyoruz
config.resolver.assetExts.push('csv');

module.exports = config;
