// Server update for the Atlante: places, trips, photos, home and the private photo bucket.
// Usage: node tools/setup-atlas.mjs <project-ref>   (token in .secrets/supabase-token.txt)
import { readFileSync } from 'node:fs';
const ref = process.argv[2];
if (!ref) { console.error('Uso: node tools/setup-atlas.mjs <project-ref>'); process.exit(1); }
const root = new URL('../', import.meta.url);
const token = readFileSync(new URL('.secrets/supabase-token.txt', root), 'utf8').trim();
const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
  method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ query: readFileSync(new URL('supabase/atlas.sql', root), 'utf8') }),
});
if (!res.ok) { console.error('Errore', res.status, (await res.text()).slice(0, 400)); process.exit(1); }
console.log('Atlante pronto sul server.');
