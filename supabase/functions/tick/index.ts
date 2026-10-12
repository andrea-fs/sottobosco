// Called every minute by pg_cron: pushes "your timer is over" to the owner of each due timer.
import { sendPush } from '../notify/webpush.js';

const URL_ = Deno.env.get('SUPABASE_URL');
const KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const admin = { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' };
async function rest(path, init = {}) {
  const res = await fetch(`${URL_}/rest/v1/${path}`, { ...init, headers: { ...admin, ...(init.headers || {}) } });
  if (!res.ok) throw new Error(`rest ${path.split('?')[0]} ${res.status}`);
  const t = await res.text();
  return t ? JSON.parse(t) : null;
}

Deno.serve(async (req) => {
  if (req.headers.get('x-tick-secret') !== Deno.env.get('TICK_SECRET')) return new Response('no', { status: 403 });
  try {
    const due = (await rest(`timers?select=*&end_at=lte.${encodeURIComponent(new Date().toISOString())}`)) || [];
    if (!due.length) return new Response(JSON.stringify({ due: 0 }));
    const vapid = {
      privateJwk: JSON.parse(Deno.env.get('VAPID_PRIVATE_JWK')),
      publicKey: Deno.env.get('VAPID_PUBLIC_KEY'),
      subject: Deno.env.get('VAPID_SUBJECT') || 'https://github.com',
    };
    let sent = 0;
    for (const t of due) {
      // delete first so a slow push never sends twice
      await rest(`timers?user_id=eq.${t.user_id}&end_at=eq.${encodeURIComponent(t.end_at)}`, { method: 'DELETE' });
      const subs = (await rest(`push_subs?select=endpoint,sub&user_id=eq.${t.user_id}`)) || [];
      const payload = JSON.stringify({ title: t.title, body: t.body, tag: 'sb-end', url: 'forest.html' });
      for (const s of subs) {
        try {
          const status = await sendPush(s.sub, payload, vapid, 600);
          if (status === 404 || status === 410) await rest(`push_subs?endpoint=eq.${encodeURIComponent(s.endpoint)}`, { method: 'DELETE' });
          else if (status < 300) sent++;
        } catch (e) { console.log('push error', String(e)); }
      }
    }
    return new Response(JSON.stringify({ due: due.length, sent }));
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500 });
  }
});
