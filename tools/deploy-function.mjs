// Deploys supabase/functions/notify as a single file through the Management API.
// (The multipart deploy endpoint used by the CLI returned 500 for this project.)
// Usage: node tools/deploy-function.mjs <project-ref>
import { readFileSync } from 'node:fs';

const ref = process.argv[2];
if (!ref) { console.error('Uso: node tools/deploy-function.mjs <project-ref>'); process.exit(1); }
const root = new URL('../', import.meta.url);
const token = readFileSync(new URL('.secrets/supabase-token.txt', root), 'utf8').trim();
const webpush = readFileSync(new URL('supabase/functions/notify/webpush.js', root), 'utf8').replace(/^export /gm, '');
const index = readFileSync(new URL('supabase/functions/notify/index.ts', root), 'utf8').replace(/^import \{ sendPush \} from '\.\/webpush\.js';\r?\n/m, '');
const body = webpush + '\n' + index;
const H = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
const base = `https://api.supabase.com/v1/projects/${ref}/functions`;
const exists = (await fetch(`${base}/notify`, { headers: H })).ok;
const res = await fetch(exists ? `${base}/notify` : base, {
  method: exists ? 'PATCH' : 'POST',
  headers: H,
  body: JSON.stringify(exists ? { body, verify_jwt: false } : { slug: 'notify', name: 'notify', body, verify_jwt: false }),
});
console.log(exists ? 'aggiornata' : 'creata', res.status, (await res.text()).slice(0, 200));
