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

// Singletons que NÃO podem ter cópias duplicadas no bundle.
// `extraNodeModules` é só fallback: quando @mallevo/lib importa `zustand`/`react`,
// o pnpm já resolveu esses pacotes via symlink (ex.: zustand linkado a react@18),
// então o Metro segue o symlink e ignora o alias — gerando 2 cópias de React
// ("Invalid hook call" / "Cannot read property 'useRef' of null").
// resolveRequest força essas raízes para a cópia do app, sem importar de onde
// vem o import.
const singletons = ['react', 'react-dom', 'react-native', 'zustand']
const defaultResolveRequest = config.resolver.resolveRequest
config.resolver.resolveRequest = (context, moduleName, platform) => {
  const root = moduleName.split('/')[0]
  if (singletons.includes(root)) {
    const rest = moduleName.slice(root.length) // '' ou '/subpath'
    const redirected = path.resolve(projectRoot, 'node_modules', root) + rest
    return context.resolveRequest(context, redirected, platform)
  }
  return (defaultResolveRequest ?? context.resolveRequest)(
    context,
    moduleName,
    platform,
  )
}

module.exports = withNativeWind(config, { input: './global.css' })
