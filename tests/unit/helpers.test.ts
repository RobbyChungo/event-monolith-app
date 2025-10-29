import { describe, it, expect } from 'vitest'
import { suggestTopics } from '../../src/services/aiSuggester.service'
import { sendEmail } from '../../src/services/email.service'

describe('helpers', () => {
  it('suggestTopics returns an array', async () => {
    const res = await suggestTopics('conference about testing')
    expect(Array.isArray(res)).toBe(true)
  })

  it('sendEmail returns true', async () => {
    const ok = await sendEmail('test@example.com', 'hi', '<p>body</p>')
    expect(ok).toBe(true)
  })
})
