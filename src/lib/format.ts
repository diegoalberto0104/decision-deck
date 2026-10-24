import { cfg, idioma, valorFicha } from './config'
import { t } from './i18n'
import type { AtributoFicha, Item } from './types'

const cache = new Map<string, Intl.NumberFormat>()
const nf = (clave: string, opciones: Intl.NumberFormatOptions) => {
  let f = cache.get(clave)
  if (!f) { f = new Intl.NumberFormat(idioma(), opciones); cache.set(clave, f) }
  return f
}

export const fmtPrecio = (n: number | null | undefined, moneda = cfg().moneda) =>
  n == null ? t('sinDato') : nf(`p-${moneda}`, { style: 'currency', currency: moneda, maximumFractionDigits: moneda === cfg().moneda ? 0 : 2 }).format(n)

/** Precio corto para ejes de gráficos: "450 mil", "1,2 M". */
export const fmtCorto = (n: number) => nf('corto', { notation: 'compact', maximumFractionDigits: 1 }).format(n)

export const fmtNum = (n: number, decimales = 0) =>
  nf(`n-${decimales}`, { minimumFractionDigits: decimales, maximumFractionDigits: decimales }).format(n)

export const fmtFecha = (iso: string | null | undefined) => {
  if (!iso) return t('sinFecha')
  const [y, m, d] = iso.split('-').map(Number)
  if (!y || !m || !d) return iso
  return new Intl.DateTimeFormat(idioma(), { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(y, m - 1, d))
}

export const paisNombre = (p: string) => {
  const propio = cfg().paises?.[p]
  if (propio) return propio
  try { return new Intl.DisplayNames([idioma()], { type: 'region' }).of(p) ?? p } catch { return p }
}

/** Valor de un atributo de la ficha con su unidad, o "sin dato". */
export function fmtAtributo(z: Item, a: AtributoFicha) {
  const v = valorFicha(z, a)
  if (v == null || v === '') return t('sinDato')
  if (typeof v === 'boolean') return v ? t('si') : t('no')
  const texto = typeof v === 'number' ? fmtNum(v, Number.isInteger(v) ? 0 : 1) : v
  return a.unidad ? `${texto} ${a.unidad}` : texto
}
