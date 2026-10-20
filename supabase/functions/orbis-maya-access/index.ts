import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import postgres from 'npm:postgres@3.4.7'
import { decideAccess } from './core.mjs'
const json = (status:number, body:unknown) => new Response(JSON.stringify(body), {
  status, headers: {'content-type':'application/json','cache-control':'no-store','x-content-type-options':'nosniff'},
})
Deno.serve(async request => {
  if(request.method!=='POST')return json(405,{error:'method_not_allowed'})
  const key=request.headers.get('x-orbis-service-key')?.trim()
  if(!key)return json(401,{error:'service_key_required'})
  if(!request.headers.get('content-type')?.startsWith('application/json'))return json(400,{error:'json_required'})
  let body:unknown
  try {
    const reader=request.body?.getReader();if(!reader)return json(400,{error:'invalid_request'})
    const chunks:Uint8Array[]=[];let size=0
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      size += value.length;
      if (size > 4096) {
        await reader.cancel();
        return json(413, { error: 'input_too_large' });
      }
      chunks.push(value);
    }
    const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length}
    body=JSON.parse(new TextDecoder().decode(bytes))
  }catch{return json(400,{error:'invalid_request'})}
  const databaseUrl=Deno.env.get('SUPABASE_DB_URL')
  if(!databaseUrl)return json(503,{error:'policy_unavailable'})
  const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(key))
  const keyHash=[...new Uint8Array(digest)].map(byte=>byte.toString(16).padStart(2,'0')).join('')
  const sql=postgres(databaseUrl,{max:1,prepare:false,idle_timeout:2,connect_timeout:5})
  try {
    const sources=await sql`select source_project_id as project_id, auth_issuer from orbis_membership.maya_service_keys where key_hash=${keyHash} and revoked_at is null limit 1`
    if(sources.length!==1)return json(403,{error:'service_key_not_authorized'})
    const result=await decideAccess(body,sources[0].project_id,async (input:{sourceProjectId:string;authIssuer:string;userId:string;projectId:string;capability:string})=>{
      if(sources[0].auth_issuer!==input.authIssuer)return []
      await sql`select orbis_membership.enroll_maya_user(${keyHash},${input.authIssuer},${input.userId}::uuid)`
      const rows=await sql`
        select g.orbis_identity_id from orbis_membership.maya_grants g
        join orbis_identity.identities i using(orbis_identity_id)
        where g.source_project_id=${input.sourceProjectId} and g.auth_issuer=${input.authIssuer}
          and g.auth_user_id=${input.userId}::uuid and g.project_id=${input.projectId}
          and g.capability=${input.capability} and g.enabled and g.expires_at>now()
          and i.lifecycle in ('active','provisional') and i.subject_kind='person'
          and exists(select 1 from orbis_identity.product_references p
            where p.orbis_identity_id=g.orbis_identity_id and p.project_id=g.source_project_id
              and p.local_entity_type='user' and p.local_entity_id=g.auth_user_id::text and p.revoked_at is null)
        limit 2`
      return rows.map(row=>row.orbis_identity_id)
    })
    return result?json(200,result):json(400,{error:'invalid_request'})
  }catch{return json(503,{error:'policy_unavailable'})}
  finally{await sql.end({timeout:1})}
})
