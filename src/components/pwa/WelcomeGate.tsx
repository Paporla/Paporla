'use client'

/**
 * Pantalla de bienvenida de la app INSTALADA (PWA), paso 42.
 *
 * Regla de oro de la propuesta: el splash del sistema (Android/iOS) solo lleva
 * el verde #063926 y el icono; todo lo demás vive aquí, dentro de la app. Por
 * eso este fondo es el mismo #063926 del `background_color` del manifest: el
 * icono parece crecer desde el splash y luego esto lo recoge sin salto.
 *
 * Cuándo se ve: solo con la app instalada (display-mode standalone) y una vez
 * por sesión (sessionStorage). En el navegador normal no se pinta nunca, para
 * no ponerse delante de quien llega por un link.
 *
 * La barra es HONESTA: cada tramo corresponde a un hito real de carga
 * (pintado, hidratación, recursos, reposo), no a un teatro con temporizador.
 * La estancia mínima de 900 ms existe solo para que no haya parpadeo cuando
 * la carga es instantánea; se comenta aquí para que nadie la confunda con
 * adornos.
 */
import { useEffect, useState } from 'react'
import Image from 'next/image'
import { FRANJAS, MICROCOPY, franjaActual, type Franja } from '@/lib/franja'

const CLAVE_SESION = 'paporla:welcome:v1'
const MS_ROTACION = 2500
/** Tiempo mínimo en pantalla: el justo para leer el tagline (2,4 s). */
const MS_ESTANCIA_MINIMA = 2400
const MS_DESVANECIDO = 350

function appInstalada(): boolean {
  const standalone = window.matchMedia('(display-mode: standalone)').matches
  const ios = (navigator as { standalone?: boolean }).standalone === true
  return standalone || ios
}

function movimientoReducido(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export default function WelcomeGate() {
  const [visible, setVisible] = useState(false)
  const [saliendo, setSaliendo] = useState(false)
  const [progreso, setProgreso] = useState(15)
  const [indiceCopy, setIndiceCopy] = useState(0)
  const [franja, setFranja] = useState<Franja | null>(null)

  // Puerta de entrada: instalada y no vista en esta sesión.
  useEffect(() => {
    if (!appInstalada()) return
    try {
      if (sessionStorage.getItem(CLAVE_SESION)) return
    } catch {
      /* navegación privada sin storage: seguimos, no es motivo para romper */
    }
    /* eslint-disable react-hooks/set-state-in-effect -- puerta de entrada:
       standalone y sessionStorage solo pueden leerse tras montar; no hay
       forma de derivar esto en el render sin romper la hidratación. */
    setFranja(franjaActual(new Date()))
    setVisible(true)
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [])

  // Progreso honesto: 15 viene del estado inicial (el HTML ya está pintado),
  // 45 = este effect corre, o sea React hidrató; 70 = recursos completos;
  // 85 = el navegador tuvo un respiro tras montar; 100 = cierre.
  // El cierre espera DOS cosas: recursos realmente cargados y la estancia
  // mínima de lectura. Con carga lenta la pantalla acompaña; con carga
  // rápida se va en cuanto se pudo leer el tagline.
  useEffect(() => {
    if (!visible) return
    const subir = (v: number) => setProgreso((p) => Math.max(p, v))
    subir(45)
    let recursosListos = document.readyState === 'complete'
    const alCargar = () => {
      recursosListos = true
      subir(70)
    }
    if (recursosListos) subir(70)
    else window.addEventListener('load', alCargar)
    const tRespiro = window.setTimeout(() => subir(85), 120)
    const inicio = Date.now()
    const tCierre = window.setInterval(() => {
      if (!recursosListos || Date.now() - inicio < MS_ESTANCIA_MINIMA) return
      window.clearInterval(tCierre)
      subir(100)
      window.setTimeout(() => setSaliendo(true), 120)
      window.setTimeout(() => {
        setVisible(false)
        try {
          sessionStorage.setItem(CLAVE_SESION, '1')
        } catch {
          /* idem arriba */
        }
      }, 120 + MS_DESVANECIDO)
    }, 100)
    return () => {
      window.removeEventListener('load', alCargar)
      window.clearTimeout(tRespiro)
      window.clearInterval(tCierre)
    }
  }, [visible])

  // Microcopy rotativo, salvo con movimiento reducido: ahí, texto quieto.
  useEffect(() => {
    if (!visible || movimientoReducido()) return
    const t = window.setInterval(() => {
      setIndiceCopy((i) => (i + 1) % MICROCOPY.length)
    }, MS_ROTACION)
    return () => window.clearInterval(t)
  }, [visible])

  if (!visible || !franja) return null

  return (
    <div
      className={`welcome-overlay${saliendo ? ' welcome-overlay--saliendo' : ''}`}
      role="status"
      aria-label={`Bienvenida de Paporla, franja de ${FRANJAS[franja].chip.toLowerCase()}`}
    >
      {franja === 'noche' && (
        <span className="welcome-estrellas" aria-hidden="true">
          <i className="welcome-star s1" />
          <i className="welcome-star s2" />
          <i className="welcome-star s3" />
          <i className="welcome-star s4" />
        </span>
      )}
      <Image src="/images/mascot-384.png" alt="" width={384} height={366} priority className="welcome-mascot" />
      <p className="welcome-wordmark" aria-hidden="true">
        {'Pa’ porla...'}
      </p>
      <div className="welcome-chips" aria-hidden="true">
        {(Object.keys(FRANJAS) as Franja[]).map((f) => (
          <span key={f} className={`welcome-chip${f === franja ? ' welcome-chip--activa' : ''}`}>
            {FRANJAS[f].chip}
          </span>
        ))}
      </div>
      <p className="welcome-tagline">{FRANJAS[franja].tagline}</p>
      <p className="welcome-microcopy" aria-hidden="true">
        {MICROCOPY[indiceCopy]}
      </p>
      <div
        className="welcome-barra"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={progreso}
        aria-label="Cargando la app"
      >
        <div className="welcome-barra-relleno" style={{ width: `${progreso}%` }} />
      </div>
    </div>
  )
}
