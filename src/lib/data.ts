import type { Datos } from './types'

export async function cargarDatos(): Promise<Datos> {
  const res = await fetch(`${import.meta.env.BASE_URL}data/datos.json`)
  if (!res.ok) throw new Error(`No se pudo cargar datos.json (${res.status})`)
  return res.json()
}

export const urlImagen = (local: string | null) => (local ? `${import.meta.env.BASE_URL}${local}` : null)
