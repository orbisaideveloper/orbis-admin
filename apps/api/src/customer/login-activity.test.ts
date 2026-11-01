import { describe, expect, it, vi } from 'vitest'
import { createLoginActivity, observeLogin } from './login-activity'
import { CustomerError } from './error'
const origin='https://aqcwhqdzniruvoqwfsij.supabase.co'
const event={id:'id',action:'login' as const,outcome:'failure' as const,code:'FAILED',durationMs:1,origin:null,orbisIdentityId:null}
describe('bounded auth telemetry',()=>{
  it('stays disabled until explicitly configured',()=>{
    const fetchImpl=vi.fn()
    for(const options of [{},{enabled:true,origin:'wrong',serviceKey:'secret'},{enabled:true,origin}])createLoginActivity({...options,fetchImpl})(event)
    expect(fetchImpl).not.toHaveBeenCalled()
  })
  it('records bounded metadata, drops excess work, and recovers from network failure',async()=>{
    let finish!:()=>void
    const fetchImpl=vi.fn().mockImplementation(()=>new Promise(resolve=>{finish=()=>resolve(new Response())}))
    const record=createLoginActivity({enabled:true,origin,serviceKey:'server',fetchImpl})
    for(let i=0;i<33;i++)record(event)
    expect(fetchImpl).toHaveBeenCalledTimes(32);expect(JSON.parse(fetchImpl.mock.calls[0][1].body)).toEqual({p_event:event})
    finish();await Promise.resolve();await Promise.resolve()
    fetchImpl.mockRejectedValueOnce(new Error('offline'));record(event)
    await Promise.resolve();await Promise.resolve();expect(fetchImpl).toHaveBeenCalledTimes(33)
  })
  it('uses the runtime fetch when no adapter is injected',async()=>{
    const fetchImpl=vi.fn().mockResolvedValue(new Response());vi.stubGlobal('fetch',fetchImpl)
    createLoginActivity({enabled:true,origin,serviceKey:'server'})(event)
    await Promise.resolve();expect(fetchImpl).toHaveBeenCalledOnce();vi.unstubAllGlobals()
  })
  it('returns auth success and throws the original error regardless of the recorder',async()=>{
    const record=vi.fn(),result={customer:{orbisIdentityId:'canonical'}}
    expect(await observeLogin(async()=>result,true,'https://orbis-khata.onrender.com',record)).toBe(result)
    expect(record.mock.calls[0][0]).toMatchObject({action:'signup',outcome:'success',code:'OK',orbisIdentityId:'canonical'})
    const error=new CustomerError(401,'CUSTOMER_AUTH_FAILED')
    await expect(observeLogin(async()=>{throw error},false,undefined,record)).rejects.toBe(error)
    expect(record.mock.calls[1][0]).toMatchObject({action:'login',outcome:'failure',origin:null,orbisIdentityId:null,code:'CUSTOMER_AUTH_FAILED'})
    const unknown=new Error('secret')
    await expect(observeLogin(async()=>{throw unknown},false,undefined,record)).rejects.toBe(unknown)
    expect(JSON.stringify(record.mock.calls)).not.toContain('secret')
    expect(await observeLogin(async()=>result,false,undefined,()=>{throw new Error('offline')})).toBe(result)
    expect(await observeLogin(async()=>({customer:undefined!}),false,undefined,record)).toEqual({customer:undefined})
  })
})
