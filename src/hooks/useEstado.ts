import { useCallback, useEffect, useState } from 'react'
import { cfg, pesosIniciales, segmentoPrincipal } from '@/lib/config'
import type { Estado } from '@/lib/types'

// Una clave por categoría: cambiar de config no mezcla votos
const clave = () => `decision-deck:${cfg().categoria.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`

const inicial = (): Estado => ({
  votos: {}, orden: [], propias: {}, pesos: pesosIniciales(),
  paso: 'deslizar', ronda: segmentoPrincipal(), tab: segmentoPrincipal(),
})

function leer(): Estado {
  try {
    const raw = localStorage.getItem(clave())
    if (raw) {
      const p = JSON.parse(raw)
      const base = inicial()
      const ids = new Set(cfg().segmentos.map((s) => s.id))
      const pesos = Object.fromEntries(Object.entries(base.pesos).map(([k, v]) => [k, p.pesos?.[k] ?? v]))
      return {
        ...base, ...p, pesos, propias: p.propias ?? {},
        ronda: ids.has(p.ronda) ? p.ronda : base.ronda,
        tab: ids.has(p.tab) ? p.tab : base.tab,
      }
    }
  } catch { /* sin almacenamiento: se arranca vacío */ }
  return inicial()
}

export function useEstado() {
  const [estado, setEstado] = useState<Estado>(leer)

  useEffect(() => {
    try { localStorage.setItem(clave(), JSON.stringify(estado)) } catch { /* ignorar */ }
  }, [estado])

  const parchar = useCallback((fn: (e: Estado) => Partial<Estado>) => setEstado((e) => ({ ...e, ...fn(e) })), [])
  return { estado, parchar }
}
