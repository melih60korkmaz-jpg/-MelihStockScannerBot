// Oyun tek dosyalık HTML olarak pakete girer: metro'ya .html uzantısını varlık olarak tanıt.
const { getDefaultConfig } = require('expo/metro-config');
const config = getDefaultConfig(__dirname);
config.resolver.assetExts.push('html');
module.exports = config;
