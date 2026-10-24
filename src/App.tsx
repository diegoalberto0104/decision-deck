import { useEffect, useState } from 'react'
import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { SwipeDeck } from '@/components/SwipeDeck'
import { ResultsView } from '@/components/ResultsView'
import { useEstado } from '@/hooks/useEstado'
import { usarConfig } from '@/lib/config'
import { cargarDatos } from '@/lib/data'
import { t } from '@/lib/i18n'
import type { Datos } from '@/lib/types'

export default function App() {
  const [datos, setDatos] = useState<Datos | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    cargarDatos()
      .then((d) => {
        usarConfig(d.config)
        document.title = d.config.titulo ?? d.config.categoria
        document.documentElement.lang = (d.config.idioma ?? 'es').split('-')[0]
        setDatos(d)
      })
      .catch((e: Error) => setError(e.message))
  }, [])

  return (
    <TooltipProvider>
      <main>
        {error && <p className="p-6 text-no">{t('errorDatos', { error })} <code className="num">npm run data</code>.</p>}
        {!error && !datos && <p className="p-6 text-muted-foreground">{t('cargando')}</p>}
        {datos && <Decision datos={datos} />}
      </main>
      <Toaster position="top-center" />
    </TooltipProvider>
  )
}

function Decision({ datos }: { datos: Datos }) {
  const { estado, parchar } = useEstado()
  useEffect(() => { window.scrollTo(0, 0) }, [estado.paso])
  return estado.paso === 'deslizar'
    ? <SwipeDeck datos={datos} estado={estado} parchar={parchar} />
    : <ResultsView datos={datos} estado={estado} parchar={parchar} />
}
