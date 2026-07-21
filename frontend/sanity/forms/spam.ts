export function isHoneypotTriggered(value: unknown): boolean {
  return typeof value === 'string' && value.trim().length > 0
}

export function timeToSubmitMs(renderedAt: number, now: number): number {
  return now - renderedAt
}

export function isTooFast(renderedAt: number, now: number, minMs = 1500): boolean {
  const elapsed = timeToSubmitMs(renderedAt, now)
  // Fail closed: a missing/NaN timestamp is treated as suspicious.
  if (Number.isNaN(elapsed)) return true
  return elapsed < minMs
}
