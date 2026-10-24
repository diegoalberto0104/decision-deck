import { cfg } from './config'
import type { Ejes, Estado, Item, Voto } from './types'

type EstadoNotas = Pick<Estado, 'propias' | 'votos'>
type EstadoPuntaje = EstadoNotas & Pick<Estado, 'pesos'>

const NOTA_VOTO: Record<Voto, number> = { si: 4, tal_vez: 3, no: 2 }

/** Ejes del ítem con las notas propias del usuario (ejes editables) y, si no hay, la del voto. */
export function ejesDe(z: Item, estado: EstadoNotas): Ejes {
  let r = z.ejes
  for (const e of cfg().ejes) {
    if (!e.editable) continue
    const propia = estado.propias[e.id]?.[z.id]
    const voto = estado.votos[z.id]
    const v = propia ?? z.ejes[e.id] ?? (e.desde_voto && voto ? NOTA_VOTO[voto] : null)
    if (v !== z.ejes[e.id]) r = { ...r, [e.id]: v }
  }
  return r
}

/** Puntaje 0–5: promedio ponderado; un eje sin dato cuenta 0 (igual que en el radar). */
export function puntaje(z: Item, estado: EstadoPuntaje): number {
  const ejes = ejesDe(z, estado)
  let num = 0
  let den = 0
  for (const { id } of cfg().ejes) {
    const w = estado.pesos[id] ?? 0
    num += w * (ejes[id] ?? 0)
    den += w
  }
  return den === 0 ? 0 : num / den
}

export const sinDato = (z: Item, estado: EstadoNotas) =>
  cfg().ejes.filter(({ id }) => ejesDe(z, estado)[id] == null).map((e) => e.nombre)

/** Orden de la ronda de deslizar: comprables primero, luego destacados y luego más barato. */
const RANGO_FRANJA: Record<string, number> = { ideal: 0, estirando: 0, sobre_tope: 1, no_disponible: 2, descartado: 3 }

export function ordenRonda(a: Item, b: Item) {
  return (
    (RANGO_FRANJA[a.franja] ?? 3) - (RANGO_FRANJA[b.franja] ?? 3) ||
    Number(b.destacado) - Number(a.destacado) ||
    (a.mejor_oferta?.precio_final ?? 0) - (b.mejor_oferta?.precio_final ?? 0)
  )
}

/** Comprable hoy: disponible y dentro del techo (ideal o estirando). */
export const dentroDelPresupuesto = (z: Item) => z.franja === 'ideal' || z.franja === 'estirando'

/** Mejor primero: destacados y luego puntaje. */
export const rankear = (zs: Item[], estado: EstadoPuntaje) =>
  [...zs].sort((a, b) => Number(b.destacado) - Number(a.destacado) || puntaje(b, estado) - puntaje(a, estado))

/** Ejes medidos de verdad: ni editables por el usuario ni derivados del precio. */
const ejesMedibles = () => cfg().ejes.filter((e) => !e.editable && e.derivado !== 'precio_inverso')
/** Ejes con dato y mínimo para fiarse del puntaje justo. */
export const minEjesJusto = () => Math.min(3, cfg().ejes.length)
export const minEjesMedidos = () => Math.min(2, ejesMedibles().length)

export const ejesMedidos = (z: Item) => ejesMedibles().filter((e) => z.ejes[e.id] != null).length

export function datosCompletos(z: Item, estado?: EstadoNotas): number {
  const ejes = estado ? ejesDe(z, estado) : z.ejes
  return cfg().ejes.filter(({ id }) => ejes[id] != null).length
}

export const faltanDatos = (z: Item, estado: EstadoNotas) =>
  datosCompletos(z, estado) < minEjesJusto() || ejesMedidos(z) < minEjesMedidos()

/**
 * Puntaje 0–5 justo: promedio ponderado SOLO de los ejes con dato (los null no entran ni al
 * numerador ni al denominador). Devuelve null si no hay peso útil. No reemplaza a `puntaje`.
 */
export function puntajeJusto(z: Item, estado: EstadoPuntaje): number | null {
  const ejes = ejesDe(z, estado)
  let num = 0
  let den = 0
  for (const { id } of cfg().ejes) {
    const v = ejes[id]
    if (v == null) continue
    const w = estado.pesos[id] ?? 0
    num += w * v
    den += w
  }
  return den === 0 ? null : num / den
}
