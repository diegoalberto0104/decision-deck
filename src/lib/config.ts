import { t } from './i18n'
import type { AtributoFicha, Config, Item, Regla, ValorFicha } from './types'

// La config llega con los datos y no cambia mientras la página está abierta.
let actual: Config | null = null

export function usarConfig(c: Config) {
  actual = c
}

export function cfg(): Config {
  if (!actual) throw new Error('Config sin cargar')
  return actual
}

export const textos = () => ({ item: t('defItem'), items: t('defItems'), disponible: t('defDisponible'), variante: t('defVariante'), ...cfg().textos })
export const idioma = () => cfg().idioma ?? 'es-CO'

export const segmentoPrincipal = () => (cfg().segmentos.find((s) => s.principal) ?? cfg().segmentos[0]).id
export const nombreSegmento = (id: string) => cfg().segmentos.find((s) => s.id === id)?.nombre ?? id

export const pesosIniciales = (): Record<string, number> =>
  Object.fromEntries(cfg().ejes.map((e) => [e.id, e.importancia ?? 3]))

export const insignia = (id: string): Regla | undefined => cfg().insignias?.find((i) => i.id === id)
export const insigniaDestacada = (): Regla | undefined => cfg().insignias?.find((i) => i.destacada)

export const valorEn = (obj: unknown, ruta: string): unknown =>
  ruta.split('.').reduce<unknown>((o, k) => (o == null ? undefined : (o as Record<string, unknown>)[k]), obj)

export const valorFicha = (z: Item, a: AtributoFicha): ValorFicha => {
  const v = valorEn(z, a.campo)
  return typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean' ? v : null
}
