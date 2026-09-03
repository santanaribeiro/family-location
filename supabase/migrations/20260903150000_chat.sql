-- =============================================================================
-- Family Location — Chat da família (docs/FEATURES_NEXT.md, item 4)
-- =============================================================================
-- Sem push notification na v1 (infra de push é a Fase 6 do PROJECT.md, não
-- construída ainda) — mensagem só aparece via Realtime com o app aberto, ou ao
-- reabrir o app depois.
--
-- Como aplicar: cole no SQL Editor do Supabase e rode.
-- =============================================================================

create table if not exists public.family_messages (
  id              uuid primary key default gen_random_uuid(),
  family_group_id uuid not null references public.family_groups (id) on delete cascade,
  user_id         uuid references public.users (id) on delete set null,
  body            text not null check (char_length(body) between 1 and 2000),
  deleted_at      timestamptz,
  created_at      timestamptz not null default now()
);
create index if not exists idx_messages_family on public.family_messages (family_group_id, created_at desc);

alter table public.family_messages enable row level security;

drop policy if exists msg_select on public.family_messages;
create policy msg_select on public.family_messages for select to authenticated
  using (public.is_group_member(family_group_id));

drop policy if exists msg_insert on public.family_messages;
create policy msg_insert on public.family_messages for insert to authenticated
  with check (public.is_group_member(family_group_id) and user_id = auth.uid());

-- Sem policy de update/delete para `authenticated`: apagar (soft delete) só passa
-- pela RPC abaixo — evita expor um UPDATE livre que poderia reescrever o corpo da
-- mensagem em vez de só marcar deleted_at.

-- Apaga a própria mensagem, ou (owner/admin) a de qualquer membro — moderação básica.
create or replace function public.delete_message(p_id uuid)
returns public.family_messages
language plpgsql
security definer
set search_path = public
as $$
declare
  m public.family_messages;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  select * into m from public.family_messages where id = p_id for update;
  if m.id is null then
    raise exception 'message not found';
  end if;

  if not (
    m.user_id = auth.uid()
    or public.has_group_role(m.family_group_id, array['owner', 'admin']::public.family_role[])
  ) then
    raise exception 'not authorized';
  end if;

  update public.family_messages set deleted_at = coalesce(deleted_at, now()) where id = p_id
  returning * into m;

  return m;
end
$$;

grant execute on function public.delete_message(uuid) to authenticated;

do $$
begin
  alter publication supabase_realtime add table public.family_messages;
exception when duplicate_object then null; end
$$;
