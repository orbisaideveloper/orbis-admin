import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { CustomerDirectory, parseCustomerPage, readCustomerPage } from './CustomerDirectory'
const id = '11111111-1111-7111-8111-111111111111'
const row = { orbisIdentityId: id, displayId: 'ORB-U-23456789', name: 'অজয়', email: 'a@b.co', phone: '+919876543210' }
const page = { rows: [row], nextCursor: null }
function fixture(token: string | null = 'owner') {
  const auth = { token: vi.fn().mockResolvedValue(token), login: vi.fn().mockResolvedValue(undefined), logout: vi.fn().mockResolvedValue(undefined), dispose: vi.fn() }
  return { auth, load: vi.fn().mockResolvedValue(auth) }
}
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks() })
describe('owner customer directory', () => {
  it('validates pages and excludes unexpected response fields', () => {
    expect(parseCustomerPage({ ...page, rows: [{ ...row, password: 'never-render' }] })).toEqual(page)
    expect(parseCustomerPage({ rows: [], nextCursor: null })).toEqual({ rows: [], nextCursor: null })
    expect(parseCustomerPage({ rows: [row], nextCursor: id }).nextCursor).toBe(id)
    for (const value of [null, {}, { rows: [], nextCursor: id }, { rows: [row, row], nextCursor: null }, { rows: [null], nextCursor: null }, { rows: [{ ...row, phone: 4 }], nextCursor: null }, { rows: [{ ...row, displayId: 'bad' }], nextCursor: null }]) expect(() => parseCustomerPage(value)).toThrow()
  })
  it('does not request customer data before owner login', async () => {
    const fetcher = vi.fn(); vi.stubGlobal('fetch', fetcher)
    const { load } = fixture(null); render(<CustomerDirectory load={load} />)
    await screen.findByText('গ্রাহকদের তালিকা দেখতে Admin লগইন করুন।')
    expect(fetcher).not.toHaveBeenCalled()
  })
  it('shows IDs and contacts, then clears them before logout', async () => {
    const fetcher = vi.fn().mockResolvedValue({ ok: true, json: async () => page }); vi.stubGlobal('fetch', fetcher)
    const { auth, load } = fixture(); const view = render(<CustomerDirectory load={load} />)
    await screen.findByText(row.displayId)
    expect(screen.getByText(row.email)).toBeInTheDocument()
    expect(fetcher.mock.calls[0][1].headers).toEqual({ authorization: 'Bearer owner' })
    expect(fetcher.mock.calls[0][1].cache).toBe('no-store')
    fireEvent.click(screen.getByRole('button', { name: 'Admin sign out' }))
    expect(screen.queryByText(row.displayId)).toBeNull()
    await screen.findByText('Admin অ্যাকাউন্ট থেকে বেরিয়েছেন।')
    expect(auth.logout).toHaveBeenCalledOnce(); view.unmount(); expect(auth.dispose).toHaveBeenCalledOnce()
  })
  it('supports forward and backward cursor pagination', async () => {
    const fetcher = vi.fn().mockResolvedValueOnce({ ok: true, json: async () => ({ ...page, nextCursor: id }) }).mockResolvedValueOnce({ ok: true, json: async () => ({ rows: [], nextCursor: null }) }).mockResolvedValueOnce({ ok: true, json: async () => page })
    vi.stubGlobal('fetch', fetcher); render(<CustomerDirectory load={fixture().load} />)
    await screen.findByText(row.displayId); fireEvent.click(screen.getByRole('button', { name: 'পরের পাতা' }))
    await screen.findByText('গ্রাহক পাওয়া যায়নি।'); expect(fetcher.mock.calls[1][0]).toBe('/api/v1/admin/customers?after=' + id)
    fireEvent.click(screen.getByRole('button', { name: 'আগের পাতা' })); await screen.findByText(row.displayId)
    expect(fetcher.mock.calls[2][0]).toBe('/api/v1/admin/customers')
  })
  it('fails closed on denied access, without rendering error body or stale contacts', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, json: async () => ({ secret: 'hidden' }) }))
    render(<CustomerDirectory load={fixture().load} />)
    await screen.findByText('তালিকা পাওয়া যায়নি। Admin অনুমতি ও সংযোগ যাচাই করুন।')
    expect(screen.queryByText(row.displayId)).toBeNull(); expect(screen.queryByText('hidden')).toBeNull()
  })
  it('handles missing configuration and retries loading', async () => {
    const load = vi.fn().mockResolvedValue(null); render(<CustomerDirectory load={load} />)
    await screen.findByText('Admin লগইন পরিষেবা পাওয়া যাচ্ছে না।')
    fireEvent.click(screen.getByRole('button', { name: 'আবার যাচাই করুন' })); await waitFor(() => expect(load).toHaveBeenCalledTimes(2))
  })
  it('reports login failure and clears customer rows', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => page }))
    const { auth, load } = fixture(); auth.login.mockRejectedValueOnce(new Error('secret'))
    render(<CustomerDirectory load={load} />); await screen.findByText(row.displayId)
    fireEvent.click(screen.getByRole('button', { name: 'Admin লগইন' }))
    await screen.findByText('Admin লগইন পরিবর্তন নিশ্চিত হয়নি। আবার যাচাই করুন।'); expect(screen.queryByText(row.displayId)).toBeNull()
  })
  it('requires a token for every page request', async () => {
    await expect(readCustomerPage(fixture(null).auth, null, new AbortController().signal)).rejects.toThrow('OWNER_LOGIN_REQUIRED')
  })
})
