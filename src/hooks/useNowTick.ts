'use client'

import { useEffect, useState } from 'react'

/**
 * "Ahora" con refresco periódico para etiquetas que miran el reloj
 * (L-02: estado efectivo de una reserva según su ventana de recogida).
 * Se calcula fuera del render inicial vía estado: el componente sigue
 * siendo puro respecto de sus props.
 */
export function useNowTick(intervalMs = 30_000): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs)
    return () => clearInterval(id)
  }, [intervalMs])
  return now
}
