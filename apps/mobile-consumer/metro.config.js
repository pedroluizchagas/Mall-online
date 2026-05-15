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
// Forçar resolução de react/react-native do projeto para evitar duplicação no monorepo
config.resolver.extraNodeModules = {
  '@mallevo/lib': path.resolve(monorepoRoot, 'packages/lib'),
  '@mallevo/types': path.resolve(monorepoRoot, 'packages/types'),
  react: path.resolve(projectRoot, 'node_modules', 'react'),
  'react-native': path.resolve(projectRoot, 'node_modules', 'react-native'),
  'react-dom': path.resolve(projectRoot, 'node_modules', 'react-dom'),
}

module.exports = withNativeWind(config, { input: './global.css' })
