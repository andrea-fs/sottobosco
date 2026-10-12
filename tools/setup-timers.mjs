// Adds end-of-timer notifications to an existing setup: timers table, cron job, `tick` function.
// Usage: node tools/setup-timers.mjs <project-ref>   (token in .secrets/supabase-token.txt)
import { readFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { deployFunction } from './deploy-function.mjs';

const ref = process.argv[2];
if (!ref) { console.error('Uso: node tools/setup-timers.mjs <project-ref>'); process.exit(1); }
const root = new URL('../', import.meta.url);
const token = readFileSync(new URL('.secrets/supabase-token.txt', root), 'utf8').trim();
const API = `https://api.supabase.com/v1/projects/${ref}`;
const H = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
async function call(method, path, body) {
  const res = await fetch(API + path, { method, headers: H, body: body ? JSON.stringify(body) : undefined });
  const text = await res.text();
  if (!res.ok) throw new Error(`${method} ${path} → ${res.status} ${text.slice(0, 300)}`);
  return text;
}
const secret = randomBytes(24).toString('hex');
console.log('1/3 Segreto per il controllo ogni minuto…');
await call('POST', '/secrets', [{ name: 'TICK_SECRET', value: secret }]);
console.log('2/3 Funzione tick…', await deployFunction(ref, 'tick', token));
console.log('3/3 Tabella timers e controllo ogni minuto…');
const sql = readFileSync(new URL('supabase/timers.sql', root), 'utf8').replace(/__TICK_SECRET__/g, secret).replace(/__PROJECT_REF__/g, ref);
await call('POST', '/database/query', { query: sql });
console.log('Fatto.');
