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
