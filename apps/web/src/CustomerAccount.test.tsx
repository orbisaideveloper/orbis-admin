import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { CustomerAccount, loadCustomerClient } from './CustomerAccount'
import { TestRouter } from './App'
const session = { customer: { orbisIdentityId: '11111111-1111-7111-8111-111111111111', displayId: 'ORB-U-23456789' }, accessToken: 'access', refreshToken: 'refresh', expiresAt: 100000 }
function fixture(restored: typeof session | null = null) {
  const client = { snapshot: vi.fn().mockReturnValue(restored), restore: vi.fn().mockResolvedValue(restored), authenticate: vi.fn().mockResolvedValue(session), accessToken: vi.fn().mockResolvedValue('access'), logout: vi.fn().mockResolvedValue(undefined) }
  return { client, load: vi.fn().mockResolvedValue(client) }
}
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); localStorage.clear() })
async function ready(load = fixture().load) {
  render(<CustomerAccount load={load} />)
  await screen.findByRole('button', { name: 'প্রবেশ করুন' })
  return load
}
describe('central Orbis customer account screen', () => {
  it('supports phone signup with only name, contact and password and shows the stable ID', async () => {
    const { client, load } = fixture();await ready(load)
    fireEvent.click(screen.getByRole('button', { name: 'অ্যাকাউন্ট তৈরি' }))
    fireEvent.change(screen.getByLabelText('নাম'), { target: { value: 'অজয়' } })
    fireEvent.change(screen.getByLabelText('যোগাযোগের ধরন'), { target: { value: 'phone' } })
    fireEvent.change(screen.getByLabelText('ফোন নম্বর'), { target: { value: '9876543210' } })
    fireEvent.change(screen.getByLabelText('পাসওয়ার্ড'), { target: { value: 'password' } })
    fireEvent.submit(screen.getByRole('form'))
    await screen.findByText('ORB-U-23456789')
    expect(client.authenticate).toHaveBeenCalledWith('signup', { name: 'অজয়', identifier: '9876543210', password: 'password' })
    expect(screen.queryByText(/Google/)).toBeNull()
  })
  it('supports email login using the same account flow', async () => {
    const { client, load } = fixture();await ready(load)
    expect((screen.getByLabelText('যোগাযোগের ধরন') as HTMLSelectElement).value).toBe('email')
    fireEvent.change(screen.getByLabelText('ইমেইল'), { target: { value: 'a@b.co' } })
    fireEvent.change(screen.getByLabelText('পাসওয়ার্ড'), { target: { value: 'p' } })
    fireEvent.submit(screen.getByRole('form'))
    await screen.findByText('ORB-U-23456789')
    expect(client.authenticate).toHaveBeenCalledWith('login', { identifier: 'a@b.co', password: 'p' })
  })
  it('restores a persistent customer session without asking for credentials again', async () => {
    const { client, load } = fixture(session)
    render(<CustomerAccount load={load} />)
    await screen.findByText('ORB-U-23456789')
    expect(client.restore).toHaveBeenCalledTimes(1)
    expect(screen.queryByLabelText('পাসওয়ার্ড')).toBeNull()
  })
  it('validates missing and short signup input without contacting authentication', async () => {
    const { client, load } = fixture();await ready(load)
    fireEvent.submit(screen.getByRole('form'))
    await screen.findByRole('alert');expect(client.authenticate).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'অ্যাকাউন্ট তৈরি' }))
    fireEvent.change(screen.getByLabelText('যোগাযোগের ধরন'), { target: { value: 'phone' } })
    fireEvent.change(screen.getByLabelText('ফোন নম্বর'), { target: { value: '9876543210' } })
    fireEvent.change(screen.getByLabelText('পাসওয়ার্ড'), { target: { value: 'short' } })
    fireEvent.submit(screen.getByRole('form'));expect(client.authenticate).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'লগইন' }))
    expect(screen.queryByLabelText('নাম')).toBeNull()
  })
  it('clears the password on failure and prevents duplicate in-flight submissions', async () => {
    const { client, load } = fixture();let reject!: (error: Error) => void
    client.authenticate.mockImplementationOnce(() => new Promise((_resolve, fail) => { reject = fail }))
    await ready(load)
    fireEvent.change(screen.getByLabelText('যোগাযোগের ধরন'), { target: { value: 'phone' } })
    fireEvent.change(screen.getByLabelText('ফোন নম্বর'), { target: { value: '9876543210' } })
    const password = screen.getByLabelText('পাসওয়ার্ড') as HTMLInputElement
    fireEvent.change(password, { target: { value: 'password' } })
    fireEvent.submit(screen.getByRole('form'));fireEvent.submit(screen.getByRole('form'))
    expect(client.authenticate).toHaveBeenCalledTimes(1)
    await act(async () => reject(new Error('private token')))
    expect(password.value).toBe('');expect(screen.getByRole('alert').textContent).not.toContain('private')
  })
  it('signs out and returns to login', async () => {
    const { client, load } = fixture(session);render(<CustomerAccount load={load} />)
    fireEvent.click(await screen.findByRole('button', { name: 'Sign out' }))
    await screen.findByRole('button', { name: 'প্রবেশ করুন' });expect(client.logout).toHaveBeenCalledTimes(1)
  })
  it('shows a bounded signout failure without keeping the account screen signed in', async () => {
    const { client, load } = fixture(session);client.logout.mockRejectedValue(new Error('private'))
    render(<CustomerAccount load={load} />);fireEvent.click(await screen.findByRole('button', { name: 'Sign out' }))
    await screen.findByRole('alert');expect(screen.queryByText('ORB-U-23456789')).toBeNull()
  })
  it('handles unavailable service and a successful retry', async () => {
    const { load } = fixture();load.mockResolvedValueOnce(null)
    render(<CustomerAccount load={load} />)
    await screen.findByText('অ্যাকাউন্ট পরিষেবা এখন পাওয়া যাচ্ছে না।')
    fireEvent.click(screen.getByRole('button', { name: 'আবার চেষ্টা করুন' }))
    expect(await screen.findByRole('button', { name: 'প্রবেশ করুন' })).toBeTruthy()
  })
  it('handles network failures and ignores initialization after unmount', async () => {
    render(<CustomerAccount load={vi.fn().mockRejectedValue(new Error('private'))} />)
    expect((await screen.findByRole('alert')).textContent).toBe('সংযোগ করা যায়নি। আবার চেষ্টা করুন।')
    let resolve!: (value: ReturnType<typeof fixture>['client']) => void
    const load = vi.fn(() => new Promise<ReturnType<typeof fixture>['client']>(done => { resolve = done }))
    const view = render(<CustomerAccount load={load} />);view.unmount()
    const next = fixture().client;await act(async () => resolve(next));expect(next.restore).not.toHaveBeenCalled()
  })
  it('loads only central configuration and does not disclose keys', async () => {
    const fetcher = vi.fn().mockResolvedValueOnce(Response.json({ available: false })).mockResolvedValueOnce(new Response('', { status: 503 }))
    vi.stubGlobal('fetch', fetcher)
    expect(await loadCustomerClient()).toBeNull()
    await expect(loadCustomerClient()).rejects.toThrow('CUSTOMER_SERVICE_UNAVAILABLE')
    expect(fetcher.mock.calls[0][0]).toBe('/api/v1/customer/config')
  })
  it('opens the account page without loading the Admin project registry', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ available: false })))
    const registryLoader = vi.fn().mockRejectedValue(new Error('registry unavailable'))
    render(<TestRouter initialEntries={['/account']} registryLoader={registryLoader} />)
    await waitFor(() => expect(screen.getByRole('heading', { name: 'আপনার Orbis অ্যাকাউন্ট' })).toBeTruthy())
    expect(registryLoader).not.toHaveBeenCalled()
    await screen.findByText('অ্যাকাউন্ট পরিষেবা এখন পাওয়া যাচ্ছে না।')
  })
})
