import { describe, it, expect } from 'vitest'
import { parseExpr } from './expr-parser'

describe('parseExpr — cas valides', () => {
  it('"5+3" → 8', () => {
    const r = parseExpr('5+3')
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.value).toBe(8)
  })

  it('"2*(3+4)" → 14', () => {
    const r = parseExpr('2*(3+4)')
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.value).toBe(14)
  })

  it('"10-3+5" → 12', () => {
    const r = parseExpr('10-3+5')
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.value).toBe(12)
  })

  it('"1.5+2.5" → 4', () => {
    const r = parseExpr('1.5+2.5')
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.value).toBe(4)
  })

  it('"  5 +  3  " → 8 (espaces ignorés)', () => {
    const r = parseExpr('  5 +  3  ')
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.value).toBe(8)
  })

  it('"5/2" → 2.5', () => {
    const r = parseExpr('5/2')
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.value).toBe(2.5)
  })

  it('"(2+3)*4" → 20', () => {
    const r = parseExpr('(2+3)*4')
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.value).toBe(20)
  })

  it('"100" → 100 (nombre seul)', () => {
    const r = parseExpr('100')
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.value).toBe(100)
  })

  it('"3.14" → 3.14 (décimal seul)', () => {
    const r = parseExpr('3.14')
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.value).toBeCloseTo(3.14)
  })

  it('"-5+8" → 3 (moins unaire en tête)', () => {
    const r = parseExpr('-5+8')
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.value).toBe(3)
  })
})

describe('parseExpr — cas invalides', () => {
  it('"5+" → invalide (opérateur sans opérande droit)', () => {
    expect(parseExpr('5+').ok).toBe(false)
  })

  it('"(5+3" → invalide (parenthèse non fermée)', () => {
    expect(parseExpr('(5+3').ok).toBe(false)
  })

  it('"5++3" → invalide (double opérateur)', () => {
    expect(parseExpr('5++3').ok).toBe(false)
  })

  it('"" → invalide (chaîne vide)', () => {
    expect(parseExpr('').ok).toBe(false)
  })

  it('"   " → invalide (espaces seuls)', () => {
    expect(parseExpr('   ').ok).toBe(false)
  })

  it('"abc" → invalide (lettres)', () => {
    expect(parseExpr('abc').ok).toBe(false)
  })

  it('"5+)" → invalide (parenthèse orpheline)', () => {
    expect(parseExpr('5+)').ok).toBe(false)
  })
})
