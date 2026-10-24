import { cfg } from '@/lib/config'
import { fmtFecha, fmtPrecio } from '@/lib/format'
import { t } from '@/lib/i18n'
import type { Datos } from '@/lib/types'

export function Footer({ datos, onTiendas }: { datos: Datos; onTiendas?: () => void }) {
  const { presupuesto, aclaraciones = [] } = cfg()
  const bloqueadas = datos.tiendas.filter((t) => t.estado === 'bloqueada').map((t) => t.nombre)
  return (
    <footer className="mt-10 [overflow-wrap:anywhere] space-y-4 border-t pt-6 text-xs text-muted-foreground">
      <p>
        {t('pieFechas', { verificado: fmtFecha(datos.datos_verificados), generado: fmtFecha(datos.generado), ideal: fmtPrecio(presupuesto.ideal), techo: fmtPrecio(presupuesto.techo) })}
      </p>
      {aclaraciones.map((a) => <p key={a}>{a}</p>)}
      {bloqueadas.length > 0 && (
        <p><strong className="text-foreground">{t('bloquearon')}</strong> {bloqueadas.join(', ')}.</p>
      )}
      {onTiendas && (
        <p>
          <button type="button" onClick={onTiendas} className="min-h-11 text-sm text-primary underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-ring">
            {t('verTiendas')}
          </button>
        </p>
      )}
      <p>{t('hechoCon')}</p>
    </footer>
  )
}
