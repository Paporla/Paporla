'use client'

import { Heart } from 'lucide-react'
import { motion } from 'framer-motion'
import { useAuth } from '@/hooks/useAuth'
import { useFavorites } from '@/hooks/useFavorites'
import { useRouter } from 'next/navigation'
import { useToast } from '@/components/ui/ToastProvider'
import { useEffect, useRef, useState } from 'react'

interface FavoriteButtonProps {
  shopId: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
  showAnimation?: boolean
}

export default function FavoriteButton({
  shopId,
  size = 'md',
  className = '',
  showAnimation = true,
}: FavoriteButtonProps) {
  const { user } = useAuth()
  const router = useRouter()
  const { isFavorite, toggleFavorite } = useFavorites()
  // Lote UX punto 4: el aviso viaja al ToastProvider global. Dos mejoras de
  // paso: (1) el provider vive en la raíz, así que el mensaje SOBREVIVE al
  // salto a /login (antes el toast moría con este componente a los 1,5 s);
  // (2) ya no hay temporizador propio de 2 s duplicando el del provider.
  const { addToast } = useToast()
  const [isAnimating, setIsAnimating] = useState(false)

  /*
   * Los dos temporizadores de handleClick se apuntan aqui para poder
   * cancelarlos si el boton desaparece de pantalla antes de que salten.
   *
   * Por que hace falta, con un ejemplo de cada uno:
   *
   *   - El de 300 ms llama a setIsAnimating. Si el componente ya no esta,
   *     React intenta actualizar algo que no existe. En el CI reventaba con
   *     "ReferenceError: window is not defined" porque saltaba DESPUES de que
   *     Vitest desmontara el entorno del fichero de test, y hacia fallar la
   *     corrida entera sin que el test tuviera culpa ninguna.
   *
   *   - El de 1500 ms es peor: empuja a /login. Si alguien pulsa el corazon
   *     sin sesion y en ese segundo y medio se va a otra pagina, acababa en el
   *     login sin haberlo pedido. Eso no es un problema de tests: lo sufre una
   *     persona.
   */
  const temporizadores = useRef<ReturnType<typeof setTimeout>[]>([])

  useEffect(() => {
    // Se guarda la referencia: la limpieza se ejecuta al desmontar y tiene que
    // mirar el MISMO array, no el que haya en ese momento.
    const pendientes = temporizadores.current
    return () => {
      pendientes.forEach(clearTimeout)
      pendientes.length = 0
    }
  }, [])

  /** Arranca un temporizador que se cancela solo si el boton se desmonta. */
  const temporizar = (accion: () => void, ms: number) => {
    const id = setTimeout(() => {
      const i = temporizadores.current.indexOf(id)
      if (i !== -1) temporizadores.current.splice(i, 1)
      accion()
    }, ms)
    temporizadores.current.push(id)
  }

  const isFav = isFavorite(shopId)

  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
  }

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  }

  const handleClick = async (e: React.MouseEvent) => {
    e.stopPropagation()

    if (!user) {
      // 'info', no 'success': no es un logro, es un aviso de que falta sesión.
      addToast('Inicia sesión para guardar favoritos', 'info')
      /*
        L-29: al login con la dirección de vuelta. `useAuth.signIn` ya sabe leer
        `?redirect=` y lo pasa por `getSafeInternalRedirect` (solo admite rutas
        internas que empiezan por una sola barra), así que al iniciar sesión la
        persona aterriza en la ficha del comercio que quería guardar, no en su
        panel. El favorito NO se guarda solo: hace falta un segundo toque en el
        corazón. El retardo de 1,5 s es para que dé tiempo a leer el aviso.
      */
      const volver = `${window.location.pathname}${window.location.search}`
      const params = new URLSearchParams({ redirect: volver })
      temporizar(() => router.push(`/login?${params.toString()}`), 1500)
      return
    }

    setIsAnimating(true)
    const success = await toggleFavorite(shopId)

    if (success) {
      addToast(isFav ? 'Eliminado de favoritos' : 'Comercio guardado en favoritos', 'success')
    }

    temporizar(() => setIsAnimating(false), 300)
  }

  return (
    <motion.button
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
      animate={
        isAnimating && showAnimation
          ? {
              scale: [1, 1.3, 1],
              transition: { duration: 0.3 },
            }
          : {}
      }
      onClick={handleClick}
      className={`${sizeClasses[size]} rounded-full flex items-center justify-center transition-all ${
        isFav ? 'bg-red-500/20 hover:bg-red-500/30' : 'bg-black/60 backdrop-blur-sm hover:bg-black/80'
      } ${className}`}
    >
      <Heart
        className={`${iconSizes[size]} transition-all ${
          isFav ? 'fill-red-500 text-red-500' : 'text-gray-400 hover:text-red-400'
        }`}
      />
    </motion.button>
  )
}
