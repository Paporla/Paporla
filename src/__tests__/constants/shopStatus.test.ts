import { describe, it, expect } from 'vitest'
import {
  SHOP_STATUSES,
  SHOP_MODERATION_ACTIONS,
  SHOP_STATUS_CONFIG,
  getShopStatusConfig,
  MODERATION_VERB,
} from '@/lib/constants/shopStatus'

describe('shopStatus (estados canónicos, 0003:158)', () => {
  it('los 6 estados son exactamente los de la restricción shops_status_check', () => {
    expect(SHOP_STATUSES).toEqual(['draft', 'pending_review', 'verified', 'rejected', 'suspended', 'closed'])
  })

  it('las acciones de moderación son exactamente las que acepta admin_review_shop (0009:1383)', () => {
    expect(SHOP_MODERATION_ACTIONS).toEqual(['verified', 'rejected', 'suspended'])
  })

  it('cada estado tiene etiqueta y clase de estilo', () => {
    for (const status of SHOP_STATUSES) {
      expect(SHOP_STATUS_CONFIG[status].label).toBeTruthy()
      expect(SHOP_STATUS_CONFIG[status].className).toBeTruthy()
    }
    expect(SHOP_STATUS_CONFIG.verified.label).toBe('Verificado')
    expect(SHOP_STATUS_CONFIG.pending_review.label).toBe('Pendiente de revisión')
    expect(SHOP_STATUS_CONFIG.suspended.label).toBe('Suspendido')
  })

  it('un estado desconocido se muestra tal cual, en gris (no inventar, F2b)', () => {
    expect(getShopStatusConfig('cuasi-eliminado')).toEqual({
      label: 'cuasi-eliminado',
      className: 'bg-gray-500/20 text-gray-400',
    })
  })

  it('MODERATION_VERB traduce cada acción para los toasts', () => {
    expect(MODERATION_VERB).toEqual({ verified: 'verificado', rejected: 'rechazado', suspended: 'suspendido' })
  })
})
