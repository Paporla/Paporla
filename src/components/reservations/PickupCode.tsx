'use client'

import { useState } from 'react'
import Button from '@/components/ui/Button'
import Toast from '@/components/ui/Toast'

interface PickupCodeProps {
  code: string
}

export default function PickupCode({ code }: PickupCodeProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('Error copying code:', error)
    }
  }

  return (
    <div className="bg-primary/10 border border-primary/30 rounded-lg p-3 inline-block">
      <p className="text-xs text-gray-400">Código de recogida</p>
      <div className="flex items-center gap-2">
        <p className="text-xl font-bold text-primary tracking-wider font-mono">
          {code}
        </p>
        <Button variant="outline" size="sm" onClick={handleCopy}>
          {copied ? '✓' : '📋'}
        </Button>
      </div>
      {copied && (
        <Toast message="Código copiado" type="success" onClose={() => setCopied(false)} />
      )}
    </div>
  )
}