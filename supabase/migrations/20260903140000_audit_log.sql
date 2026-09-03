-- =============================================================================
-- Family Location — Log de auditoria da família (docs/FEATURES_NEXT.md, item 3)
-- =============================================================================
-- Lógica de negócio no banco, não no app (§20 do PROJECT.md, mesmo padrão de
-- create_family_group/accept_invite): triggers SECURITY DEFINER garantem que TODA
-- remoção de membro ou exclusão de local gera log, mesmo que aconteça por uma via
-- que não passou por src/services/family ou src/services/places.
--
-- Como aplicar: cole no SQL Editor do Supabase e rode.
-- =============================================================================

create table if not exists public.family_audit_log (
  id              uuid primary key default gen_random_uuid(),
  family_group_id uuid not null references public.family_groups (id) on delete cascade,
  actor_user_id   uuid references public.users (id) on delete set null,
  action          text not null check (action in (
    'family_created', 'family_renamed', 'invite_created',
    'member_joined', 'member_left', 'member_removed', 'member_role_changed',
    'place_created', 'place_updated', 'place_deleted'
  )),
  target_user_id  uuid references public.users (id) on delete set null,
  metadata        jsonb not null default '{}'::jsonb,
  created_at      timestamptz not null default now()
);
create index if not exists idx_audit_family on public.family_audit_log (family_group_id, created_at desc);

alter table public.family_audit_log enable row level security;

-- Todos os membros veem (decisão de transparência) — nenhuma policy de escrita
-- para `authenticated`: só os triggers abaixo (security definer) escrevem.
drop policy if exists audit_select on public.family_audit_log;
create policy audit_select on public.family_audit_log for select to authenticated
  using (public.is_group_member(family_group_id));

-- =============================================================================
-- Triggers
-- =============================================================================

-- family_groups: renomeação.
create or replace function public.log_family_renamed()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.name is distinct from old.name then
    insert into public.family_audit_log (family_group_id, actor_user_id, action, metadata)
    values (new.id, auth.uid(), 'family_renamed', jsonb_build_object('old_name', old.name, 'new_name', new.name));
  end if;
  return new;
end
$$;

drop trigger if exists trg_log_family_renamed on public.family_groups;
create trigger trg_log_family_renamed
  after update of name on public.family_groups
  for each row execute function public.log_family_renamed();

-- family_group_invites: convite gerado.
create or replace function public.log_invite_created()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.family_audit_log (family_group_id, actor_user_id, action, metadata)
  values (new.family_group_id, new.created_by, 'invite_created', '{}'::jsonb);
  return new;
end
$$;

drop trigger if exists trg_log_invite_created on public.family_group_invites;
create trigger trg_log_invite_created
  after insert on public.family_group_invites
  for each row execute function public.log_invite_created();

-- family_group_members: entrou na família (criação da família inclui a inserção do
-- owner, então cobre "criar família" sem precisar de um log separado).
create or replace function public.log_member_joined()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.family_audit_log (family_group_id, actor_user_id, target_user_id, action, metadata)
  values (new.family_group_id, new.user_id, new.user_id, 'member_joined', jsonb_build_object('role', new.role));
  return new;
end
$$;

drop trigger if exists trg_log_member_joined on public.family_group_members;
create trigger trg_log_member_joined
  after insert on public.family_group_members
  for each row execute function public.log_member_joined();

-- family_group_members: papel alterado.
create or replace function public.log_member_role_changed()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role is distinct from old.role then
    insert into public.family_audit_log (family_group_id, actor_user_id, target_user_id, action, metadata)
    values (new.family_group_id, auth.uid(), new.user_id, 'member_role_changed',
      jsonb_build_object('old_role', old.role, 'new_role', new.role));
  end if;
  return new;
end
$$;

drop trigger if exists trg_log_member_role_changed on public.family_group_members;
create trigger trg_log_member_role_changed
  after update of role on public.family_group_members
  for each row execute function public.log_member_role_changed();

-- family_group_members: saiu (o próprio) ou foi removido (por outro).
create or replace function public.log_member_removed()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_action text;
begin
  if auth.uid() is not distinct from old.user_id then
    v_action := 'member_left';
  else
    v_action := 'member_removed';
  end if;
  insert into public.family_audit_log (family_group_id, actor_user_id, target_user_id, action, metadata)
  values (old.family_group_id, auth.uid(), old.user_id, v_action, jsonb_build_object('role', old.role));
  return old;
end
$$;

drop trigger if exists trg_log_member_removed on public.family_group_members;
create trigger trg_log_member_removed
  after delete on public.family_group_members
  for each row execute function public.log_member_removed();

-- saved_places: criado.
create or replace function public.log_place_created()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.family_audit_log (family_group_id, actor_user_id, action, metadata)
  values (new.family_group_id, auth.uid(), 'place_created', jsonb_build_object('name', new.name, 'icon', new.icon));
  return new;
end
$$;

drop trigger if exists trg_log_place_created on public.saved_places;
create trigger trg_log_place_created
  after insert on public.saved_places
  for each row execute function public.log_place_created();

-- saved_places: editado (metadata guarda os campos que mudaram).
create or replace function public.log_place_updated()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_changes jsonb := '{}'::jsonb;
begin
  if new.name is distinct from old.name then
    v_changes := v_changes || jsonb_build_object('name', jsonb_build_object('old', old.name, 'new', new.name));
  end if;
  if new.latitude is distinct from old.latitude or new.longitude is distinct from old.longitude then
    v_changes := v_changes || jsonb_build_object('coordinate', true);
  end if;
  if new.radius is distinct from old.radius then
    v_changes := v_changes || jsonb_build_object('radius', jsonb_build_object('old', old.radius, 'new', new.radius));
  end if;
  if new.icon is distinct from old.icon then
    v_changes := v_changes || jsonb_build_object('icon', jsonb_build_object('old', old.icon, 'new', new.icon));
  end if;

  if v_changes = '{}'::jsonb then
    return new;
  end if;

  insert into public.family_audit_log (family_group_id, actor_user_id, action, metadata)
  values (new.family_group_id, auth.uid(), 'place_updated',
    jsonb_build_object('name', new.name, 'icon', new.icon, 'changes', v_changes));
  return new;
end
$$;

drop trigger if exists trg_log_place_updated on public.saved_places;
create trigger trg_log_place_updated
  after update on public.saved_places
  for each row execute function public.log_place_updated();

-- saved_places: apagado (metadata guarda nome/ícone via OLD, já que a linha some).
create or replace function public.log_place_deleted()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.family_audit_log (family_group_id, actor_user_id, action, metadata)
  values (old.family_group_id, auth.uid(), 'place_deleted', jsonb_build_object('name', old.name, 'icon', old.icon));
  return old;
end
$$;

drop trigger if exists trg_log_place_deleted on public.saved_places;
create trigger trg_log_place_deleted
  after delete on public.saved_places
  for each row execute function public.log_place_deleted();
