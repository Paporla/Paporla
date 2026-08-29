import { describe, it, expect } from 'vitest'
import { escapeHtml } from '@/lib/email/escape'

describe('escapeHtml (emails)', () => {
  it('escapa los 5 caracteres peligrosos de HTML', () => {
    expect(escapeHtml('&<>"\'')).toBe('&amp;&lt;&gt;&quot;&#39;')
  })

  it('no toca texto normal (acentos, espacios, numeros, signos de moneda)', () => {
    expect(escapeHtml('Panadería Staging A 123 $3.990')).toBe('Panadería Staging A 123 $3.990')
  })

  it('una sola pasada: el & de un texto real queda &amp; (y nada mas)', () => {
    // Si se escapara dos veces, esto seria 'Tom &amp;amp; Jerry'
    expect(escapeHtml('Tom & Jerry')).toBe('Tom &amp; Jerry')
  })

  it('vacio sigue siendo vacio', () => {
    expect(escapeHtml('')).toBe('')
  })
})
