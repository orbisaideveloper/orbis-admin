import Fastify from 'fastify'
import { describe, expect, it, vi } from 'vitest'
import { registerCustomerRoutes } from './customer'
import { createCustomerService, CustomerError } from '../customer/service'
const body={version:'orbis.maya.profiles.v1',customer:{},revision:0,profiles:[]}
function fixture(){const app=Fastify(),profiles=vi.fn().mockResolvedValue(body);registerCustomerRoutes(app,createCustomerService({}),['https://maya.example'],undefined,profiles);return {app,profiles}}
describe('Maya profile customer API',()=>{
 it('requires bearer authentication before either operation',async()=>{
  const {app,profiles}=fixture()
  for(const method of ['GET','POST'] as const)expect((await app.inject({method,url:'/api/v1/customer/maya/profiles',...(method==='POST'?{payload:{}}:{})})).statusCode).toBe(401)
  expect(profiles).not.toHaveBeenCalled();await app.close()
 })
 it('uses the customer CORS/no-store boundary and accepts no target account ID',async()=>{
  const {app,profiles}=fixture()
  const read=await app.inject({url:'/api/v1/customer/maya/profiles',headers:{authorization:'Bearer sample',origin:'https://maya.example'}})
  expect(read.json()).toEqual(body);expect(read.headers['cache-control']).toBe('no-store');expect(profiles).toHaveBeenCalledWith('sample')
  const patch={slot:1,expectedRevision:0,relation:'self',profile:{}}
  await app.inject({method:'POST',url:'/api/v1/customer/maya/profiles',payload:patch,headers:{authorization:'Bearer sample'}})
  expect(profiles).toHaveBeenLastCalledWith('sample',patch)
  expect((await app.inject({url:'/api/v1/customer/maya/profiles',headers:{origin:'https://evil.example',authorization:'Bearer sample'}})).statusCode).toBe(403)
  await app.close()
 })
 it('reports conflicts as 409 and hides internal failures',async()=>{
  const {app,profiles}=fixture();profiles.mockRejectedValueOnce(new CustomerError(409,'MAYA_PROFILE_CONFLICT')).mockRejectedValueOnce(new Error('private'))
  const first=await app.inject({url:'/api/v1/customer/maya/profiles',headers:{authorization:'Bearer sample'}})
  expect(first.statusCode).toBe(409);expect(first.json()).toEqual({error:'MAYA_PROFILE_CONFLICT'})
  const second=await app.inject({url:'/api/v1/customer/maya/profiles',headers:{authorization:'Bearer sample'}})
  expect(second.statusCode).toBe(503);expect(second.body).not.toContain('private');await app.close()
 })
})
