/**
 * Mini-parser d'expressions mathématiques (descente récursive).
 * Supporte : + - * / parenthèses, entiers et décimaux, espaces ignorés.
 * N'utilise pas eval() ni new Function().
 *
 * Grammaire :
 *   expression = term (('+' | '-') term)*
 *   term       = factor (('*' | '/') factor)*
 *   factor     = number | '(' expression ')' | '-' factor
 *   number     = [0-9]+ ('.' [0-9]+)?
 */

export type ParseResult = { ok: true; value: number } | { ok: false }

export function parseExpr(input: string): ParseResult {
  const src = input.replace(/\s+/g, '')
  if (src === '') return { ok: false }

  let pos = 0

  function parseExpression(): number {
    let left = parseTerm()
    while (pos < src.length && (src[pos] === '+' || src[pos] === '-')) {
      const op = src[pos++]
      const right = parseTerm()
      left = op === '+' ? left + right : left - right
    }
    return left
  }

  function parseTerm(): number {
    let left = parseFactor()
    while (pos < src.length && (src[pos] === '*' || src[pos] === '/')) {
      const op = src[pos++]
      const right = parseFactor()
      left = op === '*' ? left * right : left / right
    }
    return left
  }

  function parseFactor(): number {
    if (src[pos] === '(') {
      pos++ // consomme '('
      const val = parseExpression()
      if (src[pos] !== ')') throw new Error('Parenthèse fermante attendue')
      pos++ // consomme ')'
      return val
    }
    if (src[pos] === '-') {
      pos++ // moins unaire
      return -parseFactor()
    }
    return parseNumber()
  }

  function parseNumber(): number {
    const start = pos
    while (pos < src.length && src[pos] >= '0' && src[pos] <= '9') pos++
    if (pos < src.length && src[pos] === '.') {
      pos++
      while (pos < src.length && src[pos] >= '0' && src[pos] <= '9') pos++
    }
    if (pos === start) throw new Error('Nombre attendu')
    const val = parseFloat(src.slice(start, pos))
    if (isNaN(val)) throw new Error('Nombre invalide')
    return val
  }

  try {
    const result = parseExpression()
    if (pos !== src.length) return { ok: false } // caractères restants
    if (isNaN(result) || !isFinite(result)) return { ok: false }
    return { ok: true, value: result }
  } catch {
    return { ok: false }
  }
}
