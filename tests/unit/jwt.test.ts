import { describe, it, expect } from 'vitest'
import { signJwt, verifyJwt } from '../../src/utils/jwt.utils'

describe('jwt.utils', () => {
  it('signs and verifies payloads', () => {
    const token = signJwt({ userId: 123, role: 'ATTENDEE' })
    expect(typeof token).toBe('string')
    const payload = verifyJwt<{ userId: number; role: string }>(token)
    expect(payload).toBeTruthy()
    expect(payload?.userId).toBe(123)
  })

  it('returns null for invalid token', () => {
    const p = verifyJwt('not-a-token')
    expect(p).toBeNull()
  })
})
