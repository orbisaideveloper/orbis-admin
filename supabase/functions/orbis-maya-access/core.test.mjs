import test from 'node:test';
import assert from 'node:assert/strict';
import { decideAccess } from './core.mjs';
const input={version:'maya.access.v1',sourceProjectId:'foundation',authIssuer:'https://auth.example',userId:'11111111-1111-4111-8111-111111111111',projectId:'orbis-maya',capability:'general.chat'};
const identity='11111111-1111-7111-8111-111111111111';
test('requires the exact service, issuer and allowed customer capability before lookup',async()=>{
 for(const change of [{sourceProjectId:'other'},{capability:'development.deploy'},{authIssuer:'http://auth.example'},{authIssuer:'https://auth.example/path'},{userId:'invalid'},{extra:true},{projectId:'orbis-admin'}]){
  assert.equal(await decideAccess({...input,...change},'foundation',()=>{throw Error('must not query')}),null);
 }
});
test('allows one canonical person binding and denies absent, invalid or ambiguous membership',async()=>{
 const permitted=await decideAccess(input,'foundation',async()=>[identity]);
 assert.equal(permitted.allowed,true);assert.equal(permitted.orbisIdentityId,identity);
 for(const identities of [[],[identity,identity],[input.userId]])assert.equal((await decideAccess(input,'foundation',async()=>identities)).allowed,false);
});
test('policy failures propagate for the endpoint to return an unavailable response',async()=>{
 await assert.rejects(decideAccess(input,'foundation',async()=>{throw Error('unavailable')}));
});
