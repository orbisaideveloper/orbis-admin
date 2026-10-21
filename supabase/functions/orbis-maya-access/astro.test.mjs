import test from 'node:test';
import assert from 'node:assert/strict';
import {decideAccess} from './core.mjs';
test('astro discussion still needs the exact account and explicit capability grant',async()=>{
 const input={version:'maya.access.v1',sourceProjectId:'foundation',authIssuer:'https://auth.example',userId:'11111111-1111-4111-8111-111111111111',projectId:'orbis-maya',capability:'astro.interpretation'};
 const identity='11111111-1111-7111-8111-111111111111';
 assert.equal((await decideAccess(input,'foundation',async()=>[identity])).allowed,true);
 assert.equal((await decideAccess(input,'foundation',async()=>[])).allowed,false);
});
