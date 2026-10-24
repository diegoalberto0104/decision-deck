import { useState } from 'react'
import { urlImagen } from '@/lib/data'
import { cn } from '@/lib/utils'
import type { Item } from '@/lib/types'

/** Imagen sobre una ficha clara (las fotos de producto suelen traer fondo blanco: no se recortan). */
export function ItemImage({ z, className, imgClassName }: { z: Item; className?: string; imgClassName?: string }) {
  const [rota, setRota] = useState(false)
  const src = urlImagen(z.imagen)
  return (
    <div className={cn('flex items-center justify-center overflow-hidden rounded-xl bg-[#f4f6f8]', className)}>
      {src && !rota ? (
        <img
          src={src}
          alt={`${z.marca} ${z.modelo}`}
          draggable={false}
          loading="lazy"
          onError={() => setRota(true)}
          className={cn('pointer-events-none h-full w-full object-contain p-2 select-none', imgClassName)}
        />
      ) : (
        <div className="flex flex-col items-center gap-1 px-4 text-center text-[#07090c]">
          <span className="text-xl font-semibold tracking-tight">{z.marca}</span>
          <span className="text-xs opacity-60">sin imagen</span>
        </div>
      )}
    </div>
  )
}
