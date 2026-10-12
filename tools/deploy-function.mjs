// Deploys an edge function as a single file through the Management API
// (the multipart deploy endpoint used by the CLI returned 500 for this project).
// The Web Push helper is inlined, so each function is one self-contained file.
// Usage: node tools/deploy-function.mjs <project-ref> [notify|tick]
import { readFileSync } from 'node:fs';

export async function deployFunction(ref, slug, token) {
  const root = new URL('../', import.meta.url);
  const webpush = readFileSync(new URL('supabase/functions/notify/webpush.js', root), 'utf8').replace(/^export /gm, '');
  const index = readFileSync(new URL(`supabase/functions/${slug}/index.ts`, root), 'utf8').replace(/^import \{ sendPush \} from '[^']*webpush\.js';\r?\n/m, '');
  const body = webpush + '\n' + index;
  const H = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
  const base = `https://api.supabase.com/v1/projects/${ref}/functions`;
  const exists = (await fetch(`${base}/${slug}`, { headers: H })).ok;
  const res = await fetch(exists ? `${base}/${slug}` : base, {
    method: exists ? 'PATCH' : 'POST',
    headers: H,
    body: JSON.stringify(exists ? { body, verify_jwt: false } : { slug, name: slug, body, verify_jwt: false }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`deploy ${slug} → ${res.status} ${text.slice(0, 200)}`);
  return exists ? 'aggiornata' : 'creata';
}

if (import.meta.url === `file:///${process.argv[1].replace(/\\/g, '/')}` || process.argv[1].endsWith('deploy-function.mjs')) {
  const [ref, slug = 'notify'] = process.argv.slice(2);
  if (!ref) { console.error('Uso: node tools/deploy-function.mjs <project-ref> [notify|tick]'); process.exit(1); }
  const token = readFileSync(new URL('../.secrets/supabase-token.txt', import.meta.url), 'utf8').trim();
  console.log(slug, await deployFunction(ref, slug, token));
}
