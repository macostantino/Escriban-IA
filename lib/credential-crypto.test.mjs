import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import {sealCredentials,openCredentials} from './credential-crypto.ts';
test('credentials round trip without exposing plaintext and use fresh nonces',async()=>{const key=randomBytes(32).toString('base64'),value={email:'test@example.org',password:'test-only-secret'};const one=await sealCredentials(value,'owner-a',key),two=await sealCredentials(value,'owner-a',key);assert.notEqual(one,two);assert.ok(!one.includes(value.password));assert.ok(!one.includes(value.email));assert.deepEqual(await openCredentials(one,'owner-a',key),value)});
test('rejects another owner, wrong key and tampered encrypted data',async()=>{const key=randomBytes(32).toString('base64'),sealed=await sealCredentials({email:'test@example.org',password:'test-only'},'owner-a',key);await assert.rejects(openCredentials(sealed,'owner-b',key));await assert.rejects(openCredentials(sealed,'owner-a',randomBytes(32).toString('base64')));const changed=JSON.parse(sealed);changed.data=(changed.data[0]==='A'?'B':'A')+changed.data.slice(1);await assert.rejects(openCredentials(JSON.stringify(changed),'owner-a',key))});
