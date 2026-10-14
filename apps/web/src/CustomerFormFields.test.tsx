import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { CustomerProfile } from './CustomerProfile'

const customer = { orbisIdentityId: '11111111-1111-7111-8111-111111111111', displayId: 'ORB-U-23456789' }
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks() })
it('treats a missing optional profile form field as empty text', async () => {
  const data = { version: 'orbis.customer.profile.v1', customer, profile: { name: 'Name', address: null, alternatePhone: null, dateOfBirth: null, gender: null }, contact: { email: null, phone: null } }
  const fetcher = vi.fn().mockImplementation(async () => Response.json(data))
  vi.stubGlobal('fetch', fetcher)
  const client = { snapshot: () => ({ customer, accessToken: 'access', refreshToken: 'refresh', expiresAt: 100000 }), restore: vi.fn(), authenticate: vi.fn(), accessToken: vi.fn().mockResolvedValue('access'), logout: vi.fn() }
  render(<CustomerProfile client={client} customer={customer} />)
  const address = await screen.findByLabelText('ঠিকানা')
  await waitFor(() => expect(screen.getByRole('button', { name: 'প্রোফাইল সংরক্ষণ করুন' })).not.toBeDisabled())
  address.remove()
  fireEvent.submit(screen.getByRole('form'))
  await screen.findByText('প্রোফাইল সংরক্ষিত হয়েছে।')
  expect(JSON.parse(fetcher.mock.calls[1][1].body).address).toBeNull()
})
