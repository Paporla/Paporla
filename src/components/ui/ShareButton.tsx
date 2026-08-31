'use client'

import { useState } from 'react'
import { Share2, Link2, MessageCircle, Check } from 'lucide-react'

interface ShareButtonProps {
  title: string
  text: string
  url?: string
  variant?: 'icon' | 'button' | 'pill'
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

/**
 * Botón de compartir con Web Share API (nativo) y fallback manual.
 * En móvil: abre el menú nativo (WhatsApp, Telegram, Twitter...).
 * En desktop: WhatsApp Web + copiar enlace.
 */
export default function ShareButton({
  title,
  text,
  url,
  variant = 'button',
  size = 'md',
  className = '',
}: ShareButtonProps) {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const shareUrl = url ?? (typeof window !== 'undefined' ? window.location.href : '')
  const encodedText = encodeURIComponent(`${text} ${shareUrl}`)

  const handleClick = async () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title, text: `${text}\n\n${shareUrl}`, url: shareUrl })
      } catch {
        /* usuario canceló */
      }
      return
    }
    setOpen(!open)
  }

  const handleWhatsApp = () => window.open(`https://wa.me/?text=${encodedText}`, '_blank')

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      const input = document.createElement('input')
      input.value = shareUrl
      document.body.appendChild(input)
      input.select()
      document.execCommand('copy')
      document.body.removeChild(input)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const sizeMap = { sm: 'p-2 text-xs', md: 'px-4 py-2.5 text-sm', lg: 'px-6 py-3 text-base' }
  const variantMap = { icon: 'p-2 rounded-full', button: 'rounded-xl font-medium', pill: 'rounded-full font-medium' }

  return (
    <div className={`relative inline-block ${className}`}>
      {variant === 'icon' ? (
        <button
          onClick={handleClick}
          className="p-2 rounded-full hover:bg-white/10 transition-colors"
          aria-label="Compartir"
        >
          <Share2 className="w-5 h-5" />
        </button>
      ) : (
        <button
          onClick={handleClick}
          className={`${variantMap[variant]} ${sizeMap[size]} flex items-center gap-2 bg-primary text-black hover:bg-primary/90 transition-all shadow-lg shadow-primary/20`}
        >
          <Share2 className={size === 'sm' ? 'w-4 h-4' : 'w-5 h-5'} />
          <span>Compartir</span>
        </button>
      )}

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute bottom-full mb-2 right-0 z-50 w-56 p-2 rounded-xl bg-[#1a1a2e] border border-white/10 shadow-2xl backdrop-blur-xl">
            <button
              onClick={handleWhatsApp}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/5 transition-colors text-left"
            >
              <div className="w-9 h-9 rounded-full bg-[#25D366]/20 flex items-center justify-center flex-shrink-0">
                <MessageCircle className="w-5 h-5 text-[#25D366]" />
              </div>
              <div>
                <p className="text-sm text-white font-medium">WhatsApp</p>
                <p className="text-xs text-gray-500">Compartir por mensaje</p>
              </div>
            </button>
            <button
              onClick={handleCopyLink}
              aria-label="Copiar enlace"
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/5 transition-colors text-left"
            >
              <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                {copied ? <Check className="w-5 h-5 text-primary" /> : <Link2 className="w-5 h-5 text-primary" />}
              </div>
              <div>
                <p className="text-sm text-white font-medium">{copied ? '¡Copiado!' : 'Copiar enlace'}</p>
                <p className="text-xs text-gray-500">{copied ? 'Listo para pegar' : 'Comparte donde quieras'}</p>
              </div>
            </button>
          </div>
        </>
      )}
    </div>
  )
}
