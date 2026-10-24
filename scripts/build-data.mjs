// Pipeline de datos: decision.config.json + <datos>/*.json -> public/data/datos.json (+ public/img/<id>.<ext>)
// Config: --config <ruta>, o la variable DECISION_CONFIG, o ./decision.config.json, o el ejemplo por defecto.
// Se puede volver a correr: reutiliza las imágenes ya copiadas o descargadas. Con --refresh-img las rehace.
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, realpathSync, rmSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import Ajv from 'ajv/dist/2020.js'
import addFormats from 'ajv-formats'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
// Ejemplo por defecto: package.json -> "decisionDeck": { "ejemplo": "<ruta a la config>" }
const EJEMPLO = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8')).decisionDeck?.ejemplo
const arg = (k) => { const i = process.argv.indexOf(k); return i > -1 ? process.argv[i + 1] : null }
const refresh = process.argv.includes('--refresh-img')
const sinDescargas = process.argv.includes('--sin-descargas')

function rutaConfig() {
  const pedida = arg('--config') ?? process.env.DECISION_CONFIG
  if (pedida) return path.resolve(process.cwd(), pedida)
  const propia = path.join(root, 'decision.config.json')
  if (existsSync(propia)) return propia
  if (!EJEMPLO) { console.error('✖ Falta decision.config.json (corre la skill criterios o usa --config)'); process.exit(1) }
  console.log(`Sin decision.config.json en la raíz: uso el ejemplo ${EJEMPLO}`)
  return path.join(root, EJEMPLO)
}

const configPath = rutaConfig()
const configDir = path.dirname(configPath)
const outJson = path.join(root, 'public/data/datos.json')
const imgDir = path.join(root, 'public/img')
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36'
const EXT = { 'image/jpeg': 'jpg', 'image/jpg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif', 'image/svg+xml': 'svg' }

const leer = (f) => JSON.parse(readFileSync(f, 'utf8'))
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const num = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : null)
const valorEn = (obj, ruta) => ruta.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj)
const rel = (f) => path.relative(root, f)

// ---- Validación ----
const ajv = new Ajv({ allErrors: true, strict: false })
addFormats(ajv)
const validarConfig = ajv.compile(leer(path.join(root, 'schema/config.schema.json')))
const validarDatos = ajv.compile(leer(path.join(root, 'schema/datos.schema.json')))
const errores = []
const revisar = (validar, dato, archivo) => {
  if (validar(dato)) return
  for (const e of validar.errors) errores.push(`${archivo}${e.instancePath || ''}: ${e.message}`)
}
const fallar = () => {
  if (!errores.length) return
  console.error(`✖ ${errores.length} error(es) de validación:\n  ${errores.slice(0, 40).join('\n  ')}`)
  process.exit(1)
}

if (!existsSync(configPath)) { console.error(`✖ No existe ${configPath}`); process.exit(1) }
const config = leer(configPath)
revisar(validarConfig, config, rel(configPath))
fallar()

const idsSeg = new Set(config.segmentos.map((s) => s.id))
const idsEje = config.ejes.map((e) => e.id)
const repetidos = (xs) => xs.filter((x, i) => xs.indexOf(x) !== i)
for (const id of repetidos(config.segmentos.map((s) => s.id))) errores.push(`config: segmento repetido "${id}"`)
for (const id of repetidos(idsEje)) errores.push(`config: eje repetido "${id}"`)
if (config.presupuesto.techo < config.presupuesto.ideal) errores.push('config: presupuesto.techo es menor que presupuesto.ideal')
for (const r of [...(config.innegociables ?? []), ...(config.insignias ?? [])]) {
  for (const s of r.segmentos ?? []) if (!idsSeg.has(s)) errores.push(`config: "${r.id}" usa el segmento "${s}", que no existe`)
}
for (const e of config.ejes) {
  if (e.cortes && e.cortes.some((c, i) => i > 0 && c < e.cortes[i - 1])) errores.push(`config: los cortes del eje "${e.id}" deben ir de menor a mayor`)
}
fallar()

// ---- Datos ----
const dataDir = path.resolve(configDir, config.datos ?? 'data')
if (!existsSync(dataDir)) { console.error(`✖ No existe la carpeta de datos ${rel(dataDir)} (campo "datos" de la config)`); process.exit(1) }
const crudos = []
let tiendasCrudas = []
let fechas = []
for (const archivo of readdirSync(dataDir).filter((f) => f.endsWith('.json')).sort()) {
  const d = leer(path.join(dataDir, archivo))
  revisar(validarDatos, d, `${rel(dataDir)}/${archivo}`)
  if (d.generado) fechas.push(d.generado)
  if (d.tiendas) tiendasCrudas = tiendasCrudas.concat(d.tiendas)
  for (const it of d.items ?? []) crudos.push({ ...it, segmento: it.segmento ?? d.segmento ?? archivo.replace(/\.json$/, '') })
}
for (const it of crudos) if (!idsSeg.has(it.segmento)) errores.push(`${it.id}: segmento "${it.segmento}" no está en la config`)
fallar()

// ids duplicados: gana el último
const porId = new Map()
for (const it of crudos) {
  if (porId.has(it.id)) console.warn(`  ⚠ ${it.id}: id repetido, gana el último`)
  porId.set(it.id, it)
}

const { ideal, techo } = config.presupuesto
const franjaDe = (p) => (p == null ? 'no_disponible' : p <= ideal ? 'ideal' : p <= techo ? 'estirando' : 'sobre_tope')

/** Nota 1–5 con cortes ascendentes. menor_es_mejor: bajo el primer corte vale 5. */
function escala(v, cortes, menorEsMejor) {
  const pasados = cortes.filter((c) => v > c).length
  return menorEsMejor ? 5 - pasados : 1 + cortes.filter((c) => v >= c).length
}

// Sin cortes: escala lineal entre el mínimo y el máximo de los datos
const rangos = {}
for (const e of config.ejes) {
  if (!e.campo || e.cortes) continue
  const vs = [...porId.values()].map((it) => num(valorEn(it, e.campo))).filter((v) => v != null)
  rangos[e.id] = vs.length ? [Math.min(...vs), Math.max(...vs)] : null
}
function lineal(v, [min, max], menorEsMejor) {
  if (max === min) return 3
  const t = (v - min) / (max - min)
  return Math.round((1 + 4 * (menorEsMejor ? 1 - t : t)) * 10) / 10
}

const cortesPrecio = [ideal * 0.5, ideal * 0.7, ideal * 0.9, ideal, techo]
function ejes(it, mejor) {
  const r = {}
  for (const e of config.ejes) {
    if (e.derivado === 'precio_inverso') {
      r[e.id] = mejor ? escala(mejor.precio_final, cortesPrecio, true) : null
    } else if (e.derivado) {
      const v = num(valorEn(it, e.campo))
      const menor = e.derivado === 'menor_es_mejor'
      r[e.id] = v == null ? null : e.cortes ? escala(v, e.cortes, menor) : rangos[e.id] ? lineal(v, rangos[e.id], menor) : null
    } else {
      r[e.id] = num(it.notas?.[e.id])
    }
  }
  return r
}

function cumple(it, condiciones) {
  return condiciones.every((c) => {
    const v = valorEn(it, c.campo)
    if (c.existe != null && (v != null) !== c.existe) return false
    if (c.es !== undefined && v !== c.es) return false
    if (c.no_es !== undefined && v === c.no_es) return false
    if (c.min != null && !(num(v) != null && v >= c.min)) return false
    if (c.max != null && !(num(v) != null && v <= c.max)) return false
    return true
  })
}
const aplica = (regla, it) => !regla.segmentos || regla.segmentos.includes(it.segmento)
const destacadas = new Set((config.insignias ?? []).filter((i) => i.destacada).map((i) => i.id))

const items = [...porId.values()].map((it) => {
  const ofertas = (it.ofertas ?? []).map((o) => ({
    pais: '', variante: null, precio: null, moneda: config.moneda, metodo: '', ...o,
    precio_final: num(o.precio_final),
  }))
  const comprables = ofertas.filter((o) => o.disponible && o.precio_final != null)
  const mejor = comprables.length ? comprables.reduce((a, b) => (b.precio_final < a.precio_final ? b : a)) : null
  const base = {
    ficha: {}, notas: {}, beneficios: [], contras: [], variante: null, estado: 'candidato', ...it,
    ofertas,
    mejor_oferta: mejor,
    imagen: null,
  }
  base.ejes = ejes(base, mejor)
  const incumple = (config.innegociables ?? []).find((n) => aplica(n, base) && !cumple(base, n.condiciones))
  const descartado = base.estado === 'descartado' || !!incumple
  base.franja = descartado ? 'descartado' : franjaDe(mejor?.precio_final ?? null)
  if (incumple && !base.motivo) base.motivo = `No cumple: ${incumple.nombre}.`
  base.insignias = descartado ? [] : (config.insignias ?? []).filter((i) => aplica(i, base) && cumple(base, i.condiciones)).map((i) => i.id)
  base.destacado = base.insignias.some((i) => destacadas.has(i))
  base.imagen_origen = it.imagen ?? null
  return base
})

// ---- Imágenes: ruta local (relativa a la config) se copia; URL se descarga y no se sube al repo ----
mkdirSync(imgDir, { recursive: true })
const ACEPTA = 'image/webp,image/jpeg,image/png;q=0.9'
// Locales: solo dentro de la carpeta de la config y con extensión de imagen (un dato no puede publicar otro archivo).
// Remotas: solo raster (un SVG puede traer scripts) y con tope de tamaño.
const IMG_LOCAL = /\.(png|jpe?g|webp|gif|svg)$/i
const EXT_REMOTA = Object.fromEntries(Object.entries(EXT).filter(([, e]) => e !== 'svg'))
const MAX_BYTES = 5 * 1024 * 1024
const dentroDe = (base, p) => { const r = path.relative(base, p); return r !== '' && !r.startsWith('..') && !path.isAbsolute(r) }
const existentes = readdirSync(imgDir)
let copiadas = 0, bajadas = 0, reusadas = 0, fallo = 0
const log = []
for (const it of items) {
  const origen = it.imagen_origen
  delete it.imagen_origen
  if (!origen) continue
  const previa = existentes.find((f) => f.startsWith(it.id + '.'))
  const borrarPrevias = () => { for (const v of existentes.filter((x) => x.startsWith(it.id + '.'))) rmSync(path.join(imgDir, v), { force: true }) }
  if (!/^https?:\/\//i.test(origen)) {
    const archivo = path.resolve(configDir, origen)
    if (!dentroDe(configDir, archivo) || !IMG_LOCAL.test(archivo)) { log.push(`  ${it.id}: imagen rechazada (fuera de la carpeta del ejemplo o sin extensión de imagen)`); fallo++; continue }
    if (!existsSync(archivo)) { log.push(`  ${it.id}: no existe ${rel(archivo)}`); fallo++; continue }
    if (!dentroDe(realpathSync(configDir), realpathSync(archivo))) { log.push(`  ${it.id}: imagen rechazada (enlace que sale de la carpeta)`); fallo++; continue }
    const destino = `${it.id}${path.extname(archivo).toLowerCase()}`
    borrarPrevias()
    copyFileSync(archivo, path.join(imgDir, destino))
    it.imagen = `img/${destino}`
    copiadas++
    continue
  }
  if (previa && !refresh) { it.imagen = `img/${previa}`; reusadas++; continue }
  if (sinDescargas) continue
  try {
    const res = await fetch(origen, { headers: { 'User-Agent': UA, Accept: ACEPTA }, signal: AbortSignal.timeout(20000) })
    const tipo = (res.headers.get('content-type') ?? '').split(';')[0].trim().toLowerCase()
    if (!res.ok || !EXT_REMOTA[tipo]) throw new Error(`HTTP ${res.status} ${tipo}`)
    if (Number(res.headers.get('content-length') ?? 0) > MAX_BYTES) throw new Error('imagen de más de 5 MB')
    const cuerpo = Buffer.from(await res.arrayBuffer())
    if (cuerpo.length > MAX_BYTES) throw new Error('imagen de más de 5 MB')
    borrarPrevias()
    writeFileSync(path.join(imgDir, `${it.id}.${EXT_REMOTA[tipo]}`), cuerpo)
    it.imagen = `img/${it.id}.${EXT_REMOTA[tipo]}`
    bajadas++
  } catch (e) {
    log.push(`  ${it.id}: ${origen} -> ${e.message}`)
    fallo++
  }
  await sleep(1000) // despacio: una imagen por segundo
}

// ---- Tiendas: cuántas ofertas salieron de cada una ----
const normTienda = (t) => String(t ?? '').replace(/\s*\(.*\)\s*$/, '').trim().toLowerCase()
const tiendas = tiendasCrudas.map((t) => {
  // "bloqueada" solo vale si se probó en un navegador real: un 403 por script no prueba nada
  if (t.estado === 'bloqueada' && !/navegador/i.test(t.metodo ?? '')) {
    console.warn(`  ⚠ ${t.id}: marcada bloqueada sin probar en el navegador → pasa a pendiente`)
    return { ...t, estado: 'pendiente', nota: 'Falta probarla en el navegador', ofertas: 0, ofertas_disponibles: 0 }
  }
  return { tipo: 'otro', pais: '', url: '', ...t, ofertas: 0, ofertas_disponibles: 0 }
})
const porClave = new Map()
for (const t of tiendas) { porClave.set(t.id.toLowerCase(), t); porClave.set(String(t.nombre).toLowerCase(), t) }
for (const it of items) {
  for (const o of it.ofertas) {
    const clave = normTienda(o.tienda)
    if (!clave) continue
    let t = porClave.get(clave)
    if (!t) {
      let url = ''
      try { url = new URL(o.url).origin } catch { /* url inválida */ }
      t = { id: clave, nombre: clave, pais: o.pais || 'otro', url, tipo: 'otro', estado: 'revisada', metodo: '', ofertas: 0, ofertas_disponibles: 0 }
      tiendas.push(t); porClave.set(clave, t)
    }
    t.ofertas++
    if (o.disponible) t.ofertas_disponibles++
  }
}

const verificadas = items.flatMap((it) => it.ofertas.map((o) => o.verificado)).filter(Boolean).sort()
const salida = {
  generado: new Date().toISOString().slice(0, 10),
  datos_verificados: verificadas.at(-1) ?? fechas.sort().at(-1) ?? null,
  config,
  tiendas,
  items,
}
mkdirSync(path.dirname(outJson), { recursive: true })
writeFileSync(outJson, JSON.stringify(salida, null, 1))

const cuenta = (f) => items.filter(f).length
console.log(`config: ${rel(configPath)} (${config.categoria})`)
console.log(`ítems: ${items.length} (${config.segmentos.map((s) => `${s.nombre} ${cuenta((it) => it.segmento === s.id)}`).join(', ')})`)
console.log(`franjas: ${['ideal', 'estirando', 'sobre_tope', 'no_disponible', 'descartado'].map((f) => `${f} ${cuenta((it) => it.franja === f)}`).join(', ')}; destacados ${cuenta((it) => it.destacado)}`)
console.log(`imágenes: ${copiadas} copiadas, ${bajadas} descargadas, ${reusadas} reutilizadas, ${fallo} fallidas`)
if (log.length) console.log(log.join('\n'))
// Una imagen rechazada por seguridad no es un fallo tolerable: corta el build (y el CI)
if (log.some((l) => l.includes('imagen rechazada'))) { console.error('✖ Hay imágenes rechazadas por seguridad'); process.exit(1) }
