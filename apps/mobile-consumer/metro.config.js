const { getDefaultConfig } = require('expo/metro-config')
const { withNativeWind } = require('nativewind/metro')
const path = require('path')

const projectRoot = __dirname
const monorepoRoot = path.resolve(projectRoot, '../..')

const config = getDefaultConfig(projectRoot)

// Monitorar pacotes do monorepo
config.watchFolders = [monorepoRoot]

// Resolver node_modules do projeto E da raiz do monorepo
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
]

// Aliases explícitos para pacotes do workspace
config.resolver.extraNodeModules = {
  '@mallora/lib': path.resolve(monorepoRoot, 'packages/lib'),
  '@mallora/types': path.resolve(monorepoRoot, 'packages/types'),
}

module.exports = withNativeWind(config, { input: './global.css' })
