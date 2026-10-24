import { Sparkles } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { ItemImage } from '@/components/ItemImage'
import { cfg, insigniaDestacada, segmentoPrincipal, textos } from '@/lib/config'
import { fmtNum, fmtPrecio } from '@/lib/format'
import { t as tr } from '@/lib/i18n'
import { dentroDelPresupuesto, puntaje, rankear } from '@/lib/scoring'
import type { Estado, Item } from '@/lib/types'

/**
 * Calculada: el mejor destacado entre los Sí (más el mejor de otro segmento como opción secundaria);
 * si no hay destacado, el mejor de cada segmento.
 */
export function Recommendation({ si: siTodos, estado }: { si: Item[]; estado: Estado }) {
  // Solo se recomienda lo comprable hoy (disponible y dentro del techo)
  const si = siTodos.filter(dentroDelPresupuesto)
  const principal = segmentoPrincipal()
  const mejores = cfg().segmentos
    .map((s) => rankear(si.filter((z) => z.segmento === s.id), estado)[0])
    .filter((z): z is Item => !!z)
  const destacado = rankear(si.filter((z) => z.destacado), estado)[0]
  const insignia = insigniaDestacada()
  const t = textos()

  let titulo: string
  let lista: Item[]
  let extra: Item | undefined
  if (destacado && insignia) {
    titulo = tr('recomendadoInsignia', { insignia: insignia.nombre.toLowerCase() })
    lista = [destacado]
    extra = mejores.find((z) => z.segmento !== destacado.segmento && z.segmento !== principal) ??
      mejores.find((z) => z.segmento !== destacado.segmento)
  } else if (mejores.length) {
    titulo = mejores.length > 1 ? tr('recomendadoCada') : tr('recomendado')
    lista = mejores
  } else {
    return (
      <section className="rounded-xl border border-dashed bg-card p-4 text-sm text-muted-foreground">
        {tr('sinRecomendacion', { items: t.items })}
      </section>
    )
  }
  const total = lista.reduce((s, z) => s + (z.mejor_oferta?.precio_final ?? 0), 0)

  return (
    <section className="glow-accent rounded-xl border border-primary/40 bg-card p-4">
      <div className="mb-3 flex items-center gap-2">
        <Sparkles className="size-4 text-primary" />
        <h2 className="text-base font-semibold tracking-tight">{titulo}</h2>
      </div>
      {insignia && destacado && insignia.descripcion && <p className="-mt-2 mb-3 text-xs text-muted-foreground">{insignia.descripcion}</p>}
      <ul className="space-y-3">
        {lista.map((z) => (
          <Fila key={z.id} z={z} estado={estado} />
        ))}
      </ul>
      {lista.length > 1 && (
        <p className="num mt-3 text-sm text-muted-foreground">{tr('todosJuntos')} <span className="text-foreground">{fmtPrecio(total)}</span></p>
      )}
      {extra && destacado && (
        <div className="mt-3 border-t pt-3">
          <p className="mb-2 text-xs text-muted-foreground">{tr('opcionSecundaria')}</p>
          <ul><Fila z={extra} estado={estado} /></ul>
          <p className="num mt-2 text-sm text-muted-foreground">
            {tr('losDos')} <span className="text-foreground">{fmtPrecio((destacado.mejor_oferta?.precio_final ?? 0) + (extra.mejor_oferta?.precio_final ?? 0))}</span>
          </p>
        </div>
      )}
    </section>
  )
}

function Fila({ z, estado }: { z: Item; estado: Estado }) {
  const insignia = z.destacado ? insigniaDestacada() : undefined
  return (
    <li className="flex items-center gap-3">
      <ItemImage z={z} className="h-16 w-20 shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs text-muted-foreground">{z.marca}</p>
        <p className="line-clamp-2 leading-tight font-medium">{z.modelo}</p>
        <p className="num text-sm text-primary">{fmtPrecio(z.mejor_oferta?.precio_final)} <span className="text-xs text-muted-foreground">· {z.mejor_oferta?.tienda}</span></p>
        {z.alerta && <p className="mt-0.5 text-xs text-talvez">{tr('ojoConfirmar')}</p>}
      </div>
      <div className="flex flex-col items-end gap-1">
        {insignia && <Badge className="glow-accent border-primary/60 bg-primary/15 text-primary">{insignia.nombre}</Badge>}
        <span className="num text-xs text-muted-foreground">{fmtNum(puntaje(z, estado), 2)}/5</span>
      </div>
    </li>
  )
}
