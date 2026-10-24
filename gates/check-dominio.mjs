// Gate: la app y el pipeline no saben de qué categoría se trata. Todo el dominio vive en la config.
// Busca palabras de los ejemplos en src/ y scripts/. Este archivo está fuera de esas carpetas a propósito.
import { readdirSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const CARPETAS = ['src', 'scripts']
const TERMINOS = [
  // ejemplo zapatos
  'zapato', 'shoe', 'lluvia', 'agarre', 'talla', 'impermeable', 'membrana', 'suela', 'horma', 'calzado', 'gore-tex', 'ciudad',
  // ejemplo audífonos
  'audífono', 'audifono', 'headphone', 'cancelación', 'bluetooth',
  // tiendas concretas
  'revolve', 'dafiti', 'decathlon', 'falabella', 'zalando', 'merrell',
]

const archivos = (dir) =>
  readdirSync(dir).flatMap((f) => {
    const p = path.join(dir, f)
    return statSync(p).isDirectory() ? archivos(p) : [p]
  })

const hallazgos = []
for (const carpeta of CARPETAS) {
  for (const archivo of archivos(path.join(root, carpeta))) {
    readFileSync(archivo, 'utf8').split('\n').forEach((linea, i) => {
      const l = linea.toLowerCase()
      for (const t of TERMINOS) if (l.includes(t)) hallazgos.push(`${path.relative(root, archivo)}:${i + 1}: "${t}"`)
    })
  }
}

if (hallazgos.length) {
  console.error(`✖ check:dominio: ${hallazgos.length} término(s) del dominio en el código. Muévelos a decision.config.json:\n  ${hallazgos.join('\n  ')}`)
  process.exit(1)
}
console.log(`✓ check:dominio: cero términos del dominio en ${CARPETAS.join(' y ')}/`)
