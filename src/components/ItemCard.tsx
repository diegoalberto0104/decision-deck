import { useState } from 'react'
import { ExternalLink, Layers } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button, buttonVariants } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from '@/components/ui/drawer'
import { ItemImage } from '@/components/ItemImage'
import { cfg, insignia, textos, valorFicha } from '@/lib/config'
import { fmtAtributo, fmtFecha, fmtNum, fmtPrecio, paisNombre } from '@/lib/format'
import { t as tr } from '@/lib/i18n'
import { ejesDe } from '@/lib/scoring'
import { cn } from '@/lib/utils'
import type { Estado, Item } from '@/lib/types'

interface Props {
  z: Item
  estado: Estado
  puntaje?: number
  comparando: boolean
  onComparar: (id: string) => void
  onNota: (eje: string, id: string, v: number) => void
  /** Texto del botón y acción extra (p. ej. pasar a Sí). */
  accion?: { etiqueta: string; onClick: () => void }
}

/** Etiquetas de insignias: la destacada brilla. */
export function Insignias({ z }: { z: Item }) {
  return z.insignias.map((id) => {
    const i = insignia(id)
    if (!i) return null
    const badge = i.destacada
      ? <Badge className="glow-accent border-primary/60 bg-primary/15 text-primary">{i.nombre}</Badge>
      : <Badge variant="outline" className="border-primary/50 text-primary">{i.nombre}</Badge>
    if (!i.descripcion) return <span key={id}>{badge}</span>
    return (
      <Tooltip key={id}>
        <TooltipTrigger render={<span />}>{badge}</TooltipTrigger>
        <TooltipContent>{i.descripcion}</TooltipContent>
      </Tooltip>
    )
  })
}

export function ItemCard({ z, estado, puntaje, comparando, onComparar, onNota, accion }: Props) {
  const [abierto, setAbierto] = useState(false)
  const t = textos()
  const { presupuesto, moneda } = cfg()
  const m = z.mejor_oferta
  // Oferta más barata pero no disponible: se muestra como pista, no como precio
  const pista = z.ofertas
    .filter((o) => !o.disponible && o.precio_final != null && (m?.precio_final == null || o.precio_final < m.precio_final))
    .sort((a, b) => (a.precio_final ?? 0) - (b.precio_final ?? 0))[0]
  const ejes = ejesDe(z, estado)
  const editables = cfg().ejes.filter((e) => e.editable)
  const sobre = m && z.franja === 'sobre_tope' ? (m.precio_final ?? 0) - presupuesto.techo : 0
  const enTarjeta = (cfg().atributos_ficha ?? []).filter((a) => a.en_tarjeta && valorFicha(z, a) != null)

  return (
    <article className={cn('flex flex-col gap-3 rounded-xl border bg-card p-3', z.destacado && 'glow-accent')}>
      <div className="relative">
        <ItemImage z={z} className="aspect-[4/3] w-full" />
        <label className="absolute top-2 left-2 flex min-h-11 cursor-pointer items-center gap-2 rounded-lg bg-background/85 px-3 text-xs font-medium backdrop-blur">
          <Checkbox checked={comparando} onCheckedChange={() => onComparar(z.id)} aria-label={tr('compararItem', { nombre: `${z.marca} ${z.modelo}` })} />
          {tr('comparar')}
        </label>
        {puntaje != null && (
          <span className="num absolute top-2 right-2 rounded-lg bg-background/85 px-2 py-1 text-xs backdrop-blur" title={tr('puntajePonderado')}>
            {fmtNum(puntaje, 2)}
          </span>
        )}
      </div>

      <div className="flex flex-wrap gap-1.5">
        <Insignias z={z} />
        {enTarjeta.map((a) => (
          <Badge key={a.campo} variant="outline" className={cn(typeof valorFicha(z, a) === 'number' && 'num')}>{fmtAtributo(z, a)}</Badge>
        ))}
        {z.franja === 'estirando' && <Badge variant="outline" className="border-talvez/60 text-talvez">{tr('estirando')}</Badge>}
        {sobre > 0 && <Badge variant="outline" className="num border-no/60 text-no">{tr('sobreTecho', { monto: fmtPrecio(sobre) })}</Badge>}
        {z.franja === 'descartado' && <Badge variant="outline" className="border-no/60 text-no">{tr('descartado')}</Badge>}
      </div>

      <div>
        <p className="text-sm text-muted-foreground">{z.marca}</p>
        <h3 className="text-xl leading-tight font-semibold tracking-tight">{z.modelo}</h3>
        {m ? (
          <p className="mt-1 flex flex-wrap items-baseline gap-x-2">
            <span className="num text-lg font-medium text-primary">{fmtPrecio(m.precio_final)}</span>
            <span className="text-xs text-muted-foreground">{tr('en', { tienda: m.tienda })}</span>
          </p>
        ) : (
          <p className="mt-1 text-sm text-muted-foreground">{tr('sinOferta', { disponible: t.disponible })}</p>
        )}
        {(m?.variante ?? z.variante) && <p className="mt-0.5 text-xs text-muted-foreground">{t.variante}: {m?.variante ?? z.variante}</p>}
        {pista && (
          <p className="mt-1 text-xs text-talvez">
            {tr('masBarato', { tienda: pista.tienda, precio: fmtPrecio(pista.precio_final), disponible: t.disponible })}
          </p>
        )}
        {z.alerta && <p className="mt-2 rounded-md border border-talvez/50 bg-talvez/10 px-2 py-1.5 text-xs text-talvez">{z.alerta}</p>}
        {(!m || z.franja === 'descartado') && z.motivo && <p className="mt-1 text-xs text-muted-foreground">{z.motivo}</p>}
      </div>

      {z.beneficios.length > 0 && (
        <ul className="space-y-1 text-sm">
          {z.beneficios.slice(0, 3).map((b) => (
            <li key={b} className="flex gap-2"><span className="text-si" aria-hidden>+</span><span>{b}</span></li>
          ))}
        </ul>
      )}
      {z.contras.length > 0 && (
        <ul className="space-y-1 text-sm text-muted-foreground">
          {z.contras.slice(0, 2).map((c) => (
            <li key={c} className="flex gap-2"><span className="text-no" aria-hidden>−</span><span>{c}</span></li>
          ))}
        </ul>
      )}

      {editables.map((e) => (
        <div key={e.id} className="flex items-center justify-between gap-2 border-t pt-3">
          <span className="text-xs text-muted-foreground">{tr('tuyo', { eje: e.nombre })}</span>
          <ToggleGroup
            aria-label={tr('ejeDe', { eje: e.nombre, nombre: z.modelo })}
            value={ejes[e.id] != null ? [String(Math.round(ejes[e.id]!))] : []}
            onValueChange={(v) => { if (v.length) onNota(e.id, z.id, Number(v[v.length - 1])) }}
            spacing={1}
          >
            {[1, 2, 3, 4, 5].map((n) => (
              <ToggleGroupItem key={n} value={String(n)} className="num h-11 min-w-9 data-pressed:bg-primary data-pressed:text-primary-foreground" aria-label={`${e.nombre} ${n}`}>
                {n}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>
      ))}

      <div className="mt-auto flex flex-col gap-2">
        {accion && (
          <Button variant="outline" className="h-11 border-si/60 text-si hover:bg-si/10 hover:text-si" onClick={accion.onClick}>
            {accion.etiqueta}
          </Button>
        )}
        {m && (
          <a href={m.url} target="_blank" rel="noopener noreferrer" className={cn(buttonVariants(), 'h-11 glow-accent')}>
            {tr('comprar', { precio: fmtPrecio(m.precio_final) })} <ExternalLink className="size-4" />
          </a>
        )}
        {z.ofertas.length > 0 && (
          <Button variant="ghost" className="h-11" onClick={() => setAbierto(true)}>
            <Layers className="size-4" /> {z.ofertas.length === 1 ? tr('verOferta') : tr('verOfertas', { n: z.ofertas.length })}
          </Button>
        )}
      </div>

      <Drawer open={abierto} onOpenChange={setAbierto}>
        <DrawerContent>
          <div className="mx-auto flex max-h-[85dvh] w-full max-w-2xl flex-col">
            <DrawerHeader>
              <DrawerTitle>{z.marca} {z.modelo}</DrawerTitle>
              <DrawerDescription>{tr('ofertasDesc')}</DrawerDescription>
            </DrawerHeader>
            <ul className="space-y-2 overflow-y-auto px-4 pb-6">
              {[...z.ofertas].sort((a, b) => (a.precio_final ?? Infinity) - (b.precio_final ?? Infinity)).map((o, i) => (
                <li key={i} className={cn('rounded-xl border bg-surface-2 p-3', !o.disponible && 'opacity-70')}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">{o.tienda} {o.pais && <span className="text-xs text-muted-foreground">· {paisNombre(o.pais)}</span>}</p>
                      <p className="text-xs text-muted-foreground">{o.variante ?? tr('varianteSinDato', { variante: t.variante })}</p>
                    </div>
                    <p className="num text-right text-sm font-medium">{o.precio_final == null ? tr('sinPrecio') : fmtPrecio(o.precio_final)}</p>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {o.disponible ? <span className="text-si">{t.disponible}</span> : <span className="text-talvez">{tr('noDisponibleHoy', { disponible: t.disponible })}</span>} · {tr('verificado', { fecha: fmtFecha(o.verificado) })}
                  </p>
                  {o.moneda !== moneda && o.precio != null && (
                    <p className="num text-xs text-muted-foreground">{tr('convertido', { precio: fmtPrecio(o.precio, o.moneda) })}</p>
                  )}
                  {o.nota && <p className="mt-1 text-xs text-muted-foreground">{o.nota}</p>}
                  <a href={o.url} target="_blank" rel="noopener noreferrer" className={cn(buttonVariants({ variant: 'outline' }), 'mt-2 h-11 w-full')}>
                    {tr('abrirEn', { tienda: o.tienda })} <ExternalLink className="size-4" />
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </DrawerContent>
      </Drawer>
    </article>
  )
}
