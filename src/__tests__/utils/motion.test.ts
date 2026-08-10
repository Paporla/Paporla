import { describe, it, expect } from 'vitest'
import { pageVariants, fadeInUp, staggerContainer, scaleOnHover } from '@/lib/utils/motion'

describe('pageVariants', () => {
  it('has initial state with opacity 0', () => {
    expect(pageVariants.initial).toEqual({ opacity: 0 })
  })

  it('has animate state with full opacity and transition duration', () => {
    const animate = pageVariants.animate as Record<string, unknown>
    expect(animate.opacity).toBe(1)
    expect(animate.transition).toEqual({ duration: 0.2 })
  })

  it('has exit state with opacity 0 and transition duration', () => {
    const exit = pageVariants.exit as Record<string, unknown>
    expect(exit.opacity).toBe(0)
    expect(exit.transition).toEqual({ duration: 0.15 })
  })
})

describe('fadeInUp', () => {
  it('has initial state with opacity 0 and y 20', () => {
    expect(fadeInUp.initial).toEqual({ opacity: 0, y: 20 })
  })

  it('has animate state with opacity 1, y 0 and duration 0.4', () => {
    const animate = fadeInUp.animate as Record<string, unknown>
    expect(animate.opacity).toBe(1)
    expect(animate.y).toBe(0)
    expect(animate.transition).toEqual({ duration: 0.4 })
  })
})

describe('staggerContainer', () => {
  it('has empty initial state', () => {
    expect(staggerContainer.initial).toEqual({})
  })

  it('has animate state with staggerChildren and delayChildren', () => {
    const animate = staggerContainer.animate as Record<string, unknown>
    expect(animate.transition).toEqual({
      staggerChildren: 0.05,
      delayChildren: 0.1,
    })
  })
})

describe('scaleOnHover', () => {
  it('scales up on hover', () => {
    expect(scaleOnHover.whileHover).toEqual({ scale: 1.02 })
  })

  it('scales down on tap', () => {
    expect(scaleOnHover.whileTap).toEqual({ scale: 0.98 })
  })
})
