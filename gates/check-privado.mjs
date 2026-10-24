// Gate: cero datos personales en el repo (destinos, talla, salud, favoritos, supuestos de impuestos).
// La lista de términos NO vive en el repo (publicarla, aunque sea en hash, revelaría lo que protege).
// Se lee de, en este orden y sumando:
//   - terminos.privados.local: un término por línea, en claro (*.local está en .gitignore)
//   - la variable de entorno PRIVADO_TERMINOS: términos separados por salto de línea (secret de CI)
//   - gates/privado.taller.json: hashes, solo en el taller privado (no se copia al repo público)
// Sin términos, avisa y no falla (así pasan los PR de forks, que no reciben secrets).
// Uso: npm run check:privado
import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { existsSync, lstatSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const MAX_PALABRAS = 3

const normalizar = (s) =>
  s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().split(/[^a-z0-9]+/).filter(Boolean)
const hash = (s) => createHash('sha256').update(s).digest('hex').slice(0, 24)

// Fuera del escaneo: el plan y la lista del taller (no van al repo público), el lockfile (hashes aleatorios) y binarios
const EXCLUIDOS = new Set(['PLAN.md', 'package-lock.json', 'gates/privado.taller.json'])
const BINARIO = /\.(png|jpe?g|gif|webp|avif|ico|woff2?|ttf|pdf|zip)$/i

const lista = new Map()
const sumar = (terminos, origen) => {
  for (const t of terminos.map((x) => x.trim()).filter(Boolean)) lista.set(hash(normalizar(t).join(' ')), origen)
}
const local = path.join(root, 'terminos.privados.local')
if (existsSync(local)) sumar(readFileSync(local, 'utf8').split('\n'), 'local')
if (process.env.PRIVADO_TERMINOS) sumar(process.env.PRIVADO_TERMINOS.split('\n'), 'secret')
const taller = path.join(root, 'gates/privado.taller.json')
if (existsSync(taller)) for (const [cat, h] of JSON.parse(readFileSync(taller, 'utf8')).hashes) lista.set(h, cat)

// Patrones genéricos (no revelan nada): enlaces a la variante exacta de un producto y tallas sueltas
const PATRONES = [
  ['variante', /amazon\.[a-z.]+\/(?:[^\s"]*\/)?dp\/[A-Z0-9]{10}/],
  ['talla', /\b(?:US|EU|UK) ?\d{1,2}(?:[.,]5)?\b/],
]

if (lista.size === 0) {
  console.warn('⚠ check:privado: sin lista de términos (terminos.privados.local o PRIVADO_TERMINOS): solo se revisan los patrones genéricos.')
}

const archivos = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard'], { cwd: root, encoding: 'utf8' })
  .split('\n').filter((f) => f && !EXCLUIDOS.has(f) && !BINARIO.test(f) && existsSync(path.join(root, f)) && lstatSync(path.join(root, f)).isFile())

const hallazgos = []
for (const f of archivos) {
  readFileSync(path.join(root, f), 'utf8').split('\n').forEach((linea, n) => {
    for (const [cat, re] of PATRONES) if (re.test(linea)) hallazgos.push(`${f}:${n + 1}: patrón de "${cat}" ("${linea.match(re)[0]}")`)
    const palabras = normalizar(linea)
    for (let a = 0; a < palabras.length; a++) {
      for (let k = 1; k <= MAX_PALABRAS && a + k <= palabras.length; k++) {
        const cat = lista.get(hash(palabras.slice(a, a + k).join(' ')))
        if (cat) hallazgos.push(`${f}:${n + 1}: término de "${cat}" ("${palabras.slice(a, a + k).join(' ')}")`)
      }
    }
  })
}

if (hallazgos.length) {
  console.error(`✖ check:privado: ${hallazgos.length} término(s) prohibido(s):\n  ${hallazgos.join('\n  ')}`)
  process.exit(1)
}
console.log(`✓ check:privado: ${archivos.length} archivos sin términos prohibidos (${lista.size} términos)`)
