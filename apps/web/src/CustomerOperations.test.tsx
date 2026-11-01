import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { CustomerOperations, readOperations } from './CustomerOperations'
import { observationFixture, customer, id } from '../../../packages/contracts/src/customer-observability.fixture'
function fixture() {
  const auth={token:vi.fn().mockResolvedValue('owner'),login:vi.fn().mockResolvedValue(undefined),logout:vi.fn(),dispose:vi.fn()}
  return { auth,load:vi.fn().mockResolvedValue(auth) }
}
function show(load=fixture().load,entry='/operations') { return render(<MemoryRouter initialEntries={[entry]}><CustomerOperations load={load}/></MemoryRouter>) }
afterEach(()=>{vi.unstubAllGlobals();vi.restoreAllMocks()})
describe('central customer and app operations',()=>{
  it('renders scoped data and navigates between app and customer without copying credentials',async()=>{
    const fetcher=vi.fn().mockResolvedValue({ok:true,json:async()=>observationFixture});vi.stubGlobal('fetch',fetcher)
    const {auth,load}=fixture(),view=show(load)
    await screen.findByRole('link',{name:customer.name})
    expect(screen.getByText(customer.email)).toBeInTheDocument()
    expect(screen.getByText(/Database MB/)).toHaveTextContent('তথ্য সংযোগ করা হয়নি')
    expect(screen.getByText(/অ্যাপ অজানা/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('link',{name:customer.name}))
    await screen.findByRole('heading',{name:'কাস্টমারের বিস্তারিত'})
    await waitFor(()=>expect(fetcher.mock.calls.at(-1)?.[0]).toContain('customer='+id))
    fireEvent.click(screen.getByRole('link',{name:'ORBIS Khata'}))
    await screen.findByRole('heading',{name:'orbis-khata · অ্যাপের ব্যবহার'})
    await screen.findByRole('link',{name:customer.name})
    fireEvent.click(screen.getByRole('button',{name:'আবার যাচাই করুন'}))
    await screen.findByRole('link',{name:customer.name})
    expect(fetcher.mock.calls[0][1]).toMatchObject({cache:'no-store',headers:{authorization:'Bearer owner'}})
    view.unmount();expect(auth.dispose).toHaveBeenCalled()
  })
  it('handles missing contacts, identity, app bindings and dates without assuming zero usage',async()=>{
    vi.stubGlobal('fetch',vi.fn().mockResolvedValue({ok:true,json:async()=>({...observationFixture,customers:[{...customer,orbisIdentityId:null,displayId:null,email:null,phone:null,lastSignInAt:null,products:[]}],activity:[]})}))
    show();await screen.findByText('সেন্ট্রাল পরিচয় অসম্পূর্ণ',{selector:'dd'})
    expect(screen.getByText('কোনো অ্যাপের সংযোগ পাওয়া যায়নি।')).toBeInTheDocument()
    expect(screen.getByText(/এটি কোনো চেষ্টা হয়নি/)).toBeInTheDocument()
  })
  it('paginates and starts again while retaining selected scope',async()=>{
    const fetcher=vi.fn().mockResolvedValueOnce({ok:true,json:async()=>({...observationFixture,nextCursor:id})}).mockResolvedValue({ok:true,json:async()=>({...observationFixture,customers:[],activity:[{...observationFixture.activity[0],projectId:'orbis-khata',orbisIdentityId:id}]})})
    vi.stubGlobal('fetch',fetcher);show(fixture().load,'/operations?project=orbis-khata')
    fireEvent.click(await screen.findByRole('link',{name:'পরের ৫০ জন'}))
    await screen.findByText('এই scope-এ কোনো account পাওয়া যায়নি।')
    expect(fetcher.mock.calls[1][0]).toContain('project=orbis-khata&after='+id)
    fireEvent.click(screen.getByRole('link',{name:'প্রথম পাতা'}))
    await waitFor(()=>expect(fetcher.mock.calls.at(-1)?.[0]).toBe('/api/v1/admin/customer-observability?project=orbis-khata'))
  })
  it('does not read protected data without owner auth and supports login/retry failures',async()=>{
    const fetcher=vi.fn();vi.stubGlobal('fetch',fetcher)
    const missing=show(vi.fn().mockResolvedValue(null));await screen.findByText('এই তথ্য দেখতে Admin লগইন করুন।');expect(fetcher).not.toHaveBeenCalled();missing.unmount()
    const {auth,load}=fixture();auth.token.mockResolvedValue(null)
    show(load);await screen.findByText('এই তথ্য দেখতে Admin লগইন করুন।')
    fireEvent.click(screen.getByRole('button',{name:'Admin লগইন'}));await screen.findByText('লগইন সম্পন্ন হলে আবার যাচাই করুন।')
    auth.login.mockRejectedValueOnce(new Error('secret'));fireEvent.click(screen.getByRole('button',{name:'Admin লগইন'}));await screen.findByText('Admin লগইন শুরু করা যায়নি।')
    fireEvent.click(screen.getByRole('button',{name:'আবার যাচাই করুন'}));await screen.findByText('এই তথ্য দেখতে Admin লগইন করুন।')
    expect(fetcher).not.toHaveBeenCalled()
    await expect(readOperations(auth,'',new AbortController().signal)).rejects.toThrow('OWNER_LOGIN_REQUIRED')
  })
  it('fails closed and never renders upstream error bodies',async()=>{
    vi.stubGlobal('fetch',vi.fn().mockResolvedValue({ok:false,json:async()=>({secret:'secret'})}))
    show();await screen.findByText(/তথ্য পাওয়া যায়নি। Admin অনুমতি/);expect(screen.queryByText(customer.email)).toBeNull()
  })
  it('ignores late authentication, data and rejected requests after unmount',async()=>{
    const {auth,load}=fixture();let resolve!:(value:typeof auth)=>void
    const first=show(vi.fn().mockImplementation(()=>new Promise(done=>{resolve=done})))
    first.unmount();await act(async()=>{resolve(auth) });expect(auth.dispose).toHaveBeenCalledOnce()
    let finish!:(value:unknown)=>void
    vi.stubGlobal('fetch',vi.fn().mockImplementation(()=>new Promise(done=>{finish=done})))
    const second=show(load);await waitFor(()=>expect(auth.token).toHaveBeenCalledTimes(2));second.unmount()
    await act(async()=>{finish({ok:true,json:async()=>observationFixture})})
    let fail!:(value:Error)=>void
    vi.stubGlobal('fetch',vi.fn().mockImplementation(()=>new Promise((_done,reject)=>{fail=reject})))
    const third=show(load);await waitFor(()=>expect(auth.token).toHaveBeenCalledTimes(4));third.unmount()
    await act(async()=>{fail(new Error('late'))})
  })
})
