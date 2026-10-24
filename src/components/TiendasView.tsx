import { useState, type FormEvent } from 'react'
import { ArrowLeft, ExternalLink, Send, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Footer } from '@/components/Footer'
import { cfg, textos } from '@/lib/config'
import { paisNombre } from '@/lib/format'
import { t } from '@/lib/i18n'
import type { Datos, EstadoTienda, Tienda } from '@/lib/types'

const claveSug = () => `decision-deck:tiendas-sugeridas:${cfg().categoria.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`

interface Sugerida { id: string; nombre: string; comentario: string }

const ESTADOS: Record<EstadoTienda, { etiqueta: () => string; clase: string }> = {
  revisada: { etiqueta: () => t('estRevisada'), clase: 'border-[#00F0C8]/50 bg-[#00F0C8]/10 text-[#00F0C8]' },
  bloqueada: { etiqueta: () => t('estBloqueada'), clase: 'border-[#FF4D6D]/50 bg-[#FF4D6D]/10 text-[#FF4D6D]' },
  pendiente: { etiqueta: () => t('estPendiente'), clase: 'border-[#FFC857]/50 bg-[#FFC857]/10 text-[#FFC857]' },
  sin_resultados: { etiqueta: () => t('estSinResultados'), clase: 'border-muted-foreground/40 bg-muted text-muted-foreground' },
}

const TIPOS: Record<string, () => string> = { oficial: () => t('tipoOficial'), multimarca: () => t('tipoMultimarca'), marketplace: () => t('tipoMarketplace'), otro: () => t('tipoOtro') }

function leerSugeridas(): Sugerida[] {
  try {
    const p = JSON.parse(localStorage.getItem(claveSug()) ?? '[]')
    return Array.isArray(p) ? p : []
  } catch { return [] }
}

const esUrl = (t: string) => /^(https?:\/\/|www\.)|\.[a-z]{2,}(\/|$)/i.test(t.trim())

function issueUrl(s: Sugerida) {
  const repo = cfg().repo_issues
  if (!repo) return null
  const cuerpo = `${s.nombre}${s.comentario ? `\n\n${s.comentario}` : ''}`
  return `${repo}?title=${encodeURIComponent(t('tiendaSugerida', { nombre: s.nombre }))}&body=${encodeURIComponent(cuerpo)}&labels=${encodeURIComponent('tienda-sugerida')}`
}

export function TiendasView({ datos, onVolver }: { datos: Datos; onVolver: () => void }) {
  const [sugeridas, setSugeridas] = useState<Sugerida[]>(leerSugeridas)
  const [nombre, setNombre] = useState('')
  const [comentario, setComentario] = useState('')
  const [error, setError] = useState('')

  const guardar = (lista: Sugerida[]) => {
    setSugeridas(lista)
    try { localStorage.setItem(claveSug(), JSON.stringify(lista)) } catch { /* sin almacenamiento */ }
  }

  const valida = (): Sugerida | null => {
    const n = nombre.trim()
    if (!n) { setError(t('escribeTienda')); return null }
    setError('')
    return { id: String(Date.now()), nombre: n, comentario: comentario.trim() }
  }

  const alGuardar = (e: FormEvent) => {
    e.preventDefault()
    const s = valida()
    if (!s) return
    guardar([...sugeridas, s])
    setNombre(''); setComentario('')
  }

  // Enviar también deja la sugerencia guardada en la lista
  const alEnviar = () => {
    const s = valida()
    if (!s) return
    guardar([...sugeridas, s])
    setNombre(''); setComentario('')
    const url = issueUrl(s)
    if (url) window.open(url, '_blank', 'noopener,noreferrer')
  }

  const portales = datos.tiendas ?? []
  const cuenta = (est: EstadoTienda[]) => portales.filter((p) => est.includes(p.estado)).length
  const revisadas = cuenta(['revisada'])
  const bloqueadas = cuenta(['bloqueada'])
  const pendientes = cuenta(['pendiente', 'sin_resultados']) + sugeridas.length

  const codigos = [...new Set(portales.map((p) => p.pais).filter((p) => p && p !== 'otro'))].sort()
  const grupos = [
    ...codigos.map((c) => ({ codigo: c, nombre: paisNombre(c), lista: portales.filter((x) => x.pais === c) })),
    { codigo: 'otro', nombre: t('otros'), lista: portales.filter((x) => !x.pais || x.pais === 'otro') },
  ].filter((g) => g.lista.length > 0)
  const conIssues = !!cfg().repo_issues

  const inputCls = 'min-h-11 w-full rounded-lg border bg-surface-2 px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50'

  return (
    <div className="mx-auto w-full max-w-5xl px-4 pt-4 pb-24">
      <header className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">{t('dondeSeBusco')}</h1>
          <p className="mt-1 text-sm text-muted-foreground" aria-live="polite">
            {t('resumenTiendas', { revisadas, bloqueadas, pendientes })}
          </p>
        </div>
        <Button variant="outline" className="h-11" onClick={onVolver}><ArrowLeft className="size-4" /> {t('volverResultados')}</Button>
      </header>

      {grupos.map((g) => (
        <section key={g.codigo} className="mt-6" aria-labelledby={`pais-${g.codigo}`}>
          <h2 id={`pais-${g.codigo}`} className="mb-3 text-lg font-semibold tracking-tight">
            {g.nombre} <span className="num text-sm text-muted-foreground">({g.lista.length})</span>
          </h2>
          <ul className="grid gap-3 sm:grid-cols-2">
            {g.lista.map((p) => <FilaPortal key={p.id} p={p} />)}
          </ul>
        </section>
      ))}

      <section className="mt-8" aria-labelledby="sugeridas">
        <h2 id="sugeridas" className="mb-3 text-lg font-semibold tracking-tight">
          {t('sugeridasPorTi')} <span className="num text-sm text-muted-foreground">({sugeridas.length})</span>
        </h2>
        {sugeridas.length > 0 && (
          <ul className="mb-4 grid gap-3 sm:grid-cols-2">
            {sugeridas.map((s) => (
              <li key={s.id} className="rounded-xl border bg-card p-3 [overflow-wrap:anywhere]">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium">
                      {esUrl(s.nombre)
                        ? <a href={/^https?:\/\//i.test(s.nombre) ? s.nombre : `https://${s.nombre}`} target="_blank" rel="noopener noreferrer" className="underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-ring">{s.nombre}</a>
                        : s.nombre}
                    </p>
                    <span className="mt-1 inline-block rounded-full border border-[#FFC857]/50 bg-[#FFC857]/10 px-2 py-0.5 text-xs text-[#FFC857]">{t('sugeridaPorRevisar')}</span>
                    {s.comentario && <p className="mt-2 text-xs text-muted-foreground">{s.comentario}</p>}
                  </div>
                  <Button variant="ghost" className="size-11 shrink-0 p-0" aria-label={t('quitar', { nombre: s.nombre })} onClick={() => guardar(sugeridas.filter((x) => x.id !== s.id))}>
                    <X className="size-4" />
                  </Button>
                </div>
                {conIssues && (
                  <a href={issueUrl(s)!} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex min-h-11 items-center gap-1 text-sm text-primary underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-ring">
                    <Send className="size-4" /> {t('enviarRevision')}
                  </a>
                )}
              </li>
            ))}
          </ul>
        )}

        <form onSubmit={alGuardar} noValidate className="rounded-xl border bg-card p-4">
          <h3 className="font-semibold tracking-tight">{t('sugerirTienda')}</h3>
          <p className="mt-1 mb-3 text-xs text-muted-foreground">{t('ayudaSugerir', { disponible: textos().disponible })}</p>
          <div className="grid gap-3">
            <div>
              <label htmlFor="sug-nombre" className="mb-1 block text-sm">{t('nombreTienda')}</label>
              <input
                id="sug-nombre" type="text" className={inputCls} value={nombre} autoComplete="off"
                onChange={(e) => { setNombre(e.target.value); if (error) setError('') }}
                aria-invalid={!!error} aria-describedby={error ? 'sug-error' : undefined}
              />
              {error && <p id="sug-error" role="alert" className="mt-1 text-xs text-no">{error}</p>}
            </div>
            <div>
              <label htmlFor="sug-comentario" className="mb-1 block text-sm">{t('comentario')}</label>
              <textarea id="sug-comentario" rows={2} className={`${inputCls} py-2`} value={comentario} onChange={(e) => setComentario(e.target.value)} />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="submit" className="h-11">{t('guardarSugerencia')}</Button>
              {conIssues && (
                <Button type="button" variant="outline" className="h-11" onClick={alEnviar}>
                  <Send className="size-4" /> {t('enviarRevision')}
                </Button>
              )}
            </div>
          </div>
        </form>
      </section>

      <Footer datos={datos} />
    </div>
  )
}

function FilaPortal({ p }: { p: Tienda }) {
  const est = ESTADOS[p.estado] ?? ESTADOS.pendiente
  return (
    <li className="rounded-xl border bg-card p-3 [overflow-wrap:anywhere]">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <a href={p.url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-1 font-medium underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-ring">
          {p.nombre} <ExternalLink className="size-3.5 shrink-0" aria-hidden />
          <span className="sr-only">{t('pestanaNueva')}</span>
        </a>
        <span className={`mt-2 rounded-full border px-2 py-0.5 text-xs ${est.clase}`}>{est.etiqueta()}</span>
      </div>
      <p className="text-xs text-muted-foreground">{TIPOS[p.tipo]?.() ?? p.tipo}</p>
      <p className="mt-2 text-sm">
        <span className="num">{p.ofertas}</span> {p.ofertas === 1 ? t('oferta') : t('ofertas')} · <span className="num text-primary">{p.ofertas_disponibles}</span> {textos().disponible}
      </p>
      {p.nota && <p className="mt-1 text-xs text-muted-foreground">{p.nota}</p>}
    </li>
  )
}
