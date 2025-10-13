module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    // 'babel-plugin-react-compiler',
    'react-native-worklets/plugin',
    [
      'module:react-native-dotenv',
      {
        moduleName: '@env',
        path: '.env',
        safe: false,
        allowUndefined: true,
      },
    ],
  ],
};
