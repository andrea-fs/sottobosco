// One-time backend setup through the Supabase Management API.
// Usage: node tools/setup-supabase.mjs <project-ref> <email1> <email2> [site-url]
// Reads the personal access token from .secrets/supabase-token.txt (never printed).
import { readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const [ref, ...rest] = process.argv.slice(2);
const site = rest.find((a) => a.startsWith('http')) || 'https://andrea-fs.github.io/sottobosco/';
const emails = rest.filter((a) => a.includes('@')).map((e) => e.trim().toLowerCase());
if (!ref || !emails.length) { console.error('Uso: node tools/setup-supabase.mjs <project-ref> <email1> <email2>'); process.exit(1); }
const root = new URL('../', import.meta.url);
const token = readFileSync(new URL('.secrets/supabase-token.txt', root), 'utf8').trim();
const vapid = JSON.parse(readFileSync(new URL('.secrets/vapid.json', root), 'utf8'));
const API = `https://api.supabase.com/v1/projects/${ref}`;

async function call(method, path, body) {
  const res = await fetch(API + path, { method, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
  const text = await res.text();
  if (!res.ok) throw new Error(`${method} ${path} → ${res.status} ${text.slice(0, 300)}`);
  try { return JSON.parse(text); } catch { return text; }
}
const sqlQuote = (s) => `'${s.replace(/'/g, "''")}'`;

console.log('1/5 Tabelle e regole di accesso…');
await call('POST', '/database/query', { query: readFileSync(new URL('supabase/schema.sql', root), 'utf8') });
await call('POST', '/database/query', { query: `insert into public.members(email) values ${emails.map((e) => `(${sqlQuote(e)})`).join(',')} on conflict do nothing;` });

console.log('2/5 Accesso con email e password (senza email di conferma)…');
await call('PATCH', '/config/auth', { external_email_enabled: true, mailer_autoconfirm: true, site_url: site });

console.log('3/5 Chiavi per le notifiche…');
await call('POST', '/secrets', [
  { name: 'VAPID_PUBLIC_KEY', value: vapid.publicKey },
  { name: 'VAPID_PRIVATE_JWK', value: JSON.stringify(vapid.privateJwk) },
  { name: 'VAPID_SUBJECT', value: site },
]);

console.log('4/5 Funzione che manda le notifiche…');
execFileSync('npx', ['--yes', 'supabase@2.118.0', 'functions', 'deploy', 'notify', '--project-ref', ref, '--use-api', '--no-verify-jwt'], {
  cwd: new URL('.', root), stdio: 'inherit', shell: true, env: { ...process.env, SUPABASE_ACCESS_TOKEN: token },
});

console.log('5/5 Collego il sito al database…');
const keys = await call('GET', '/api-keys');
const pub = keys.find((k) => k.type === 'publishable') || keys.find((k) => k.name === 'anon');
if (!pub) throw new Error('Chiave pubblica non trovata');
const cfgPath = new URL('config.js', root);
let cfg = readFileSync(cfgPath, 'utf8');
cfg = cfg.replace(/supabaseUrl: '[^']*'/, `supabaseUrl: 'https://${ref}.supabase.co'`).replace(/supabaseKey: '[^']*'/, `supabaseKey: '${pub.api_key}'`);
writeFileSync(cfgPath, cfg);
console.log('Fatto. Membri:', emails.join(', '));
