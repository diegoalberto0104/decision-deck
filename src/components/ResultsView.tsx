import { useMemo, useState, type ReactNode } from 'react'
import { toast } from 'sonner'
import { ChevronDown, Copy, GitCompareArrows, RotateCcw, Store, Swords, Trophy } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { ItemCard } from '@/components/ItemCard'
import { CompareDialog } from '@/components/CompareDialog'
import { Recommendation } from '@/components/Recommendation'
import { Footer } from '@/components/Footer'
import { RankingView } from '@/components/RankingView'
import { TiendasView } from '@/components/TiendasView'
import { cfg, nombreSegmento, pesosIniciales, segmentoPrincipal, textos } from '@/lib/config'
import { fmtPrecio } from '@/lib/format'
import { t as tr } from '@/lib/i18n'
import { puntaje, rankear } from '@/lib/scoring'
import type { Datos, Estado, Item } from '@/lib/types'

interface Props {
  datos: Datos
  estado: Estado
  parchar: (fn: (e: Estado) => Partial<Estado>) => void
}

export function ResultsView({ datos, estado, parchar }: Props) {
  const [comparar, setComparar] = useState<string[]>([])
  const [dialogo, setDialogo] = useState(false)
  const [verTiendas, setVerTiendas] = useState(false)
  const [verRanking, setVerRanking] = useState(false)
  const porId = useMemo(() => new Map(datos.items.map((z) => [z.id, z])), [datos])
  const t = textos()
  const { presupuesto, segmentos } = cfg()

  const conVoto = (v: string) => datos.items.filter((z) => estado.votos[z.id] === v)
  const siTodos = conVoto('si')
  const tab = estado.tab
  const enTab = (z: Item) => z.segmento === tab

  const si = rankear(siTodos.filter(enTab), estado)
  const talVez = rankear(conVoto('tal_vez').filter(enTab), estado)
  const sobreTope = rankear(datos.items.filter((z) => enTab(z) && z.franja === 'sobre_tope' && !estado.votos[z.id]), estado)
    .sort((a, b) => (a.mejor_oferta?.precio_final ?? 0) - (b.mejor_oferta?.precio_final ?? 0))
  const noDisponibles = datos.items.filter((z) => enTab(z) && z.franja === 'no_disponible' && !estado.votos[z.id])

  const totalSi = siTodos.length
  const contar = (s: string) => datos.items.filter((z) => z.segmento === s && ['si', 'tal_vez'].includes(estado.votos[z.id])).length

  const alternarComparar = (id: string) =>
    setComparar((c) => {
      if (c.includes(id)) return c.filter((x) => x !== id)
      if (c.length >= 3) { toast.warning(tr('maxComparar')); return c }
      return [...c, id]
    })
  const zComparar = comparar.map((id) => porId.get(id)).filter((z): z is Item => !!z)

  const pasarASi = (id: string) => parchar((e) => ({ votos: { ...e.votos, [id]: 'si' } }))
  const fijarNota = (eje: string, id: string, v: number) =>
    parchar((e) => ({ propias: { ...e.propias, [eje]: { ...e.propias[eje], [id]: v } } }))
  const fijarPeso = (k: string, v: number) => parchar((e) => ({ pesos: { ...e.pesos, [k]: v } }))

  const tarjeta = (z: Item, extra?: { accion?: { etiqueta: string; onClick: () => void }; ranking?: boolean }) => (
    <ItemCard
      key={z.id} z={z} estado={estado}
      puntaje={z.mejor_oferta && extra?.ranking !== false ? puntaje(z, estado) : undefined}
      comparando={comparar.includes(z.id)} onComparar={alternarComparar} onNota={fijarNota} accion={extra?.accion}
    />
  )

  const copiarLista = async () => {
    const linea = (z: Item) =>
      `- ${z.marca} ${z.modelo} (${nombreSegmento(z.segmento)}): ${fmtPrecio(z.mejor_oferta?.precio_final)} en ${z.mejor_oferta?.tienda ?? tr('sinOfertaCorta')}${z.mejor_oferta ? ' ' + z.mejor_oferta.url : ''}`
    const bloque = (titulo: string, zs: Item[]) => (zs.length ? `${titulo}\n${zs.map(linea).join('\n')}\n` : '')
    const orden = (zs: Item[]) => rankear(zs, estado)
    const texto =
      `${tr('miLista', { categoria: cfg().categoria, fecha: datos.datos_verificados ?? datos.generado })}\n\n` +
      bloque(tr('siMayus'), orden(siTodos)) + '\n' + bloque(tr('talVezMayus'), orden(conVoto('tal_vez')))
    try {
      await navigator.clipboard.writeText(texto)
    } catch {
      const ta = document.createElement('textarea')
      ta.value = texto
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      ta.remove()
    }
    toast.success(tr('listaCopiada'))
  }

  const volverADeslizar = () => {
    if (!window.confirm(tr('confirmarBorrar'))) return
    parchar(() => ({ votos: {}, orden: [], ronda: segmentoPrincipal(), paso: 'deslizar' }))
  }

  const abrirTiendas = () => { setVerTiendas(true); window.scrollTo(0, 0) }
  if (verTiendas) return <TiendasView datos={datos} onVolver={() => { setVerTiendas(false); window.scrollTo(0, 0) }} />

  return (
    <div className="mx-auto w-full max-w-5xl px-4 pt-4 pb-24">
      <header className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-xs text-primary">{cfg().titulo ?? cfg().categoria}</p>
          <h1 className="text-xl font-semibold tracking-tight">{tr('tusResultados')}</h1>
          <p className="text-xs text-muted-foreground">
            {tr('enSiTalVez', { si: totalSi, talVez: conVoto('tal_vez').length })}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" className="h-11" onClick={() => parchar(() => ({ paso: 'deslizar' }))}>
            <Swords className="size-4" /> {tr('seguirDeslizando')}
          </Button>
          <Button variant="outline" className="h-11" onClick={copiarLista}><Copy className="size-4" /> {tr('copiarLista')}</Button>
          <Button variant="ghost" className="h-11" onClick={volverADeslizar}><RotateCcw className="size-4" /> {tr('volverDeslizar')}</Button>
        </div>
      </header>

      <nav aria-label={tr('vistas')} className="mb-4 grid grid-cols-3 gap-1 rounded-lg bg-muted p-[3px]">
        <Button variant={verRanking ? "ghost" : "default"} className="h-11" aria-current={verRanking ? undefined : "page"} onClick={() => setVerRanking(false)}>{tr('resultados')}</Button>
        <Button variant={verRanking ? "default" : "ghost"} className="h-11" aria-current={verRanking ? "page" : undefined} onClick={() => { setVerRanking(true); window.scrollTo(0, 0) }}><Trophy className="size-4" /> {tr('ranking')}</Button>
        <Button variant="ghost" className="h-11" onClick={abrirTiendas}><Store className="size-4" /> {tr('tiendas')}</Button>
      </nav>

      {verRanking ? (
        <RankingView datos={datos} estado={estado} parchar={parchar} comparar={comparar} onComparar={alternarComparar} onNota={fijarNota} />
      ) : (<>

      {totalSi < 2 && (
        <p className="mb-4 rounded-xl border border-talvez/40 bg-talvez/10 p-3 text-sm">
          {tr('pocosSi')}
        </p>
      )}

      <Recommendation si={siTodos} estado={estado} />

      {segmentos.length > 1 && (
        <Tabs value={tab} onValueChange={(v) => parchar(() => ({ tab: v as string }))} className="mt-6">
          <TabsList className="h-11 w-full">
            {segmentos.map((s) => (
              <TabsTrigger key={s.id} value={s.id} className="h-full">{s.nombre} · <span className="num">{contar(s.id)}</span></TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      )}

      <Pesos estado={estado} onPeso={fijarPeso} onReset={() => parchar(() => ({ pesos: pesosIniciales() }))} />

      <Grupo titulo={tr('si')} color="text-si" zs={si} vacio={tr('nadaSi')}>{(z) => tarjeta(z)}</Grupo>
      <Grupo titulo={tr('talVez')} color="text-talvez" zs={talVez} vacio={tr('nadaTalVez')}>{(z) => tarjeta(z)}</Grupo>

      <Plegable
        titulo={tr('candidatosSobreTecho')}
        nota={tr('notaSobreTecho', { disponible: t.disponible, techo: fmtPrecio(presupuesto.techo) })}
        n={sobreTope.length}
      >
        {sobreTope.map((z) => tarjeta(z, { accion: { etiqueta: tr('pasarASi'), onClick: () => pasarASi(z.id) } }))}
      </Plegable>

      <Plegable
        titulo={tr('noDisponibles')}
        nota={tr('notaNoDisponibles', { disponible: t.disponible })}
        n={noDisponibles.length}
      >
        {noDisponibles.map((z) => (
          <div key={z.id} className="flex flex-col gap-2">
            {tarjeta(z, { ranking: false })}
            {z.motivo && <p className="rounded-lg bg-surface-2 p-3 text-xs text-muted-foreground">{z.motivo}</p>}
          </div>
        ))}
      </Plegable>

      </>)}

      <Footer datos={datos} onTiendas={abrirTiendas} />

      {comparar.length > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/90 p-3 backdrop-blur" style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}>
          <div className="mx-auto flex max-w-5xl items-center gap-2">
            <p className="num flex-1 text-sm">{tr('seleccionados', { n: comparar.length })}</p>
            <Button variant="ghost" className="h-11" onClick={() => setComparar([])}>{tr('limpiar')}</Button>
            <Button className="h-11 glow-accent" disabled={comparar.length < 2} onClick={() => setDialogo(true)}>
              <GitCompareArrows className="size-4" /> {tr('comparar')}
            </Button>
          </div>
        </div>
      )}
      <CompareDialog items={zComparar} estado={estado} abierto={dialogo && zComparar.length > 1} onCerrar={() => setDialogo(false)} />
    </div>
  )
}

function Grupo({ titulo, color, zs, vacio, children }: { titulo: string; color: string; zs: Item[]; vacio: string; children: (z: Item) => ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className={`mb-3 text-lg font-semibold tracking-tight ${color}`}>{titulo} <span className="num text-sm text-muted-foreground">({zs.length})</span></h2>
      {zs.length === 0 ? (
        <p className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">{vacio}</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{zs.map(children)}</div>
      )}
    </section>
  )
}

function Plegable({ titulo, nota, n, children }: { titulo: string; nota: string; n: number; children: ReactNode }) {
  return (
    <details className="group mt-8 rounded-xl border bg-card">
      <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-2 p-3">
        <span>
          <span className="font-semibold tracking-tight">{titulo}</span> <span className="num text-sm text-muted-foreground">({n})</span>
        </span>
        <ChevronDown className="size-4 transition-transform group-open:rotate-180" />
      </summary>
      <div className="p-3 pt-0">
        <p className="mb-3 text-xs text-muted-foreground">{nota}</p>
        {n === 0 ? (
          <p className="text-sm text-muted-foreground">{tr('nadaPestana')}</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{children}</div>
        )}
      </div>
    </details>
  )
}

function Pesos({ estado, onPeso, onReset }: { estado: Estado; onPeso: (k: string, v: number) => void; onReset: () => void }) {
  return (
    <details className="group mt-4 rounded-xl border bg-card">
      <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-2 p-3">
        <span className="font-semibold tracking-tight">{tr('pesosRanking')}</span>
        <ChevronDown className="size-4 transition-transform group-open:rotate-180" />
      </summary>
      <div className="p-3 pt-0">
        <p className="mb-3 text-xs text-muted-foreground">{tr('ayudaPesos')}</p>
        <div className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
          {cfg().ejes.map(({ id, nombre }) => (
            <div key={id} className="flex items-center gap-3">
              <span className="w-28 shrink-0 text-sm">{nombre}</span>
              <div className="flex min-h-11 flex-1 items-center">
                <Slider
                  min={0} max={5} step={1}
                  value={[estado.pesos[id] ?? 0]}
                  onValueChange={(v) => onPeso(id, Array.isArray(v) ? v[0] : v)}
                  aria-label={tr('pesoDe', { eje: nombre })}
                />
              </div>
              <span className="num w-4 text-right text-sm">{estado.pesos[id] ?? 0}</span>
            </div>
          ))}
        </div>
        <Separator className="my-3" />
        <Button variant="ghost" className="h-11" onClick={onReset}>{tr('restablecerPesos')}</Button>
      </div>
    </details>
  )
}
