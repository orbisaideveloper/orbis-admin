import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { CustomerProfile, customerProfileRequest } from './CustomerProfile'
import { CustomerDirectory } from './CustomerDirectory'
import { CustomerAccount, loadCustomerClient } from './CustomerAccount'
const customer = { orbisIdentityId: '11111111-1111-7111-8111-111111111111', displayId: 'ORB-U-23456789' }
const session = { customer, accessToken: 'access', refreshToken: 'refresh', expiresAt: 100000 }
const profile = { name: 'Name', address: null, alternatePhone: null, dateOfBirth: null, gender: null }
const data = { version: 'orbis.customer.profile.v1', customer, profile, contact: { email: null, phone: null } }
function client() { return { snapshot: vi.fn().mockReturnValue(session), restore: vi.fn().mockResolvedValue(session), authenticate: vi.fn().mockResolvedValue(session), accessToken: vi.fn().mockResolvedValue('access'), logout: vi.fn().mockResolvedValue(undefined) } }
function deferred<T>() { let resolve!: (value: T) => void; let reject!: (error: Error) => void; const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no }); return { promise, resolve, reject } }
const ok = (value: unknown) => ({ ok: true, json: async () => value })
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.restoreAllMocks(); localStorage.clear() })
it('cleans up a failed login even if the password control was removed during the request', async () => {
 const pending = deferred<typeof session>(), c = client(); c.restore.mockResolvedValue(null as unknown as typeof session); c.authenticate.mockReturnValue(pending.promise)
 render(<CustomerAccount load={vi.fn().mockResolvedValue(c)} />)
 await screen.findByRole('button', { name: 'প্রবেশ করুন' })
 fireEvent.change(screen.getByLabelText('ইমেইল'), { target: { value: 'customer@example.test' } })
 fireEvent.change(screen.getByLabelText('পাসওয়ার্ড'), { target: { value: 'password' } })
 fireEvent.submit(screen.getByRole('form')); screen.getByLabelText('পাসওয়ার্ড').remove()
 await act(async () => pending.reject(new Error('private')))
 expect(screen.getByRole('alert')).toHaveTextContent('প্রবেশ করা যায়নি।')
 expect(c.authenticate).toHaveBeenCalledOnce()
})
it('revokes a queued duplicate signout only once and hides accounts when their client is lost', async () => {
 const pending = deferred<void>(), c = client(); c.logout.mockReturnValue(pending.promise)
 vi.stubGlobal('fetch', vi.fn().mockResolvedValue(ok(data)))
 const view = render(<CustomerAccount load={vi.fn().mockResolvedValue(c)} />)
 const button = await screen.findByRole('button', { name: 'Sign out' })
 act(() => { button.click(); button.click() }); expect(c.logout).toHaveBeenCalledOnce()
 await act(async () => pending.resolve(undefined)); await screen.findByRole('button', { name: 'প্রবেশ করুন' })
 view.unmount()
 const reload = render(<CustomerAccount load={vi.fn().mockResolvedValue(client())} />)
 await screen.findByText(customer.displayId)
 reload.rerender(<CustomerAccount load={vi.fn().mockResolvedValue(null)} />)
 await screen.findByText('অ্যাকাউন্ট পরিষেবা এখন পাওয়া যাচ্ছে না।')
 expect(screen.queryByText(customer.displayId)).toBeNull()
})
it('submits absent optional profile controls as null rather than invented values', async () => {
 const fetcher = vi.fn().mockResolvedValue(ok(data)); vi.stubGlobal('fetch', fetcher)
 render(<CustomerProfile client={client()} customer={customer} />)
 await screen.findByLabelText('প্রোফাইলের নাম')
 await waitFor(() => expect(screen.getByRole('button', { name: 'প্রোফাইল সংরক্ষণ করুন' })).not.toBeDisabled())
 screen.getByLabelText('ঠিকানা').remove()
 fireEvent.submit(screen.getByRole('form')); await screen.findByText('প্রোফাইল সংরক্ষিত হয়েছে।')
 expect(JSON.parse(fetcher.mock.calls[1][1].body).address).toBeNull()
})
it.each([true, false])('does not publish navigation completed after disposal (success=%s)', async success => {
 const auth = { token: vi.fn().mockResolvedValue('owner'), login: vi.fn(), logout: vi.fn(), dispose: vi.fn() }
 const row = { ...customer, name: 'Name', email: null, phone: null }
 const pending = deferred<ReturnType<typeof ok>>()
 const fetcher = vi.fn().mockResolvedValueOnce(ok({ rows: [row], nextCursor: customer.orbisIdentityId })).mockReturnValueOnce(pending.promise); vi.stubGlobal('fetch', fetcher)
 const view = render(<CustomerDirectory load={vi.fn().mockResolvedValue(auth)} />)
 await screen.findByText(customer.displayId)
 const next = screen.getByRole('button', { name: 'পরের পাতা' })
 act(() => { next.click(); next.click() })
 await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(2)); view.unmount()
 await act(async () => { if (success) pending.resolve(ok({ rows: [], nextCursor: null })); else pending.reject(new Error('private')) })
 expect(screen.queryByText('গ্রাহক পাওয়া যায়নি।')).toBeNull()
})
it('blocks queued duplicate owner actions and ignores failure after disposal', async () => {
 const pending = deferred<void>()
 const auth = { token: vi.fn().mockResolvedValue('owner'), login: vi.fn().mockReturnValue(pending.promise), logout: vi.fn(), dispose: vi.fn() }
 vi.stubGlobal('fetch', vi.fn().mockResolvedValue(ok({ rows: [], nextCursor: null })))
 const view = render(<CustomerDirectory load={vi.fn().mockResolvedValue(auth)} />)
 await screen.findByText('গ্রাহক পাওয়া যায়নি।')
 const button = screen.getByRole('button', { name: 'Admin লগইন' })
 act(() => { button.click(); button.click() }); expect(auth.login).toHaveBeenCalledOnce(); view.unmount()
 await act(async () => pending.reject(new Error('private')))
 expect(screen.queryByText('Admin লগইন পরিবর্তন নিশ্চিত হয়নি। আবার যাচাই করুন।')).toBeNull()
})
it('loads configured customer client and fails closed on every malformed config', async () => {
 const fetcher = vi.fn(); vi.stubGlobal('fetch', fetcher)
 for (const body of [null, 3, {}, { available: 'true' }]) { fetcher.mockResolvedValueOnce(ok(body)); expect(await loadCustomerClient()).toBeNull() }
 vi.stubGlobal('window', { location: { origin: 'https://admin.example' } })
 fetcher.mockResolvedValueOnce(ok({ available: true }))
 expect(await loadCustomerClient()).not.toBeNull(); vi.unstubAllGlobals()
})
it('validates each profile envelope and field independently', async () => {
 const fetcher = vi.fn(); vi.stubGlobal('fetch', fetcher)
 const malformed: unknown[] = [3, { ...data, version: 'bad' }, { ...data, customer: null }, { ...data, customer: 3 }, { ...data, customer: {} }, { ...data, customer: { orbisIdentityId: customer.orbisIdentityId } }, { ...data, customer: { ...customer, displayId: 'bad' } }, { ...data, profile: null }, { ...data, profile: 3 }, { ...data, contact: null }, { ...data, contact: 3 }]
 for (const key of ['version', 'customer', 'profile', 'contact']) { const body: Record<string, unknown> = { ...data }; delete body[key]; malformed.push(body) }
 for (const change of [{ name: 3 }, { name: 'x'.repeat(121) }, { address: 3 }, { address: 'x'.repeat(1001) }, { alternatePhone: 3 }, { dateOfBirth: 3 }, { gender: 'bad' }]) malformed.push({ ...data, profile: { ...profile, ...change } })
 malformed.push({ ...data, contact: { email: null, phone: 3 } })
 for (const body of malformed) { fetcher.mockResolvedValueOnce(ok(body)); await expect(customerProfileRequest(client(), customer, new AbortController().signal)).rejects.toThrow('PROFILE_INVALID') }
 for (const gender of ['male', 'female', 'other', 'prefer-not-to-say']) { fetcher.mockResolvedValueOnce(ok({ ...data, profile: { ...profile, gender, address: 'Address', alternatePhone: '123', dateOfBirth: '2000-01-01' }, contact: { email: 'a@b.co', phone: '123' } })); await expect(customerProfileRequest(client(), customer, new AbortController().signal)).resolves.toMatchObject({ profile: { gender } }) }
})
it('rejects empty profile names, retries and saves all optional fields', async () => {
 const fetcher = vi.fn().mockResolvedValue(ok(data)); vi.stubGlobal('fetch', fetcher)
 render(<CustomerProfile client={client()} customer={customer} />)
 const name = await screen.findByLabelText('প্রোফাইলের নাম')
 fireEvent.change(name, { target: { value: '' } }); fireEvent.submit(screen.getByRole('form')); await screen.findByText('প্রোফাইলের তথ্য ঠিক করে দিন।'); expect(fetcher).toHaveBeenCalledTimes(1)
 fireEvent.change(name, { target: { value: 'Name' } })
 for (const [label, value] of [['ঠিকানা', 'Address'], ['বিকল্প ফোন', '123'], ['জন্মতারিখ', '2000-01-01'], ['লিঙ্গ', 'male']]) fireEvent.change(screen.getByLabelText(label), { target: { value } })
 fireEvent.submit(screen.getByRole('form')); await screen.findByText('প্রোফাইল সংরক্ষিত হয়েছে।')
 expect(JSON.parse(fetcher.mock.calls[1][1].body)).toEqual({ name: 'Name', address: 'Address', alternatePhone: '123', dateOfBirth: '2000-01-01', gender: 'male' })
 fireEvent.click(screen.getByRole('button', { name: 'প্রোফাইল আবার পড়ুন' })); await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(3))
})
it('does not duplicate profile saves or display success after identity switches', async () => {
 const pending = deferred<ReturnType<typeof ok>>(), c = client()
 const fetcher = vi.fn().mockResolvedValueOnce(ok(data)).mockReturnValueOnce(pending.promise); vi.stubGlobal('fetch', fetcher)
 render(<CustomerProfile client={c} customer={customer} />); await screen.findByLabelText('প্রোফাইলের নাম')
 await waitFor(() => expect(screen.getByRole('button', { name: 'প্রোফাইল সংরক্ষণ করুন' })).not.toBeDisabled())
 fireEvent.submit(screen.getByRole('form')); fireEvent.submit(screen.getByRole('form'))
 await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(2))
 c.snapshot.mockReturnValue({ ...session, customer: { ...customer, orbisIdentityId: 'other' } })
 await act(async () => pending.resolve(ok(data)))
 expect(screen.queryByText('প্রোফাইল সংরক্ষিত হয়েছে।')).toBeNull()
})
it.each([true, false])('ignores profile completion after unmount (success=%s)', async success => {
 const pending = deferred<ReturnType<typeof ok>>(); vi.stubGlobal('fetch', vi.fn().mockReturnValue(pending.promise))
 const view = render(<CustomerProfile client={client()} customer={customer} />); await waitFor(() => expect(fetch).toHaveBeenCalledOnce()); view.unmount()
 await act(async () => { if (success) pending.resolve(ok(data)); else pending.reject(new Error('private')) })
 expect(screen.queryByText('প্রোফাইল পাওয়া যায়নি। আবার চেষ্টা করুন।')).toBeNull()
})
it('ignores account restore completion and failure after unmount', async () => {
 for (const success of [true, false]) { const pending = deferred<typeof session>(), c = client(); c.restore.mockReturnValue(pending.promise)
 const view = render(<CustomerAccount load={vi.fn().mockResolvedValue(c)} />); await waitFor(() => expect(c.restore).toHaveBeenCalledOnce()); view.unmount()
 await act(async () => { if (success) pending.resolve(session); else pending.reject(new Error('private')) }) }
})
it('supports switching contact back to phone and validates signup name and password separately', async () => {
 const c = client(); c.restore.mockResolvedValue(null as unknown as typeof session)
 render(<CustomerAccount load={vi.fn().mockResolvedValue(c)} />); await screen.findByRole('button', { name: 'প্রবেশ করুন' })
 fireEvent.change(screen.getByLabelText('যোগাযোগের ধরন'), { target: { value: 'email' } }); fireEvent.change(screen.getByLabelText('যোগাযোগের ধরন'), { target: { value: 'phone' } })
 fireEvent.change(screen.getByLabelText('ফোন নম্বর'), { target: { value: '9876543210' } }); fireEvent.submit(screen.getByRole('form')); expect(c.authenticate).not.toHaveBeenCalled()
 fireEvent.click(screen.getByRole('button', { name: 'অ্যাকাউন্ট তৈরি' })); fireEvent.change(screen.getByLabelText('ফোন নম্বর'), { target: { value: '9876543210' } }); fireEvent.change(screen.getByLabelText('পাসওয়ার্ড'), { target: { value: 'password' } }); fireEvent.submit(screen.getByRole('form')); expect(c.authenticate).not.toHaveBeenCalled()
 fireEvent.change(screen.getByLabelText('নাম'), { target: { value: 'Name' } }); fireEvent.change(screen.getByLabelText('পাসওয়ার্ড'), { target: { value: 'short' } }); fireEvent.submit(screen.getByRole('form')); expect(c.authenticate).not.toHaveBeenCalled()
})
it('disposes an owner loaded after unmount and ignores late directory results', async () => {
 const auth = { token: vi.fn().mockResolvedValue('owner'), login: vi.fn(), logout: vi.fn(), dispose: vi.fn() }
 const pending = deferred<typeof auth>(), load = vi.fn().mockReturnValue(pending.promise)
 const view = render(<CustomerDirectory load={load} />); view.unmount(); await act(async () => pending.resolve(auth)); expect(auth.dispose).toHaveBeenCalledOnce()
 for (const success of [true, false]) {
 const request = deferred<ReturnType<typeof ok>>(); vi.stubGlobal('fetch', vi.fn().mockReturnValue(request.promise))
 const view2 = render(<CustomerDirectory load={vi.fn().mockResolvedValue(auth)} />); await waitFor(() => expect(fetch).toHaveBeenCalledOnce()); view2.unmount()
 await act(async () => { if (success) request.resolve(ok({ rows: [], nextCursor: null })); else request.reject(new Error('private')) })
 }
})
it('handles navigation failures, owner login success and late owner action results', async () => {
 const row = { ...customer, name: 'Name', email: null, phone: null }
 const auth = { token: vi.fn().mockResolvedValue('owner'), login: vi.fn().mockResolvedValue(undefined), logout: vi.fn().mockResolvedValue(undefined), dispose: vi.fn() }
 const fetcher = vi.fn().mockResolvedValueOnce(ok({ rows: [row], nextCursor: customer.orbisIdentityId })).mockRejectedValueOnce(new Error('private')); vi.stubGlobal('fetch', fetcher)
 const view = render(<CustomerDirectory load={vi.fn().mockResolvedValue(auth)} />); await screen.findByText(customer.displayId)
 fireEvent.click(screen.getByRole('button', { name: 'পরের পাতা' })); await screen.findByText('তালিকা পাওয়া যায়নি। Admin অনুমতি ও সংযোগ যাচাই করুন।')
 fireEvent.click(screen.getByRole('button', { name: 'Admin লগইন' })); await screen.findByText('Admin লগইন সম্পন্ন হলে আবার যাচাই করুন।')
 const pending = deferred<void>(); auth.logout.mockReturnValueOnce(pending.promise)
 fireEvent.click(screen.getByRole('button', { name: 'Admin sign out' })); view.unmount(); await act(async () => pending.resolve(undefined))
 expect(screen.queryByText('Admin অ্যাকাউন্ট থেকে বেরিয়েছেন।')).toBeNull()
})
