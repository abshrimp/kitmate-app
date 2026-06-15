/** @type {import('@bacons/apple-targets/app.plugin').ConfigFunction} */
module.exports = (config) => ({
  type: 'widget',
  name: 'KitmateWidget',
  displayName: 'KITmate',
  entitlements: {
    // メインアプリと同じ App Group を共有してデータを受け渡す
    'com.apple.security.application-groups':
      config.ios.entitlements['com.apple.security.application-groups'],
  },
});
