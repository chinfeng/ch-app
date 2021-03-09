const { whenDev, whenProd } = require('@craco/craco');

module.exports = {
  webpack: {
    configure: {
      target: 'electron-renderer',
      externals: {
        ...whenDev(() => ({
          'agora-electron-sdk': 'commonjs2 agora-electron-sdk'
        }), {}),
        ...whenProd(() => ({
          'agora-electron-sdk': 'commonjs2 ./resources/app/node_modules/agora-electron-sdk'
        }), {})
      }
    },
  }
};
