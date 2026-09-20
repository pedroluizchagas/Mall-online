/* Diagnóstico temporário do build na Vercel: onde cada app resolve @types/react e typescript. */
const fs = require('node:fs')
const path = require('node:path')
function ver(dir, pkg) {
  try {
    const p = require.resolve(`${pkg}/package.json`, { paths: [dir] })
    return `${require(p).version} @ ${fs.realpathSync(path.dirname(p))}`
  } catch (e) {
    return `(não resolve: ${e.code || e.message})`
  }
}
const app = process.cwd()
const raiz = path.resolve(app, '../..')
console.log('[diag] cwd', app, 'NODE_ENV=', process.env.NODE_ENV, 'node', process.version)
for (const [rot, dir] of [['app', app], ['raiz', raiz]]) {
  console.log(`[diag] ${rot}: @types/react = ${ver(dir, '@types/react')}`)
  console.log(`[diag] ${rot}: @types/react-dom = ${ver(dir, '@types/react-dom')}`)
  console.log(`[diag] ${rot}: typescript = ${ver(dir, 'typescript')}`)
  console.log(`[diag] ${rot}: react = ${ver(dir, 'react')}`)
  const tipos = path.join(dir, 'node_modules/@types')
  console.log(`[diag] ${rot}: node_modules/@types =`, fs.existsSync(tipos) ? fs.readdirSync(tipos).join(' ') : '(ausente)')
}
try {
  const canary = require.resolve('@types/react/canary.d.ts', { paths: [app] })
  console.log('[diag] app: canary.d.ts =', canary)
} catch (e) {
  console.log('[diag] app: canary.d.ts não resolve')
}
