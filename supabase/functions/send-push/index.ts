// supabase/functions/send-push — Edge Function (Deno), chamada só internamente por
// um trigger em notification_outbox (via pg_net), nunca por um usuário final.
//
// Deploy manual (não automatizável daqui — precisa da CLI do Supabase logada com a
// conta do projeto):
//   supabase functions deploy send-push --no-verify-jwt
//
// (--no-verify-jwt porque o pg_net não manda um JWT de usuário — a autenticação
// real acontece do lado de dentro, usando a SUPABASE_SERVICE_ROLE_KEY que o Supabase
// injeta automaticamente no ambiente da function.)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

interface ExpoTicket {
  status: 'ok' | 'error';
  details?: { error?: string };
}

Deno.serve(async (req: Request) => {
  try {
    const { id } = await req.json();
    if (!id) return new Response('missing id', { status: 400 });

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    const { data: outboxRow, error: outboxError } = await supabase
      .from('notification_outbox')
      .select('*')
      .eq('id', id)
      .single();

    if (outboxError || !outboxRow) {
      return new Response('notification not found', { status: 404 });
    }
    if (outboxRow.status !== 'pending') {
      return new Response('already processed', { status: 200 });
    }

    const { data: tokens } = await supabase
      .from('user_push_tokens')
      .select('expo_push_token')
      .eq('user_id', outboxRow.user_id);

    if (!tokens || tokens.length === 0) {
      await supabase
        .from('notification_outbox')
        .update({ status: 'failed', sent_at: new Date().toISOString() })
        .eq('id', id);
      return new Response('no tokens', { status: 200 });
    }

    const messages = tokens.map((t: { expo_push_token: string }) => ({
      to: t.expo_push_token,
      title: outboxRow.title,
      body: outboxRow.body,
      data: outboxRow.data ?? {},
    }));

    const expoRes = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(messages),
    });
    const expoJson = await expoRes.json();
    const tickets: ExpoTicket[] = expoJson?.data ?? [];

    // Limpa tokens que o Expo reportou como mortos (app desinstalado, etc.).
    for (let i = 0; i < tickets.length; i++) {
      const ticket = tickets[i];
      if (ticket.status === 'error' && ticket.details?.error === 'DeviceNotRegistered') {
        await supabase.from('user_push_tokens').delete().eq('expo_push_token', messages[i].to);
      }
    }

    await supabase
      .from('notification_outbox')
      .update({ status: 'sent', sent_at: new Date().toISOString() })
      .eq('id', id);

    return new Response('ok', { status: 200 });
  } catch (err) {
    return new Response(`error: ${err instanceof Error ? err.message : 'unknown'}`, { status: 500 });
  }
});
