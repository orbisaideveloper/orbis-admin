import { describe, expect, it, vi } from 'vitest'
import { birthPatch, birthResult, createMayaProfiles } from './maya-profiles'
const profile={name:'Sample',birthDate:'2000-01-01',birthTime:'12:30',birthPlace:'Kolkata'}
const entry={slot:1,relation:'self',profile}
const patch={...entry,expectedRevision:0}
const customer={orbisIdentityId:'11111111-1111-7111-8111-111111111111',displayId:'ORB-U-23456789'}
const token='header.'+Buffer.from(JSON.stringify({sub:'auth-user',session_id:'live-session'})).toString('base64url')+'.signature'
describe('five central Maya birth profiles',()=>{
 it('normalizes a valid patch and preserves complete geographic information',()=>{
  const located={...profile,birthLocation:{label:'Kolkata',latitude:22.57,longitude:88.36,timezone:'Asia/Kolkata'}}
  expect(birthPatch({...patch,profile:located})).toEqual({...patch,profile:located})
  expect(birthPatch({...patch,profile:{...profile,name:' Sample ',birthDate:'',birthTime:''}}).profile.name).toBe('Sample')
 })
 it.each([null,[],{}, {...patch,expectedRevision:-1},{...patch,expectedRevision:1.5},{...patch,expectedRevision:1000000001}, {...patch,ownerId:'other'}, {...patch,slot:6}, {...patch,relation:'x'.repeat(101)},
  ...Object.entries({name:['',1,'x'.repeat(101),'Sample\n'],birthDate:['2000-02-30','invalid','2999-01-01'],birthTime:['24:00','10:99'],birthPlace:[{},'x'.repeat(201)]}).flatMap(([k,values])=>values.map(v=>({...patch,profile:{...profile,[k]:v}}))),
  {...patch,profile:{...profile,owner:'other'}}, {...patch,profile:{...profile,birthLocation:null}},
  ...[{label:'Wrong',latitude:0,longitude:0,timezone:'UTC'},{label:'Kolkata',latitude:91,longitude:0,timezone:'UTC'},{label:'Kolkata',latitude:0,longitude:181,timezone:'UTC'},{label:'Kolkata',latitude:0,longitude:0,timezone:'invalid'}].map(birthLocation=>({...patch,profile:{...profile,birthLocation}})),
 ])('rejects invalid fields and owner-supplied identifiers %#',value=>expect(()=>birthPatch(value)).toThrow('MAYA_PROFILE_INVALID'))
 it('accepts at most five unique slots and an explicit revision',()=>{
  expect(birthResult({revision:2,profiles:[entry,{...entry,slot:2}]}).profiles).toHaveLength(2)
  expect(birthResult({revision:0,profiles:[]})).toEqual({revision:0,profiles:[]})
 })
 it.each([null,{revision:-1,profiles:[]},{revision:1,profiles:null},{revision:1,profiles:[entry,entry]},{revision:1,profiles:[entry,entry,entry]}])('fails closed on malformed stored results',value=>expect(()=>birthResult(value)).toThrow('MAYA_PROFILE_UNAVAILABLE'))
 it('verifies the live central session before using service-only persistence',async()=>{
  const current=vi.fn().mockResolvedValue({customer}),request=vi.fn().mockImplementation(async()=>Response.json({revision:1,profiles:[entry]}))
  const save=createMayaProfiles({current},{serviceKey:'private',fetchImpl:request})
  expect(await save(token,patch)).toEqual({version:'orbis.maya.profiles.v1',customer,revision:1,profiles:[entry]})
  expect(current).toHaveBeenCalledWith(token)
  expect(JSON.parse(request.mock.calls[0][1].body)).toEqual({p_auth_user_id:'auth-user',p_session_id:'live-session',p_patch:patch})
  expect((await save(token)).version).toBe('orbis.maya.profiles.v1')
 })
 it('stops before persistence for an unverified or unconfigured session',async()=>{
  const request=vi.fn(),current=vi.fn().mockRejectedValue(new Error('auth failed'))
  await expect(createMayaProfiles({current},{serviceKey:'private',fetchImpl:request})(token)).rejects.toThrow('auth failed')
  await expect(createMayaProfiles({current},{fetchImpl:request})(token)).rejects.toMatchObject({code:'MAYA_PROFILE_UNAVAILABLE'})
  expect(request).not.toHaveBeenCalled()
 })
 it.each([[409,{code:'40001'},'MAYA_PROFILE_CONFLICT'],[500,{message:'private'},'MAYA_PROFILE_UNAVAILABLE']] as const)('sanitizes HTTP %s without overwriting conflicts',async(status,body,code)=>{
  const request=vi.fn().mockResolvedValue(Response.json(body,{status}))
  await expect(createMayaProfiles({current:vi.fn().mockResolvedValue({customer})},{serviceKey:'private',fetchImpl:request})(token,patch)).rejects.toMatchObject({code})
 })
 it('rejects oversized database replies',async()=>{
  await expect(createMayaProfiles({current:vi.fn().mockResolvedValue({customer})},{serviceKey:'private',fetchImpl:vi.fn().mockResolvedValue(new Response('x'.repeat(65537)))})(token)).rejects.toMatchObject({code:'MAYA_PROFILE_UNAVAILABLE'})
 })
})

it('accepts all five family members including the last slot',()=>{
 const profiles=[1,2,3,4,5].map(slot=>({...entry,slot}))
 expect(birthResult({revision:5,profiles}).profiles).toHaveLength(5)
 expect(birthPatch({...patch,slot:5}).slot).toBe(5)
 expect(()=>birthResult({revision:6,profiles:[...profiles,{...entry,slot:6}]})).toThrow()
})


it.each(['Sample\u0000','Sample\u001f','Sample\u007f'])('rejects control characters in birth-profile text %#',name=>{
 expect(()=>birthPatch({...patch,profile:{...profile,name}})).toThrow('MAYA_PROFILE_INVALID')
})
it('uses the platform fetch when no fetch override is provided',async()=>{
 const request=vi.fn().mockResolvedValue(Response.json({revision:1,profiles:[entry]}))
 vi.stubGlobal('fetch',request)
 try{
  await expect(createMayaProfiles({current:vi.fn().mockResolvedValue({customer})},{serviceKey:'private'})(token)).resolves.toEqual({version:'orbis.maya.profiles.v1',customer,revision:1,profiles:[entry]})
  expect(request).toHaveBeenCalledOnce()
  expect(request).toHaveBeenCalledWith('https://aqcwhqdzniruvoqwfsij.supabase.co/rest/v1/rpc/orbis_maya_birth_profiles',expect.objectContaining({method:'POST',redirect:'error',body:JSON.stringify({p_auth_user_id:'auth-user',p_session_id:'live-session',p_patch:null})}))
 }finally{vi.unstubAllGlobals()}
})
