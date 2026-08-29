// Entry físico do app. Num monorepo pnpm, "main": "expo-router/entry"
// faz o Metro anunciar o bundle pelo caminho real dentro de
// node_modules/.pnpm/expo-router@<versão>_<hash>/... — o hash muda a cada
// mexida no lockfile e o caminho "limpo" /node_modules/expo-router/entry
// não resolve a partir da raiz (pnpm não faz hoist), então o app não
// carrega. Um arquivo real no projeto dá uma URL de entry estável.
import 'expo-router/entry'
