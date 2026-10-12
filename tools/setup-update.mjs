// Server update for Nido: Biblioteca tables, end-of-timer notifications, newest notify function.
// Usage: node tools/setup-update.mjs <project-ref>   (token in .secrets/supabase-token.txt)
import { readFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { deployFunction } from './deploy-function.mjs';

const ref = process.argv[2];
if (!ref) { console.error('Uso: node tools/setup-update.mjs <project-ref>'); process.exit(1); }
const root = new URL('../', import.meta.url);
const token = readFileSync(new URL('.secrets/supabase-token.txt', root), 'utf8').trim();
const API = `https://api.supabase.com/v1/projects/${ref}`;
async function call(method, path, body) {
  const res = await fetch(API + path, { method, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
  const text = await res.text();
  if (!res.ok) throw new Error(`${method} ${path} → ${res.status} ${text.slice(0, 300)}`);
  return text;
}
console.log('1/5 Tabelle della Biblioteca…');
await call('POST', '/database/query', { query: readFileSync(new URL('supabase/books.sql', root), 'utf8') });
console.log('2/5 Funzione notify (con il link alla pagina giusta)…', await deployFunction(ref, 'notify', token));
const secret = randomBytes(24).toString('hex');
console.log('3/5 Segreto per il controllo dei timer…');
await call('POST', '/secrets', [{ name: 'TICK_SECRET', value: secret }]);
console.log('4/5 Funzione tick…', await deployFunction(ref, 'tick', token));
console.log('5/5 Tabella timers e controllo ogni minuto…');
await call('POST', '/database/query', { query: readFileSync(new URL('supabase/timers.sql', root), 'utf8').replace(/__TICK_SECRET__/g, secret).replace(/__PROJECT_REF__/g, ref) });
console.log('Fatto.');
