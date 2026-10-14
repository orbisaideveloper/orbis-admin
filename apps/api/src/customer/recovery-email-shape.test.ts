import { describe, expect, it, vi } from 'vitest'
import { createCustomerRecovery } from './recovery'

const origin = 'https://aqcwhqdzniruvoqwfsij.supabase.co'
const redirectTo = 'https://khata.example/'
describe('bounded recovery email validation', () => {
  it.each(['bad', 'a@@b.co', '@b.co', 'a@', 'a b@c.co', 'a@b c.co', 'a@.co', 'a@co.', 'a@co'])('rejects malformed email %s before contacting Auth', async email => {
    const fetchImpl = vi.fn()
    const recovery = createCustomerRecovery({ enabled: true, origin, publicKey: 'public', serviceKey: 'test-only', fetchImpl })
    await expect(recovery.recover({ email, redirectTo }, ['https://khata.example'])).rejects.toMatchObject({ code: 'CUSTOMER_INPUT_INVALID' })
    expect(fetchImpl).not.toHaveBeenCalled()
  })
  it.each(['A@B.CO', 'a@b..co', 'a@.b.co'])('preserves the existing email acceptance contract for %s', async email => {
    const fetchImpl = vi.fn().mockResolvedValue(Response.json({}))
    const recovery = createCustomerRecovery({ enabled: true, origin, publicKey: 'public', serviceKey: 'test-only', fetchImpl })
    await expect(recovery.recover({ email, redirectTo }, ['https://khata.example'])).resolves.toEqual({ accepted: true })
    expect(JSON.parse(fetchImpl.mock.calls[0][1].body)).toEqual({ email: email.toLowerCase() })
  })
})
