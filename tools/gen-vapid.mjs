// Creates the VAPID key pair used to sign push notifications.
// Writes .secrets/vapid.json (never commit it) and prints the public key for config.js.
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { b64u } from '../supabase/functions/notify/webpush.js';

const out = new URL('../.secrets/vapid.json', import.meta.url);
if (existsSync(out)) {
  console.log('.secrets/vapid.json esiste già: non lo sovrascrivo.');
  process.exit(0);
}
const pair = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
const privateJwk = await crypto.subtle.exportKey('jwk', pair.privateKey);
const publicKey = b64u.enc(await crypto.subtle.exportKey('raw', pair.publicKey));
mkdirSync(new URL('../.secrets/', import.meta.url), { recursive: true });
writeFileSync(out, JSON.stringify({ publicKey, privateJwk }, null, 2));
console.log('VAPID public key:', publicKey);
