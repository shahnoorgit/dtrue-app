const { withNativeWind } = require('nativewind/metro');
const {
  getSentryExpoConfig
} = require("@sentry/react-native/metro");

const config = getSentryExpoConfig(__dirname)

module.exports = withNativeWind(config, { 
  input: './app/globals.css',
  // Enable tree shaking for smaller bundles
  transformer: {
    minifierConfig: {
      keep_fnames: true,
      mangle: {
        keep_fnames: true,
      },
    },
  },
  resolver: {
    // Enable tree shaking
    unstable_enablePackageExports: true,
    // Optimize vector icons by excluding unused fonts
    blockList: [
      /node_modules\/@expo\/vector-icons\/build\/vendor\/react-native-vector-icons\/Fonts\/AntDesign\.ttf/,
      /node_modules\/@expo\/vector-icons\/build\/vendor\/react-native-vector-icons\/Fonts\/Entypo\.ttf/,
      /node_modules\/@expo\/vector-icons\/build\/vendor\/react-native-vector-icons\/Fonts\/EvilIcons\.ttf/,
      /node_modules\/@expo\/vector-icons\/build\/vendor\/react-native-vector-icons\/Fonts\/Feather\.ttf/,
      /node_modules\/@expo\/vector-icons\/build\/vendor\/react-native-vector-icons\/Fonts\/FontAwesome\.ttf/,
      /node_modules\/@expo\/vector-icons\/build\/vendor\/react-native-vector-icons\/Fonts\/FontAwesome5_Brands\.ttf/,
      /node_modules\/@expo\/vector-icons\/build\/vendor\/react-native-vector-icons\/Fonts\/FontAwesome5_Regular\.ttf/,
      /node_modules\/@expo\/vector-icons\/build\/vendor\/react-native-vector-icons\/Fonts\/FontAwesome5_Solid\.ttf/,
      /node_modules\/@expo\/vector-icons\/build\/vendor\/react-native-vector-icons\/Fonts\/FontAwesome6_Brands\.ttf/,
      /node_modules\/@expo\/vector-icons\/build\/vendor\/react-native-vector-icons\/Fonts\/FontAwesome6_Regular\.ttf/,
      /node_modules\/@expo\/vector-icons\/build\/vendor\/react-native-vector-icons\/Fonts\/FontAwesome6_Solid\.ttf/,
      /node_modules\/@expo\/vector-icons\/build\/vendor\/react-native-vector-icons\/Fonts\/Fontisto\.ttf/,
      /node_modules\/@expo\/vector-icons\/build\/vendor\/react-native-vector-icons\/Fonts\/Foundation\.ttf/,
      /node_modules\/@expo\/vector-icons\/build\/vendor\/react-native-vector-icons\/Fonts\/MaterialCommunityIcons\.ttf/,
      /node_modules\/@expo\/vector-icons\/build\/vendor\/react-native-vector-icons\/Fonts\/Octicons\.ttf/,
      /node_modules\/@expo\/vector-icons\/build\/vendor\/react-native-vector-icons\/Fonts\/SimpleLineIcons\.ttf/,
      /node_modules\/@expo\/vector-icons\/build\/vendor\/react-native-vector-icons\/Fonts\/Zocial\.ttf/,
    ],
  },
})