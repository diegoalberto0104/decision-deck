export type Voto = 'si' | 'no' | 'tal_vez'
export type Franja = 'ideal' | 'estirando' | 'sobre_tope' | 'no_disponible' | 'descartado'
export type FiltroId = 'disponible' | 'dentro_del_presupuesto' | 'pais' | 'insignia' | 'sin_alerta' | 'mis_votos'

export interface Segmento { id: string; nombre: string; descripcion?: string; principal?: boolean }

export interface Eje {
  id: string
  nombre: string
  importancia?: number
  derivado?: 'precio_inverso' | 'menor_es_mejor' | 'mayor_es_mejor'
  campo?: string
  cortes?: number[]
  editable?: boolean
  desde_voto?: boolean
}

export interface Condicion { campo: string; es?: string | number | boolean; no_es?: string | number | boolean; min?: number; max?: number; existe?: boolean }
export interface Regla { id: string; nombre: string; descripcion?: string; destacada?: boolean; segmentos?: string[]; condiciones: Condicion[] }
export interface AtributoFicha { campo: string; nombre: string; unidad?: string; mejor?: 'min' | 'max'; en_tarjeta?: boolean }

export interface Config {
  categoria: string
  titulo?: string
  descripcion?: string
  idioma?: string
  moneda: string
  presupuesto: { ideal: number; techo: number }
  textos?: { item?: string; items?: string; disponible?: string; variante?: string }
  segmentos: Segmento[]
  ejes: Eje[]
  innegociables?: Regla[]
  insignias?: Regla[]
  filtros?: FiltroId[]
  atributos_ficha?: AtributoFicha[]
  paises?: Record<string, string>
  aclaraciones?: string[]
  repo_issues?: string
}

export interface Oferta {
  tienda: string
  pais: string
  url: string
  variante: string | null
  precio: number | null
  moneda: string
  precio_final: number | null
  disponible: boolean
  verificado: string | null
  metodo?: string
  nota?: string
}

export type Ejes = Record<string, number | null>
export type ValorFicha = string | number | boolean | null

export interface Item {
  id: string
  segmento: string
  marca: string
  modelo: string
  variante: string | null
  imagen: string | null
  ficha: Record<string, ValorFicha | string[]>
  notas: Record<string, number | null | string[]>
  sirve_en?: Record<string, number | null>
  beneficios: string[]
  contras: string[]
  estado: string
  motivo?: string
  alerta?: string
  ofertas: Oferta[]
  mejor_oferta: Oferta | null
  franja: Franja
  ejes: Ejes
  insignias: string[]
  destacado: boolean
}

export type EstadoTienda = 'revisada' | 'bloqueada' | 'pendiente' | 'sin_resultados'
export interface Tienda {
  id: string
  nombre: string
  pais: string
  url: string
  tipo: 'oficial' | 'multimarca' | 'marketplace' | 'otro'
  estado: EstadoTienda
  metodo?: string
  nota?: string
  ofertas: number
  ofertas_disponibles: number
}

export interface Datos {
  generado: string
  datos_verificados: string | null
  config: Config
  tiendas: Tienda[]
  items: Item[]
}

export interface Estado {
  votos: Record<string, Voto>
  orden: string[]
  /** Notas propias en los ejes editables: propias[eje][id]. */
  propias: Record<string, Record<string, number>>
  pesos: Record<string, number>
  paso: 'deslizar' | 'resultados'
  ronda: string
  tab: string
}
