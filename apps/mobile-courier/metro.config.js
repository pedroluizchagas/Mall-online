const { getDefaultConfig } = require('expo/metro-config')
const { withNativeWind } = require('nativewind/metro')
const path = require('path')

const projectRoot = __dirname
const monorepoRoot = path.resolve(projectRoot, '../..')

// react-native-css-interop is a transitive dep of nativewind (pnpm stores it
// alongside nativewind in the virtual store, so we resolve it from there)
const nativewindModules = path.resolve(
  path.dirname(require.resolve('nativewind/package.json')),
  '..'
)

const config = getDefaultConfig(projectRoot)

config.watchFolders = [monorepoRoot]

config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
]

config.resolver.extraNodeModules = {
  '@mallevo/lib': path.resolve(monorepoRoot, 'packages/lib'),
  '@mallevo/types': path.resolve(monorepoRoot, 'packages/types'),
  react: path.resolve(projectRoot, 'node_modules', 'react'),
  'react-native': path.resolve(projectRoot, 'node_modules', 'react-native'),
  'react-dom': path.resolve(projectRoot, 'node_modules', 'react-dom'),
  'react-native-css-interop': path.resolve(nativewindModules, 'react-native-css-interop'),
}

module.exports = withNativeWind(config, { input: './global.css' })
