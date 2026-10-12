// Sends a push notification from one member of the forest to the other(s).
// Body: { kind: 'status' | 'invite' | 'auto', text: string }
// 'auto' messages (started/finished a session) respect each recipient's partnerAlerts setting.
// Dependency-free on purpose: talks to Auth and PostgREST with fetch.
import { sendPush } from './webpush.js';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

const URL_ = Deno.env.get('SUPABASE_URL');
const KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const admin = { apikey: KEY, Authorization: `Bearer ${KEY}` };
async function rest(path, init = {}) {
  const res = await fetch(`${URL_}/rest/v1/${path}`, { ...init, headers: { ...admin, 'Content-Type': 'application/json', ...(init.headers || {}) } });
  if (!res.ok) throw new Error(`rest ${path.split('?')[0]} ${res.status}`);
  const t = await res.text();
  return t ? JSON.parse(t) : null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    const jwt = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
    const ures = await fetch(`${URL_}/auth/v1/user`, { headers: { apikey: KEY, Authorization: `Bearer ${jwt}` } });
    if (!ures.ok) return json({ error: 'not_signed_in' }, 401);
    const user = await ures.json();
    const email = String(user.email || '').toLowerCase();
    const member = await rest(`members?select=email&email=eq.${encodeURIComponent(email)}`);
    if (!member || !member.length) return json({ error: 'not_member' }, 403);

    const b = await req.json().catch(() => ({}));
    const kind = ['status', 'invite', 'auto'].includes(b.kind) ? b.kind : 'status';
    const text = String(b.text || '').trim().slice(0, 200);
    if (!text) return json({ error: 'empty' }, 400);

    const prof = await rest(`profiles?select=name&id=eq.${user.id}`);
    const name = (prof && prof[0] && prof[0].name) || 'Sottobosco';
    const subs = (await rest(`push_subs?select=endpoint,user_id,sub&user_id=neq.${user.id}`)) || [];

    const muted = new Set();
    if (kind === 'auto') {
      const forests = (await rest('forests?select=user_id,data')) || [];
      forests.forEach((f) => { if (f.data && f.data.settings && f.data.settings.partnerAlerts === false) muted.add(f.user_id); });
    }

    const vapid = {
      privateJwk: JSON.parse(Deno.env.get('VAPID_PRIVATE_JWK')),
      publicKey: Deno.env.get('VAPID_PUBLIC_KEY'),
      subject: Deno.env.get('VAPID_SUBJECT') || 'https://github.com',
    };
    const url = typeof b.url === 'string' && /^[a-z0-9._-]*\.html(#[a-z0-9=-]*)?$/i.test(b.url) ? b.url : undefined;
    const payload = JSON.stringify({ title: kind === 'invite' ? `${name} ti invita` : name, body: text, tag: `sb-${kind}-${user.id}`, url });

    let sent = 0;
    const gone = [];
    await Promise.all(subs.filter((s) => !muted.has(s.user_id)).map(async (s) => {
      try {
        const status = await sendPush(s.sub, payload, vapid);
        if (status === 404 || status === 410) gone.push(s.endpoint);
        else if (status < 300) sent++;
        else console.log('push status', status, new URL(s.endpoint).host);
      } catch (e) {
        console.log('push error', String(e));
      }
    }));
    for (const ep of gone) await rest(`push_subs?endpoint=eq.${encodeURIComponent(ep)}`, { method: 'DELETE' }).catch(() => {});
    return json({ sent, recipients: subs.length });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
