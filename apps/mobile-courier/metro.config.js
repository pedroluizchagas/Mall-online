const { getDefaultConfig } = require('expo/metro-config')
const { withNativeWind } = require('nativewind/metro')
const path = require('path')

const projectRoot = __dirname
const monorepoRoot = path.resolve(projectRoot, '../..')

const config = getDefaultConfig(projectRoot)

config.watchFolders = [monorepoRoot]

config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
]

config.resolver.extraNodeModules = {
  '@mallora/lib': path.resolve(monorepoRoot, 'packages/lib'),
  '@mallora/types': path.resolve(monorepoRoot, 'packages/types'),
}

module.exports = withNativeWind(config, { input: './global.css' })
