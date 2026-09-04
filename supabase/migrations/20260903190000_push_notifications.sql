-- =============================================================================
-- Family Location — Notificações push, Android (docs/FEATURES_NEXT_3.md)
-- =============================================================================
-- Fecha a Fase 6 do MVP original (PROJECT.md §25), pendente desde o início. O
-- pipeline: trigger insere em notification_outbox -> pg_net dispara a Edge
-- Function send-push -> Expo Push Service -> FCM. Zero servidor próprio.
--
-- ATENÇÃO — isto sozinho não envia nenhuma notificação. Ainda faltam passos
-- manuais fora do banco (ver o aviso no final da entrega): configurar FCM V1 no
-- Firebase, subir a credencial via `eas credentials`, e fazer o deploy da Edge
-- Function `send-push` (supabase/functions/send-push). Até isso ser feito, as
-- linhas ficam em notification_outbox com status='pending' e nada acontece —
-- inofensivo, só significa que o cano ainda não tem as duas pontas plugadas.
--
-- Como aplicar: cole no SQL Editor do Supabase e rode.
-- =============================================================================

create extension if not exists pg_net;

-- ---------------------------------------------------------------- user_push_tokens
create table if not exists public.user_push_tokens (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.users (id) on delete cascade,
  expo_push_token text not null unique,
  platform        text not null check (platform in ('android', 'ios')),
  device_name     text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists idx_push_tokens_user on public.user_push_tokens (user_id);

alter table public.user_push_tokens enable row level security;

drop policy if exists upt_select on public.user_push_tokens;
create policy upt_select on public.user_push_tokens for select to authenticated
  using (user_id = auth.uid());
drop policy if exists upt_insert on public.user_push_tokens;
create policy upt_insert on public.user_push_tokens for insert to authenticated
  with check (user_id = auth.uid());
drop policy if exists upt_update on public.user_push_tokens;
create policy upt_update on public.user_push_tokens for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists upt_delete on public.user_push_tokens;
create policy upt_delete on public.user_push_tokens for delete to authenticated
  using (user_id = auth.uid());

-- ---------------------------------------------------------------- notification_outbox
-- `type` é texto livre de propósito — um tipo novo nunca precisa de migration.
create table if not exists public.notification_outbox (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.users (id) on delete cascade,
  type       text not null,
  title      text not null,
  body       text not null,
  data       jsonb,
  status     text not null default 'pending' check (status in ('pending', 'sent', 'failed')),
  created_at timestamptz not null default now(),
  sent_at    timestamptz
);
create index if not exists idx_outbox_status on public.notification_outbox (status, created_at);

alter table public.notification_outbox enable row level security;

drop policy if exists outbox_select on public.notification_outbox;
create policy outbox_select on public.notification_outbox for select to authenticated
  using (user_id = auth.uid());

-- Sem policy de insert/update/delete para `authenticated`: só os triggers
-- (security definer) inserem, e a Edge Function (service role, fora da RLS)
-- atualiza o status.

-- ------------------------------------------------------------- dispara a Edge Function
-- pg_net é assíncrono (enfileira e retorna na hora — não trava o INSERT original).
create or replace function public.notify_push_outbox()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform net.http_post(
    url := 'https://cvlkwdzppdaulgqxmqim.supabase.co/functions/v1/send-push',
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body := jsonb_build_object('id', new.id)
  );
  return new;
end
$$;

drop trigger if exists trg_notify_push_outbox on public.notification_outbox;
create trigger trg_notify_push_outbox
  after insert on public.notification_outbox
  for each row execute function public.notify_push_outbox();

-- ------------------------------------------------------------- tipo 1: battery_low
-- Só dispara quando o nível CRUZA 20% pra baixo — não repete enquanto continua
-- baixo (só depois de carregar e cair de novo). Mesmo limite da cor `danger` do
-- badge de bateria (docs/FEATURES_NEXT.md §2) — um número só, duas features.
create or replace function public.notify_battery_low()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name      text;
  v_recipient record;
begin
  if new.battery_level is null or new.battery_level >= 0.20 or new.battery_state = 'charging' then
    return new;
  end if;
  if old.battery_level is not null and old.battery_level < 0.20 then
    return new; -- já tinha cruzado antes; evita notificar de novo enquanto continua baixa
  end if;

  select coalesce(name, email, 'Um familiar') into v_name from public.users where id = new.user_id;

  for v_recipient in
    select distinct b.user_id
    from public.family_group_members a
    join public.family_group_members b on a.family_group_id = b.family_group_id
    where a.user_id = new.user_id and b.user_id != new.user_id
  loop
    insert into public.notification_outbox (user_id, type, title, body, data)
    values (
      v_recipient.user_id, 'battery_low', 'Bateria fraca',
      v_name || ' está com bateria fraca.',
      jsonb_build_object('screen', 'family', 'userId', new.user_id)
    );
  end loop;

  return new;
end
$$;

drop trigger if exists trg_notify_battery_low on public.user_device_status;
create trigger trg_notify_battery_low
  after update on public.user_device_status
  for each row execute function public.notify_battery_low();

-- ------------------------------------------------------------- tipo 2: place_enter
-- v1 só cobre chegada (o próprio place_events.event já filtra por 'enter' aqui).
-- Decisão de produto: notifica todo mundo da família por padrão (opt-out, não
-- opt-in) — place_notifications (preferência por local) ainda não tem tela de
-- configuração; quando existir, é só trocar o filtro abaixo por
-- `notify_on_enter = true`, a tabela já existe.
create or replace function public.notify_place_enter()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name      text;
  v_recipient record;
begin
  if new.event != 'enter' then
    return new;
  end if;

  select coalesce(name, email, 'Um familiar') into v_name from public.users where id = new.user_id;

  for v_recipient in
    select fgm.user_id
    from public.family_group_members fgm
    where fgm.family_group_id = new.family_group_id and fgm.user_id != new.user_id
  loop
    insert into public.notification_outbox (user_id, type, title, body, data)
    values (
      v_recipient.user_id, 'place_enter', 'Chegada',
      v_name || ' chegou em ' || new.place_name || '.',
      jsonb_build_object('screen', 'presence', 'familyId', new.family_group_id)
    );
  end loop;

  return new;
end
$$;

drop trigger if exists trg_notify_place_enter on public.place_events;
create trigger trg_notify_place_enter
  after insert on public.place_events
  for each row execute function public.notify_place_enter();
