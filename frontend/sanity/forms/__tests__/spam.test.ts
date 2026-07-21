import {describe, it, expect} from 'vitest'
import {isHoneypotTriggered, timeToSubmitMs, isTooFast} from '../spam'

describe('isHoneypotTriggered', () => {
  it('is false for an empty honeypot', () => {
    expect(isHoneypotTriggered('')).toBe(false)
    expect(isHoneypotTriggered(null)).toBe(false)
    expect(isHoneypotTriggered('   ')).toBe(false)
  })
  it('is true when a bot filled the honeypot', () => {
    expect(isHoneypotTriggered('http://spam.example')).toBe(true)
  })
})

describe('timing', () => {
  it('computes elapsed ms', () => {
    expect(timeToSubmitMs(1000, 4000)).toBe(3000)
  })
  it('flags submissions under the threshold', () => {
    expect(isTooFast(1000, 1500)).toBe(true) // 500ms elapsed
  })
  it('accepts submissions over the threshold', () => {
    expect(isTooFast(1000, 3000)).toBe(false) // 2000ms elapsed
  })
  it('treats a missing/NaN renderedAt as too fast (fail closed)', () => {
    expect(isTooFast(Number.NaN, 3000)).toBe(true)
  })
})
