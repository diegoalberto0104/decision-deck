import { useCallback, useEffect, useMemo, useRef } from 'react'
import { animate, motion, useMotionValue, useTransform } from 'motion/react'
import { ArrowLeft, ArrowRight, ArrowDown, Undo2, X, Check, HelpCircle, ChevronsRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { ItemImage } from '@/components/ItemImage'
import { cfg, insigniaDestacada, nombreSegmento, segmentoPrincipal, textos } from '@/lib/config'
import { ordenRonda } from '@/lib/scoring'
import { fmtPrecio } from '@/lib/format'
import { t as tr } from '@/lib/i18n'
import type { Datos, Estado, Item, Voto } from '@/lib/types'

const UMBRAL = 110

interface Props {
  datos: Datos
  estado: Estado
  parchar: (fn: (e: Estado) => Partial<Estado>) => void
}

export function SwipeDeck({ datos, estado, parchar }: Props) {
  // Al mazo entra todo: lo que se pasa del techo o no está disponible va al final con su etiqueta
  const mazos = useMemo(
    () => Object.fromEntries(cfg().segmentos.map((s) => [s.id, datos.items.filter((z) => z.segmento === s.id).sort(ordenRonda)])),
    [datos],
  )
  const porId = useMemo(() => new Map(datos.items.map((z) => [z.id, z])), [datos])
  const t = textos()

  const mazo = mazos[estado.ronda] ?? []
  const pendientes = mazo.filter((z) => !estado.votos[z.id])
  const hechos = mazo.length - pendientes.length
  const actual = pendientes[0]
  const siguiente = pendientes[1]

  // Votos que llegan mientras la carta anterior aún sale: se aplican a las siguientes
  const cola = useRef<Voto[]>([])
  const votar = useCallback(
    (id: string, v: Voto) => parchar((e) => ({ votos: { ...e.votos, [id]: v }, orden: [...e.orden, id] })),
    [parchar],
  )
  const deshacer = useCallback(() => {
    cola.current = []
    parchar((e) => {
      const id = e.orden[e.orden.length - 1]
      if (!id) return {}
      const votos = { ...e.votos }
      delete votos[id]
      const z = porId.get(id)
      return { votos, orden: e.orden.slice(0, -1), ronda: z?.segmento ?? e.ronda }
    })
  }, [parchar, porId])
  const irAResultados = () => parchar(() => ({ paso: 'resultados' }))

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-4 pt-3 pb-4">
      <header className="flex flex-col gap-3">
        <p className="truncate text-xs text-primary">{cfg().titulo ?? cfg().categoria}</p>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-baseline gap-2">
            <h1 className="text-base font-semibold tracking-tight">{tr('ronda', { segmento: nombreSegmento(estado.ronda) })}</h1>
            <span className="num text-sm text-muted-foreground">{Math.min(hechos + 1, mazo.length)}/{mazo.length}</span>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" className="h-11 min-w-11 px-3" onClick={deshacer} disabled={estado.orden.length === 0} aria-label={tr('deshacerUltimo')}>
              <Undo2 className="size-4" /> <span className="hidden min-[420px]:inline">{tr('deshacer')}</span>
            </Button>
            <Button variant="outline" className="h-11 px-3" onClick={irAResultados}>
              {tr('resultados')} <ChevronsRight className="size-4" />
            </Button>
          </div>
        </div>
        <Progress value={mazo.length ? (hechos / mazo.length) * 100 : 0} aria-label={tr('avanceRonda')} />
        <p className="text-xs text-muted-foreground">
          {estado.ronda === segmentoPrincipal()
            ? tr('ayudaPrincipal', { disponible: t.disponible })
            : tr('ayudaOpcional', { segmento: nombreSegmento(estado.ronda), disponible: t.disponible })}
        </p>
      </header>

      {actual ? (
        <>
          <div className="relative mt-3 mb-20 flex-1" style={{ minHeight: 380 }}>
            {siguiente && (
              <div className="absolute inset-0 scale-[0.95] opacity-60" aria-hidden>
                <CartaVista z={siguiente} />
              </div>
            )}
            <CartaArrastrable key={actual.id} z={actual} cola={cola} onVote={(v) => votar(actual.id, v)} />
          </div>
          <p className="mb-2 hidden text-center text-xs text-muted-foreground sm:block">
            {tr('teclado')} <kbd className="num">←</kbd> {tr('no')} · <kbd className="num">↓</kbd> {tr('talVez')} · <kbd className="num">→</kbd> {tr('si')}
          </p>
        </>
      ) : (
        <FinRonda
          ronda={estado.ronda}
          total={mazo.length}
          onRonda={(ronda) => parchar(() => ({ ronda }))}
          onResultados={irAResultados}
          onDeshacer={deshacer}
          puedeDeshacer={estado.orden.length > 0}
          estado={estado}
          mazos={mazos}
        />
      )}
    </div>
  )
}

function FinRonda({ ronda, total, onRonda, onResultados, onDeshacer, puedeDeshacer, estado, mazos }: {
  ronda: string; total: number; onRonda: (id: string) => void; onResultados: () => void
  onDeshacer: () => void; puedeDeshacer: boolean; estado: Estado; mazos: Record<string, Item[]>
}) {
  const cuenta = (v: Voto) => (mazos[ronda] ?? []).filter((z) => estado.votos[z.id] === v).length
  // La siguiente ronda con pendientes, en el orden de la config
  const otra = cfg().segmentos.find((s) => s.id !== ronda && (mazos[s.id] ?? []).some((z) => !estado.votos[z.id]))
  return (
    <div className="my-6 flex flex-1 flex-col items-center justify-center gap-5 rounded-xl border bg-card p-6 text-center">
      <h2 className="text-xl font-semibold tracking-tight">
        {total === 0 ? tr('sinItemsRonda', { items: textos().items, segmento: nombreSegmento(ronda) }) : tr('finRonda', { segmento: nombreSegmento(ronda) })}
      </h2>
      {total > 0 && (
        <p className="num text-sm text-muted-foreground">
          {tr('conteoVotos', { si: cuenta('si'), talVez: cuenta('tal_vez'), no: cuenta('no') })}
        </p>
      )}
      <div className="flex w-full flex-col gap-2">
        {otra && (
          <Button variant="outline" className="h-12" onClick={() => onRonda(otra.id)}>{tr('seguirCon', { segmento: otra.nombre })}</Button>
        )}
        <Button className="h-12 glow-accent" onClick={onResultados}>
          {otra ? tr('saltarResultados') : tr('verResultados')}
        </Button>
        {puedeDeshacer && (
          <Button variant="ghost" className="h-11" onClick={onDeshacer}><Undo2 className="size-4" /> {tr('deshacerUltimo')}</Button>
        )}
      </div>
    </div>
  )
}

function CartaVista({ z }: { z: Item }) {
  const techo = cfg().presupuesto.techo
  const destacada = z.destacado ? insigniaDestacada() : undefined
  return (
    <div className="flex h-full flex-col gap-3 rounded-xl border bg-card p-3">
      <ItemImage z={z} className="min-h-0 flex-1" />
      <div className="flex flex-col gap-1 px-1 pb-1">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm text-muted-foreground">{z.marca}</span>
          {destacada && <Badge className="glow-accent border-primary/60 bg-primary/15 text-primary">{destacada.nombre}</Badge>}
        </div>
        <h2 className="text-2xl leading-tight font-semibold tracking-tight">{z.modelo}</h2>
        <div className="flex flex-wrap items-center gap-2">
          {z.mejor_oferta && <p className="num text-sm text-muted-foreground">{fmtPrecio(z.mejor_oferta.precio_final)}</p>}
          {z.franja === 'sobre_tope' && z.mejor_oferta && (
            <Badge variant="outline" className="num border-no/60 text-no">{tr('sobreTecho', { monto: fmtPrecio((z.mejor_oferta.precio_final ?? techo) - techo) })}</Badge>
          )}
          {z.franja === 'no_disponible' && <Badge variant="outline" className="border-talvez/60 text-talvez">{tr('noDisponibleHoy', { disponible: textos().disponible })}</Badge>}
          {z.franja === 'descartado' && <Badge variant="outline" className="border-no/60 text-no" title={z.motivo}>{tr('descartado')}</Badge>}
        </div>
      </div>
    </div>
  )
}

function CartaArrastrable({ z, cola, onVote }: { z: Item; cola: React.RefObject<Voto[]>; onVote: (v: Voto) => void }) {
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const rotate = useTransform(x, [-220, 0, 220], [-9, 0, 9])
  const opSi = useTransform(x, [20, 120], [0, 1])
  const opNo = useTransform(x, [-120, -20], [1, 0])
  const opTal = useTransform(y, [20, 120], [0, 1])
  const opacidad = useTransform(y, [0, 260], [1, 0.2])
  const ocupado = useRef(false)

  const lanzar = useCallback(
    (v: Voto) => {
      if (ocupado.current) {
        cola.current.push(v)
        return
      }
      ocupado.current = true
      const duration = cola.current.length ? 0.12 : 0.22
      const destino = v === 'tal_vez' ? animate(y, 320, { duration }) : animate(x, v === 'si' ? 520 : -520, { duration })
      // Respaldo por tiempo: el voto no depende de que la animación termine (pestaña en segundo plano, equipo lento)
      let hecho = false
      const cerrar = () => {
        if (hecho) return
        hecho = true
        onVote(v)
      }
      destino.then(cerrar)
      setTimeout(cerrar, duration * 1000 + 150)
    },
    [onVote, x, y, cola],
  )

  useEffect(() => {
    if (ocupado.current) return
    const v = cola.current.shift()
    if (v) lanzar(v)
  }, [lanzar, cola])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLElement && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return
      if (document.querySelector('[role="dialog"]')) return
      if (e.key === 'ArrowRight') lanzar('si')
      else if (e.key === 'ArrowLeft') lanzar('no')
      else if (e.key === 'ArrowDown') { e.preventDefault(); lanzar('tal_vez') }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [lanzar])

  return (
    <>
      <motion.div
        className="absolute inset-0 cursor-grab active:cursor-grabbing"
        style={{ x, y, rotate, opacity: opacidad }}
        drag="x"
        dragElastic={0.85}
        dragMomentum={false}
        onDragEnd={(_, info) => {
          if (info.offset.x > UMBRAL || info.velocity.x > 600) lanzar('si')
          else if (info.offset.x < -UMBRAL || info.velocity.x < -600) lanzar('no')
          else animate(x, 0, { type: 'spring', stiffness: 420, damping: 32 })
        }}
        role="group"
        aria-label={`${z.marca} ${z.modelo}`}
      >
        <CartaVista z={z} />
        <motion.div style={{ opacity: opSi }} className="pointer-events-none absolute top-5 left-5 -rotate-12 rounded-lg border-2 border-si bg-background/70 px-3 py-1 text-2xl font-bold text-si">{tr('siMayus')}</motion.div>
        <motion.div style={{ opacity: opNo }} className="pointer-events-none absolute top-5 right-5 rotate-12 rounded-lg border-2 border-no bg-background/70 px-3 py-1 text-2xl font-bold text-no">{tr('noMayus')}</motion.div>
        <motion.div style={{ opacity: opTal }} className="pointer-events-none absolute top-5 left-1/2 -translate-x-1/2 rounded-lg border-2 border-talvez bg-background/70 px-3 py-1 text-2xl font-bold whitespace-nowrap text-talvez">{tr('talVezMayus')}</motion.div>
      </motion.div>
      <div className="absolute inset-x-0 -bottom-[72px] grid grid-cols-3 gap-2">
        <Button variant="outline" className="h-12 border-no/60 text-no hover:bg-no/10 hover:text-no" onClick={() => lanzar('no')}>
          <X className="size-5" /> {tr('no')} <ArrowLeft className="hidden size-3 opacity-60 sm:block" />
        </Button>
        <Button variant="outline" className="h-12 border-talvez/60 text-talvez hover:bg-talvez/10 hover:text-talvez" onClick={() => lanzar('tal_vez')}>
          <HelpCircle className="size-5" /> {tr('talVez')} <ArrowDown className="hidden size-3 opacity-60 sm:block" />
        </Button>
        <Button className="h-12 glow-accent" onClick={() => lanzar('si')}>
          <Check className="size-5" /> {tr('si')} <ArrowRight className="hidden size-3 opacity-60 sm:block" />
        </Button>
      </div>
    </>
  )
}
