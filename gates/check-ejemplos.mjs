// Gate: la app compila con cada ejemplo de examples/ (prueba que el código es genérico).
import { execFileSync } from 'node:child_process'
import { existsSync, readdirSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const ejemplos = readdirSync(path.join(root, 'examples'))
  .map((d) => path.join('examples', d, 'decision.config.json'))
  .filter((f) => existsSync(path.join(root, f)))

const correr = (cmd, args) => execFileSync(cmd, args, { cwd: root, stdio: 'inherit' })
correr('npx', ['tsc', '-b'])
for (const config of ejemplos) {
  console.log(`\n▶ ${config}`)
  correr('node', ['scripts/build-data.mjs', '--config', config, '--sin-descargas'])
  correr('npx', ['vite', 'build', '--logLevel', 'warn'])
}
console.log(`\n✓ check:ejemplos: ${ejemplos.length} ejemplos compilan (${ejemplos.join(', ')})`)
