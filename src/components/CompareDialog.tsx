import { PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart } from 'recharts'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ChartContainer, ChartTooltip, type ChartConfig } from '@/components/ui/chart'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { cfg, textos, valorFicha } from '@/lib/config'
import { fmtAtributo, fmtNum, fmtPrecio } from '@/lib/format'
import { t as tr } from '@/lib/i18n'
import { ejesDe, puntaje, sinDato } from '@/lib/scoring'
import { cn } from '@/lib/utils'
import type { Estado, Item } from '@/lib/types'

const COLORES = ['#00F0C8', '#7C9CFF', '#FF7AE0']

interface Props {
  items: Item[]
  estado: Estado
  abierto: boolean
  onCerrar: () => void
}

export function CompareDialog({ items, estado, abierto, onCerrar }: Props) {
  const ejes = cfg().ejes
  const config: ChartConfig = Object.fromEntries(
    items.map((z, i) => [`s${i}`, { label: `${z.marca} ${z.modelo}`, color: COLORES[i] }]),
  )
  const data = ejes.map(({ id, nombre }) => {
    const fila: Record<string, string | number | null> = { eje: nombre }
    items.forEach((z, i) => {
      const v = ejesDe(z, estado)[id] ?? null
      fila[`s${i}`] = v ?? 0
      fila[`raw${i}`] = v
    })
    return fila
  })

  // Filas de la tabla: valor mostrado, valor numérico para resaltar y sentido (mayor/menor es mejor).
  type Fila = { nombre: string; celdas: { texto: string; valor: number | null }[]; mejor?: 'max' | 'min' }
  const filas: Fila[] = [
    { nombre: tr('precioFinal'), mejor: 'min', celdas: items.map((z) => ({ texto: fmtPrecio(z.mejor_oferta?.precio_final), valor: z.mejor_oferta?.precio_final ?? null })) },
    { nombre: tr('tienda'), celdas: items.map((z) => ({ texto: z.mejor_oferta?.tienda ?? tr('sinDato'), valor: null })) },
    { nombre: textos().variante, celdas: items.map((z) => ({ texto: z.mejor_oferta?.variante ?? z.variante ?? tr('sinDato'), valor: null })) },
    ...(cfg().atributos_ficha ?? []).map((a): Fila => ({
      nombre: a.nombre,
      mejor: a.mejor,
      celdas: items.map((z) => {
        const v = valorFicha(z, a)
        return { texto: fmtAtributo(z, a), valor: typeof v === 'number' ? v : null }
      }),
    })),
    ...ejes.map(({ id, nombre }): Fila => ({
      nombre,
      mejor: 'max',
      celdas: items.map((z) => {
        const v = ejesDe(z, estado)[id] ?? null
        return { texto: v == null ? tr('sinDato') : `${fmtNum(v, Number.isInteger(v) ? 0 : 1)}/5`, valor: v }
      }),
    })),
    { nombre: tr('puntaje'), mejor: 'max', celdas: items.map((z) => { const p = puntaje(z, estado); return { texto: fmtNum(p, 2), valor: p } }) },
    { nombre: tr('beneficios'), celdas: items.map((z) => ({ texto: z.beneficios.slice(0, 3).join(' · ') || tr('sinDato'), valor: null })) },
    { nombre: tr('contras'), celdas: items.map((z) => ({ texto: z.contras.slice(0, 2).join(' · ') || tr('sinDato'), valor: null })) },
  ]

  return (
    <Dialog open={abierto} onOpenChange={(o) => { if (!o) onCerrar() }}>
      <DialogContent className="max-h-[92dvh] w-[calc(100vw-1rem)] max-w-3xl overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{tr('compararN', { n: items.length, items: textos().items })}</DialogTitle>
          <DialogDescription>{tr('descRadar')}</DialogDescription>
        </DialogHeader>

        <ChartContainer config={config} className="mx-auto aspect-square w-full max-w-md">
          <RadarChart data={data} outerRadius="62%" margin={{ top: 8, right: 24, bottom: 8, left: 24 }}>
            <PolarGrid stroke="#1F2A33" />
            <PolarAngleAxis dataKey="eje" tick={{ fill: '#8B98A5', fontSize: 11 }} />
            <PolarRadiusAxis domain={[0, 5]} tickCount={6} tick={false} axisLine={false} />
            <ChartTooltip
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null
                const fila = payload[0].payload as Record<string, number | null>
                return (
                  <div className="rounded-lg border bg-popover p-2 text-xs shadow-none">
                    <p className="mb-1 font-medium">{label}</p>
                    {items.map((z, i) => (
                      <p key={z.id} className="flex items-center gap-2">
                        <span className="size-2 rounded-full" style={{ background: COLORES[i] }} />
                        <span className="text-muted-foreground">{z.modelo}</span>
                        <span className="num ml-auto">{fila[`raw${i}`] == null ? 'sin dato' : fila[`raw${i}`]}</span>
                      </p>
                    ))}
                  </div>
                )
              }}
            />
            {items.map((z, i) => (
              <Radar key={z.id} name={`${z.marca} ${z.modelo}`} dataKey={`s${i}`} stroke={COLORES[i]} fill={COLORES[i]} fillOpacity={0.14} strokeWidth={2} isAnimationActive={false} dot={{ r: 3, fillOpacity: 1 }} />
            ))}
          </RadarChart>
        </ChartContainer>

        <ul className="space-y-1 text-sm">
          {items.map((z, i) => {
            const falta = sinDato(z, estado)
            return (
              <li key={z.id} className="flex items-start gap-2">
                <span className="mt-1.5 size-3 shrink-0 rounded-full" style={{ background: COLORES[i] }} />
                <span>
                  {z.marca} {z.modelo}
                  {falta.length > 0 && <span className="text-muted-foreground"> · {tr('sinDatoEn', { ejes: falta.join(', ').toLowerCase() })}</span>}
                </span>
              </li>
            )
          })}
        </ul>

        <div className="overflow-x-auto rounded-xl border">
          <Table className="text-xs">
            <TableHeader>
              <TableRow>
                <TableHead className="w-24 min-w-24">&nbsp;</TableHead>
                {items.map((z, i) => (
                  <TableHead key={z.id} className="min-w-32 whitespace-normal" style={{ color: COLORES[i] }}>{z.marca} {z.modelo}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filas.map((f) => {
                const vals = f.celdas.map((c) => c.valor).filter((v): v is number => v != null)
                const objetivo = f.mejor && vals.length > 1 ? (f.mejor === 'max' ? Math.max(...vals) : Math.min(...vals)) : null
                return (
                  <TableRow key={f.nombre}>
                    <TableCell className="font-medium text-muted-foreground">{f.nombre}</TableCell>
                    {f.celdas.map((c, i) => (
                      <TableCell key={i} className={cn('whitespace-normal align-top', f.mejor && 'num', objetivo != null && c.valor === objetivo && 'bg-primary/10 font-semibold text-primary')}>
                        {c.texto}
                      </TableCell>
                    ))}
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  )
}
