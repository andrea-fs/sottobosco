// Sends a push notification from one member of the forest to the other(s).
// Body: { kind: 'status' | 'invite' | 'auto', text: string }
// 'auto' messages (started/finished a session) respect each recipient's partnerAlerts setting.
import { createClient } from 'npm:@supabase/supabase-js@2.45.4';
import { sendPush } from './webpush.js';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (o: unknown, status = 200) =>
  new Response(JSON.stringify(o), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    const jwt = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
      auth: { persistSession: false },
    });
    const { data: { user }, error } = await admin.auth.getUser(jwt);
    if (error || !user) return json({ error: 'not_signed_in' }, 401);
    const { data: member } = await admin.from('members').select('email').eq('email', (user.email || '').toLowerCase()).maybeSingle();
    if (!member) return json({ error: 'not_member' }, 403);

    const b = await req.json().catch(() => ({}));
    const kind = ['status', 'invite', 'auto'].includes(b.kind) ? b.kind : 'status';
    const text = String(b.text || '').trim().slice(0, 200);
    if (!text) return json({ error: 'empty' }, 400);

    const { data: prof } = await admin.from('profiles').select('name').eq('id', user.id).maybeSingle();
    const name = (prof && prof.name) || 'Sottobosco';
    const { data: subs } = await admin.from('push_subs').select('endpoint,user_id,sub').neq('user_id', user.id);

    const muted = new Set<string>();
    if (kind === 'auto') {
      const { data: forests } = await admin.from('forests').select('user_id,data');
      (forests || []).forEach((f) => { if (f.data?.settings?.partnerAlerts === false) muted.add(f.user_id); });
    }

    const vapid = {
      privateJwk: JSON.parse(Deno.env.get('VAPID_PRIVATE_JWK')!),
      publicKey: Deno.env.get('VAPID_PUBLIC_KEY')!,
      subject: Deno.env.get('VAPID_SUBJECT') || 'https://github.com',
    };
    const payload = JSON.stringify({
      title: kind === 'invite' ? `${name} ti invita` : name,
      body: text,
      tag: `sb-${kind}-${user.id}`,
    });

    let sent = 0;
    const gone: string[] = [];
    await Promise.all((subs || []).filter((s) => !muted.has(s.user_id)).map(async (s) => {
      try {
        const status = await sendPush(s.sub, payload, vapid);
        if (status === 404 || status === 410) gone.push(s.endpoint);
        else if (status < 300) sent++;
        else console.log('push status', status, new URL(s.endpoint).host);
      } catch (e) {
        console.log('push error', String(e));
      }
    }));
    if (gone.length) await admin.from('push_subs').delete().in('endpoint', gone);
    return json({ sent, recipients: (subs || []).length });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
