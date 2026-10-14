import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { CustomerProfile, customerProfileRequest } from './CustomerProfile'
const customer = { orbisIdentityId: '11111111-1111-7111-8111-111111111111', displayId: 'ORB-U-23456789' }
const session = { customer, accessToken: 'access', refreshToken: 'refresh', expiresAt: 100000 }
const profile = { name: 'অজয়', address: null, alternatePhone: null, dateOfBirth: null, gender: null }
const response = { version: 'orbis.customer.profile.v1', customer, profile, contact: { email: 'a@b.co', phone: null } }
function fixture() {
  return { snapshot: vi.fn().mockReturnValue(session), restore: vi.fn().mockResolvedValue(session), authenticate: vi.fn().mockResolvedValue(session), accessToken: vi.fn().mockResolvedValue('access'), logout: vi.fn().mockResolvedValue(undefined) }
}
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks() })
describe('central profile editor', () => {
  it('reads and saves profile fields without sending a user ID or credentials', async () => {
    const fetcher = vi.fn().mockResolvedValue({ ok: true, json: async () => response }); vi.stubGlobal('fetch', fetcher)
    render(<CustomerProfile client={fixture()} customer={customer} />)
    const name = await screen.findByLabelText('প্রোফাইলের নাম'); expect(name).toHaveValue('অজয়')
    fireEvent.change(name, { target: { value: 'নতুন নাম' } }); fireEvent.change(screen.getByLabelText('ঠিকানা'), { target: { value: 'কলকাতা' } })
    fireEvent.submit(screen.getByRole('form')); await screen.findByText('প্রোফাইল সংরক্ষিত হয়েছে।')
    const options = fetcher.mock.calls[1][1]; expect(options.method).toBe('POST'); expect(options.headers.authorization).toBe('Bearer access')
    expect(JSON.parse(options.body)).toEqual({ ...profile, name: 'নতুন নাম', address: 'কলকাতা' })
    expect(options.body).not.toContain(customer.orbisIdentityId); expect(options.body).not.toContain('password')
  })
  it('rejects a profile belonging to a different account', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ...response, customer: { ...customer, orbisIdentityId: 'other' } }) }))
    render(<CustomerProfile client={fixture()} customer={customer} />)
    await screen.findByText('প্রোফাইল পাওয়া যায়নি। আবার চেষ্টা করুন।'); expect(screen.queryByLabelText('প্রোফাইলের নাম')).toBeNull()
  })
  it('shows save failure without reporting success', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce({ ok: true, json: async () => response }).mockResolvedValueOnce({ ok: false }))
    render(<CustomerProfile client={fixture()} customer={customer} />); await screen.findByLabelText('প্রোফাইলের নাম')
    fireEvent.submit(screen.getByRole('form')); await screen.findByText('প্রোফাইল সংরক্ষণ নিশ্চিত হয়নি। তথ্য যাচাই করে আবার চেষ্টা করুন।')
    expect(screen.queryByText('প্রোফাইল সংরক্ষিত হয়েছে।')).toBeNull()
  })
  it('rejects expired or switched sessions before sending a request', async () => {
    const client = fixture(); client.accessToken.mockResolvedValueOnce(null as unknown as string)
    await expect(customerProfileRequest(client, customer, new AbortController().signal)).rejects.toThrow()
    client.snapshot.mockReturnValueOnce({ ...session, customer: { ...customer, orbisIdentityId: 'other' } })
    await expect(customerProfileRequest(client, customer, new AbortController().signal)).rejects.toThrow()
  })
  it('rejects malformed profile responses', async () => {
    const fetcher = vi.fn(); vi.stubGlobal('fetch', fetcher)
    for (const body of [null, {}, { ...response, profile: { ...profile, gender: 'bad' } }, { ...response, contact: { email: 3, phone: null } }, { ...response, profile: { ...profile, name: '' } }]) {
      fetcher.mockResolvedValueOnce({ ok: true, json: async () => body })
      await expect(customerProfileRequest(fixture(), customer, new AbortController().signal)).rejects.toThrow('PROFILE_INVALID')
    }
  })
})
