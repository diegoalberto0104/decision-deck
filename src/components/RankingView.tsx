import { useMemo, useState } from 'react'
import { AlertTriangle, SlidersHorizontal } from 'lucide-react'
import { CartesianGrid, ReferenceLine, Scatter, ScatterChart, XAxis, YAxis } from 'recharts'
import { Button } from '@/components/ui/button'
import { ChartContainer, ChartTooltip, type ChartConfig } from '@/components/ui/chart'
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from '@/components/ui/drawer'
import { Separator } from '@/components/ui/separator'
import { Slider } from '@/components/ui/slider'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Toggle } from '@/components/ui/toggle'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { ItemCard } from '@/components/ItemCard'
import { ItemImage } from '@/components/ItemImage'
import { cfg, insigniaDestacada, pesosIniciales, segmentoPrincipal, textos } from '@/lib/config'
import { fmtCorto, fmtNum, fmtPrecio, paisNombre } from '@/lib/format'
import { t as tr } from '@/lib/i18n'
import { dentroDelPresupuesto, ejesDe, faltanDatos, puntajeJusto } from '@/lib/scoring'
import { cn } from '@/lib/utils'
import type { Datos, Estado, FiltroId, Item } from '@/lib/types'

type Orden = string // 'total' o el id de un eje
type Filtro = Exclude<FiltroId, 'pais'>
type Nivel = 'S' | 'A' | 'B' | 'C' | 'sin'

const ACENTO = '#00F0C8'
const AZUL = '#7C9CFF'
const AMBAR = '#FFC857'
const GRIS = '#8B98A5'

const NIVELES: { id: Nivel; titulo: string | (() => string); color: string }[] = [
  { id: 'S', titulo: 'S', color: ACENTO },
  { id: 'A', titulo: 'A', color: AZUL },
  { id: 'B', titulo: 'B', color: AMBAR },
  { id: 'C', titulo: 'C', color: GRIS },
  { id: 'sin', titulo: () => tr('sinDatos'), color: GRIS },
]

const fmtEje = (n: number) => (Number.isInteger(n) ? String(n) : fmtNum(n, 1))
const precioDe = (z: Item) => z.mejor_oferta?.precio_final ?? null

/** Etiquetas de los filtros que pide la config ('pais' va aparte, como selector). */
function etiquetasFiltros(): { id: Filtro; label: string }[] {
  const t = textos()
  const destacada = insigniaDestacada()
  const todas: Record<Filtro, string | null> = {
    disponible: tr('soloDisponible', { disponible: t.disponible }),
    dentro_del_presupuesto: tr('dentroTecho', { techo: fmtPrecio(cfg().presupuesto.techo) }),
    insignia: destacada ? tr('soloInsignia', { insignia: destacada.nombre.toLowerCase() }) : null,
    sin_alerta: tr('ocultarAlerta'),
    mis_votos: tr('soloMisVotos'),
  }
  return (cfg().filtros ?? ['disponible', 'dentro_del_presupuesto', 'mis_votos'])
    .filter((f): f is Filtro => f !== 'pais' && !!todas[f as Filtro])
    .map((id) => ({ id, label: todas[id]! }))
}

interface Props {
  datos: Datos
  estado: Estado
  parchar: (fn: (e: Estado) => Partial<Estado>) => void
  comparar: string[]
  onComparar: (id: string) => void
  onNota: (eje: string, id: string, v: number) => void
}

export function RankingView({ datos, estado, parchar, comparar, onComparar, onNota }: Props) {
  const { ejes, segmentos, presupuesto } = cfg()
  const [orden, setOrden] = useState<Orden>('total')
  const [segmento, setSegmento] = useState<string>(segmentoPrincipal())
  const [activos, setActivos] = useState<Set<Filtro>>(() => new Set<Filtro>(['disponible']))
  const [pais, setPais] = useState<string>('todos')
  const [vista, setVista] = useState<'tier' | 'precio'>('tier')
  const [ficha, setFicha] = useState<string | null>(null)
  const [pesos, setPesos] = useState(false)
  const filtros = etiquetasFiltros()
  const conPais = cfg().filtros?.includes('pais')
  const paises = useMemo(() => [...new Set(datos.items.flatMap((z) => z.ofertas.map((o) => o.pais)).filter(Boolean))].sort(), [datos])
  const ordenes = [{ id: 'total', label: tr('puntajeTotal') }, ...ejes.map((e) => ({ id: e.id, label: e.nombre }))]
  const ejePrecio = ejes.find((e) => e.derivado === 'precio_inverso')?.id

  const alternar = (f: Filtro, on: boolean) =>
    setActivos((a) => {
      const n = new Set(a)
      if (on) n.add(f); else n.delete(f)
      return n
    })

  const total = (z: Item) => (faltanDatos(z, estado) ? null : puntajeJusto(z, estado))
  const valor = (z: Item): number | null => (orden === 'total' ? total(z) : ejesDe(z, estado)[orden] ?? null)
  // En el gráfico X ya es el precio: el Y "total" es calidad sin el eje precio, para no contarlo dos veces
  const calidad = (z: Item) =>
    faltanDatos(z, estado) ? null : puntajeJusto(z, { ...estado, pesos: ejePrecio ? { ...estado.pesos, [ejePrecio]: 0 } : estado.pesos })
  const yEsCalidad = orden === 'total' || orden === ejePrecio
  const valorY = (z: Item): number | null => (yEsCalidad ? calidad(z) : valor(z))

  const filtrados = useMemo(
    () =>
      datos.items.filter((z) => {
        if (segmento !== 'todos' && z.segmento !== segmento) return false
        if (activos.has('disponible') && (!z.mejor_oferta || z.franja === 'descartado')) return false
        if (activos.has('dentro_del_presupuesto') && !dentroDelPresupuesto(z)) return false
        if (activos.has('insignia') && !z.destacado) return false
        if (activos.has('sin_alerta') && z.alerta) return false
        if (activos.has('mis_votos') && !['si', 'tal_vez'].includes(estado.votos[z.id])) return false
        if (pais !== 'todos' && !z.ofertas.some((o) => o.pais === pais && o.disponible)) return false
        return true
      }),
    [datos, segmento, activos, pais, estado.votos],
  )

  const nivelDe = (z: Item): Nivel => {
    const v = valor(z)
    if (v == null) return 'sin'
    if (orden === 'total') return v >= 4 ? 'S' : v >= 3.5 ? 'A' : v >= 3 ? 'B' : 'C'
    const r = Math.round(v)
    return r >= 5 ? 'S' : r === 4 ? 'A' : r === 3 ? 'B' : 'C'
  }

  const filas = useMemo(() => {
    const m: Record<Nivel, Item[]> = { S: [], A: [], B: [], C: [], sin: [] }
    for (const z of filtrados) m[nivelDe(z)].push(z)
    for (const k of Object.keys(m) as Nivel[]) {
      m[k].sort((a, b) => (valor(b) ?? 0) - (valor(a) ?? 0) || (precioDe(a) ?? Infinity) - (precioDe(b) ?? Infinity))
    }
    return m
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtrados, orden, estado.propias, estado.votos, estado.pesos])

  const zFicha = ficha ? datos.items.find((z) => z.id === ficha) ?? null : null
  const t = textos()
  const contador = tr('contador', { n: filtrados.length, items: filtrados.length === 1 ? t.item : t.items })
  const etiquetaY = yEsCalidad ? tr('calidadSinPrecio') : ordenes.find((o) => o.id === orden)!.label

  return (
    <section className="mt-6" aria-label={tr('ranking')}>
      <div className={cn('grid gap-3', segmentos.length > 1 && 'sm:grid-cols-2')}>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="rk-orden" className="text-xs text-muted-foreground">{tr('ordenarPor')}</label>
          <select
            id="rk-orden"
            value={orden}
            onChange={(e) => setOrden(e.target.value)}
            className="h-11 w-full rounded-lg border border-input bg-card px-3 text-sm"
          >
            {ordenes.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
          </select>
        </div>
        {segmentos.length > 1 && (
          <div className="flex flex-col gap-1.5">
            <span id="rk-seg" className="text-xs text-muted-foreground">{tr('segmento')}</span>
            <ToggleGroup
              aria-labelledby="rk-seg"
              value={[segmento]}
              onValueChange={(v) => { if (v.length) setSegmento(v[v.length - 1]) }}
              spacing={1}
              className="w-full"
            >
              {[...segmentos.map((s) => ({ id: s.id, nombre: s.nombre })), { id: 'todos', nombre: tr('todos') }].map((s) => (
                <ToggleGroupItem
                  key={s.id} value={s.id}
                  className="h-11 min-w-0 flex-1 px-2 data-pressed:bg-primary data-pressed:text-primary-foreground"
                >
                  <span className="truncate">{s.nombre}</span>
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </div>
        )}
      </div>

      <details className="group mt-3 rounded-xl border bg-card/40 px-3">
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between text-sm font-medium">
          <span>{tr('filtros')} <span className="num text-muted-foreground">{tr('activos', { n: activos.size + (pais !== 'todos' ? 1 : 0) })}</span></span>
          <span aria-hidden className="text-muted-foreground transition-transform group-open:rotate-180">▾</span>
        </summary>
        <div className="mb-3 flex flex-wrap gap-2" role="group" aria-label={tr('filtros')}>
          {filtros.map((f) => (
            <Toggle
              key={f.id}
              variant="outline"
              pressed={activos.has(f.id)}
              onPressedChange={(on) => alternar(f.id, on)}
              className="h-11 px-3 data-pressed:border-primary/60 data-pressed:bg-primary data-pressed:text-primary-foreground"
            >
              {f.label}
            </Toggle>
          ))}
          {conPais && paises.length > 1 && (
            <label className="flex h-11 items-center gap-2 text-sm">
              <span className="text-muted-foreground">{tr('pais')}</span>
              <select value={pais} onChange={(e) => setPais(e.target.value)} className="h-11 rounded-lg border border-input bg-card px-3 text-sm">
                <option value="todos">{tr('todos')}</option>
                {paises.map((p) => <option key={p} value={p}>{paisNombre(p)}</option>)}
              </select>
            </label>
          )}
        </div>
      </details>

      <div className="mt-2 flex items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          {orden === ejePrecio
            ? tr('ayudaPrecioEje')
            : tr('ayudaTotal')}
        </p>
        <Button variant="link" className="h-11 shrink-0" onClick={() => setPesos(true)}>
          <SlidersHorizontal className="size-4" /> {tr('ajustarPesos')}
        </Button>
      </div>

      <Tabs value={vista} onValueChange={(v) => setVista(v as 'tier' | 'precio')} className="mt-3">
        <TabsList className="h-11 w-full">
          <TabsTrigger value="tier" className="h-full">{tr('tierList')}</TabsTrigger>
          <TabsTrigger value="precio" className="h-full">{tr('precioValor')}</TabsTrigger>
        </TabsList>

        <TabsContent value="tier" className="mt-2">
          {NIVELES.map((n) => {
            const zs = filas[n.id]
            return (
              <div key={n.id} className="mt-4">
                <h2 className="mb-2 flex items-center gap-2 text-base font-semibold tracking-tight">
                  <span
                    className="inline-flex min-h-8 min-w-8 items-center justify-center rounded-lg px-2 text-sm font-bold text-[#07090c]"
                    style={{ background: n.color }}
                  >
                    {typeof n.titulo === 'function' ? n.titulo() : n.titulo}
                  </span>
                  <span className="num text-sm font-normal text-muted-foreground">({zs.length})</span>
                </h2>
                {zs.length === 0 ? (
                  <p className="rounded-xl border border-dashed p-3 text-xs text-muted-foreground">{tr('nadaFila')}</p>
                ) : (
                  <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
                    {zs.map((z) => (
                      <li key={z.id}>
                        <Mosaico z={z} valor={valor(z)} orden={orden} color={n.color} faltan={faltanDatos(z, estado)} onAbrir={() => setFicha(z.id)} />
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )
          })}
        </TabsContent>

        <TabsContent value="precio" className="mt-2">
          <PrecioValor
            zs={filtrados} valorY={valorY} etiquetaY={etiquetaY} ideal={presupuesto.ideal} techo={presupuesto.techo}
            onAbrir={(id) => setFicha(id)}
          />
        </TabsContent>
      </Tabs>

      <p className="num mt-6 text-center text-sm text-muted-foreground" aria-live="polite">{contador}</p>

      <Drawer open={!!zFicha} onOpenChange={(o) => { if (!o) setFicha(null) }}>
        <DrawerContent>
          <div className="mx-auto max-h-[90dvh] w-full max-w-md overflow-y-auto p-3">
            <DrawerHeader className="sr-only">
              <DrawerTitle>{zFicha ? `${zFicha.marca} ${zFicha.modelo}` : tr('ficha')}</DrawerTitle>
              <DrawerDescription>{tr('fichaCompleta')}</DrawerDescription>
            </DrawerHeader>
            {zFicha && (
              <ItemCard
                z={zFicha} estado={estado}
                comparando={comparar.includes(zFicha.id)} onComparar={onComparar} onNota={onNota}
              />
            )}
          </div>
        </DrawerContent>
      </Drawer>

      <Drawer open={pesos} onOpenChange={setPesos}>
        <DrawerContent>
          <div className="mx-auto max-h-[85dvh] w-full max-w-2xl overflow-y-auto">
            <DrawerHeader>
              <DrawerTitle>{tr('pesosRanking')}</DrawerTitle>
              <DrawerDescription>{tr('descPesos')}</DrawerDescription>
            </DrawerHeader>
            <div className="grid gap-x-8 gap-y-4 px-4 pb-4 sm:grid-cols-2">
              {ejes.map(({ id, nombre }) => (
                <div key={id} className="flex items-center gap-3">
                  <span className="w-28 shrink-0 text-sm">{nombre}</span>
                  <div className="flex min-h-11 flex-1 items-center">
                    <Slider
                      min={0} max={5} step={1}
                      value={[estado.pesos[id] ?? 0]}
                      onValueChange={(v) => {
                        const x = Array.isArray(v) ? v[0] : v
                        parchar((e) => ({ pesos: { ...e.pesos, [id]: x } }))
                      }}
                      aria-label={tr('pesoDe', { eje: nombre })}
                    />
                  </div>
                  <span className="num w-4 text-right text-sm">{estado.pesos[id] ?? 0}</span>
                </div>
              ))}
            </div>
            <Separator />
            <div className="flex gap-2 p-4">
              <Button variant="ghost" className="h-11" onClick={() => parchar(() => ({ pesos: pesosIniciales() }))}>{tr('restablecerPesos')}</Button>
              <Button className="ml-auto h-11" onClick={() => setPesos(false)}>{tr('listo')}</Button>
            </div>
          </div>
        </DrawerContent>
      </Drawer>
    </section>
  )
}

function Mosaico({ z, valor, orden, color, faltan, onAbrir }: {
  z: Item; valor: number | null; orden: Orden; color: string; faltan: boolean; onAbrir: () => void
}) {
  const p = precioDe(z)
  const destacada = z.destacado ? insigniaDestacada() : undefined
  return (
    <button
      type="button"
      onClick={onAbrir}
      aria-label={tr('abrirFicha', { nombre: `${z.marca} ${z.modelo}` })}
      className={cn(
        'relative flex min-h-11 w-full flex-col gap-1 rounded-xl border bg-card p-1.5 text-left outline-none focus-visible:ring-2 focus-visible:ring-primary',
        z.destacado && 'glow-accent',
      )}
    >
      <span className="relative block">
        <ItemImage z={z} className="aspect-square w-full" />
        <span className="absolute top-1 left-1 flex flex-wrap items-center gap-1">
          {destacada && (
            <span className="glow-accent rounded-md bg-background/90 px-1 py-0.5 text-[9px] leading-none font-semibold text-primary">{destacada.nombre}</span>
          )}
          {faltan && (
            <span className="rounded-md bg-background/90 p-0.5 text-talvez" title={tr('faltanDatos')}>
              <AlertTriangle className="size-3" aria-hidden /><span className="sr-only">{tr('faltanDatos')}</span>
            </span>
          )}
        </span>
      </span>
      <span className="truncate text-[11px] leading-tight font-medium">{z.modelo}</span>
      <span className="num truncate text-[11px] leading-tight text-muted-foreground">{p != null ? fmtPrecio(p) : tr('sinPrecio')}</span>
      <span className="num text-xs leading-tight font-semibold" style={{ color }}>
        {valor == null ? tr('sinDato') : orden === 'total' ? fmtNum(valor, 2) : `${fmtEje(valor)}/5`}
      </span>
    </button>
  )
}

interface Punto { id: string; x: number; y: number; z: Item; pareto: boolean }

function PrecioValor({ zs, valorY, etiquetaY, ideal, techo, onAbrir }: {
  zs: Item[]; valorY: (z: Item) => number | null; etiquetaY: string; ideal: number; techo: number; onAbrir: (id: string) => void
}) {
  const puntos = useMemo<Punto[]>(() => {
    const base = zs
      .map((z) => ({ z, x: precioDe(z), y: valorY(z) }))
      .filter((p): p is { z: Item; x: number; y: number } => p.x != null && p.y != null)
    return base.map((p) => ({
      id: p.z.id, x: p.x, y: p.y, z: p.z,
      pareto: !base.some((o) => o !== p && o.x <= p.x && o.y >= p.y && (o.x < p.x || o.y > p.y)),
    }))
  }, [zs, valorY])

  const frontera = useMemo(() => puntos.filter((p) => p.pareto).sort((a, b) => a.x - b.x || a.y - b.y), [puntos])
  const escalon = useMemo(() => {
    const r: { x: number; y: number }[] = []
    frontera.forEach((p, i) => {
      if (i > 0) r.push({ x: p.x, y: frontera[i - 1].y })
      r.push({ x: p.x, y: p.y })
    })
    return r
  }, [frontera])

  // Dominio del eje X en pasos redondos que incluye el ideal y el techo
  const xs = puntos.map((p) => p.x)
  const minX = Math.min(...xs, ideal * 0.9)
  const maxX = Math.max(...xs, techo * 1.1)
  const paso = 10 ** Math.floor(Math.log10((maxX - minX) / 4 || 1))
  const dominio: [number, number] = [Math.max(0, Math.floor(minX / paso) * paso), Math.ceil(maxX / paso) * paso]
  const config: ChartConfig = { y: { label: etiquetaY, color: ACENTO } }
  const principal = segmentoPrincipal()

  if (puntos.length === 0) {
    return <p className="mt-4 rounded-xl border border-dashed p-4 text-sm text-muted-foreground">{tr('sinPrecioValor')}</p>
  }

  return (
    <div className="mt-2">
      <p className="mb-1 text-xs text-muted-foreground">
        {tr('ayudaGrafico', { disponible: textos().disponible, y: etiquetaY.toLowerCase() })}
      </p>
      <ChartContainer config={config} className="aspect-auto h-[360px] w-full" role="img" aria-label={tr('precioFrente', { y: etiquetaY.toLowerCase() })}>
        <ScatterChart margin={{ top: 16, right: 12, bottom: 4, left: -8 }}>
          <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.4} />
          <XAxis
            type="number" dataKey="x" name={tr('precio')} domain={dominio} tickCount={5}
            tickFormatter={fmtCorto} tickLine={false} axisLine={false} allowDataOverflow
          />
          <YAxis type="number" dataKey="y" name={etiquetaY} domain={[1, 5]} ticks={[1, 2, 3, 4, 5]} tickLine={false} axisLine={false} width={32} />
          <ReferenceLine x={ideal} stroke={GRIS} strokeWidth={1} strokeDasharray="4 4" label={{ value: tr('ideal'), position: 'insideTopRight', fill: GRIS, fontSize: 10 }} />
          <ReferenceLine x={techo} stroke={GRIS} strokeWidth={1} strokeDasharray="4 4" label={{ value: tr('techo'), position: 'insideTopLeft', fill: GRIS, fontSize: 10 }} />
          <ChartTooltip cursor={{ strokeDasharray: '3 3' }} content={<TooltipPunto etiquetaY={etiquetaY} />} />
          <Scatter
            data={escalon} isAnimationActive={false} legendType="none" tooltipType="none"
            line={{ stroke: ACENTO, strokeWidth: 2, className: 'frontera-glow' }} lineType="joint"
            shape={() => <g />}
          />
          <Scatter
            data={puntos} isAnimationActive={false}
            shape={(props: unknown) => <PuntoSvg {...(props as PuntoProps)} principal={principal} />}
            onClick={(d: unknown) => { const id = (d as { id?: string })?.id; if (id) onAbrir(id) }}
          />
        </ScatterChart>
      </ChartContainer>

      <h2 className="mt-4 mb-2 text-base font-semibold tracking-tight">{tr('mejorValor')} <span className="num text-sm font-normal text-muted-foreground">({frontera.length})</span></h2>
      <ul className="grid gap-2 sm:grid-cols-2">
        {frontera.map((p) => (
          <li key={p.id}>
            <button
              type="button" onClick={() => onAbrir(p.id)}
              aria-label={tr('abrirFicha', { nombre: `${p.z.marca} ${p.z.modelo}` })}
              className="flex min-h-11 w-full items-center gap-3 rounded-xl border bg-card p-2 text-left outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <ItemImage z={p.z} className="size-14 shrink-0" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-xs text-muted-foreground">{p.z.marca}</span>
                <span className="block truncate text-sm font-medium">{p.z.modelo}</span>
              </span>
              <span className="text-right">
                <span className="num block text-sm text-primary">{fmtPrecio(p.x)}</span>
                <span className="num block text-xs text-muted-foreground">{fmtNum(p.y, 2)}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

interface PuntoProps { cx?: number; cy?: number; payload?: Punto; principal: string }

function PuntoSvg({ cx, cy, payload, principal }: PuntoProps) {
  if (cx == null || cy == null || !payload) return null
  const { z, pareto } = payload
  const relleno = z.destacado || z.segmento === principal ? ACENTO : AZUL
  return (
    <g>
      <circle cx={cx} cy={cy} r={16} fill="transparent" />
      <circle
        cx={cx} cy={cy} r={pareto ? 9 : 6} fill={relleno} fillOpacity={0.9}
        stroke={z.alerta ? AMBAR : 'transparent'} strokeWidth={z.alerta ? 2.5 : 0}
      />
    </g>
  )
}

function TooltipPunto({ active, payload, etiquetaY }: { active?: boolean; payload?: ReadonlyArray<{ payload?: Punto }>; etiquetaY: string }) {
  const p = payload?.find((i) => i.payload?.z)?.payload
  if (!active || !p) return null
  return (
    <div className="flex items-center gap-2 rounded-lg border bg-popover p-2 text-xs shadow-lg">
      <ItemImage z={p.z} className="size-12 shrink-0" />
      <div>
        <p className="text-muted-foreground">{p.z.marca}</p>
        <p className="font-medium">{p.z.modelo}</p>
        <p className="num mt-0.5 text-primary">{fmtPrecio(p.x)}</p>
        <p className="num text-muted-foreground">{etiquetaY}: {fmtNum(p.y, 2)}</p>
      </div>
    </div>
  )
}
