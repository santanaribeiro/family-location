-- =============================================================================
-- Family Location — Migration inicial (Fase 1): schema + RLS
-- =============================================================================
-- Como aplicar:
--   Opção A (Supabase CLI):  supabase db push   (com o projeto linkado)
--   Opção B (Dashboard):     cole este arquivo no SQL Editor do projeto e rode.
--
-- Depende do Supabase Auth (tabela auth.users). Toda a autorização é feita via
-- RLS no banco — nunca confie apenas no cliente (PROJECT.md §20).
-- =============================================================================

-- ------------------------------------------------------------------ extensões
create extension if not exists pgcrypto;      -- gen_random_uuid(), gen_random_bytes()

-- ---------------------------------------------------------------------- enums
do $$
begin
  create type public.family_role as enum ('owner', 'admin', 'member');
exception
  when duplicate_object then null;
end
$$;

-- =============================================================================
-- Tabelas
-- =============================================================================

-- Perfil do usuário (espelha auth.users; usa o id do Supabase Auth como PK).
create table if not exists public.users (
  id         uuid primary key references auth.users (id) on delete cascade,
  name       text,
  email      text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Famílias/grupos.
create table if not exists public.family_groups (
  id         uuid primary key default gen_random_uuid(),
  name       text not null check (char_length(name) between 1 and 120),
  created_by uuid references public.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Vínculo usuário ↔ família (com papel). Um usuário participa de N famílias.
create table if not exists public.family_group_members (
  id              uuid primary key default gen_random_uuid(),
  family_group_id uuid not null references public.family_groups (id) on delete cascade,
  user_id         uuid not null references public.users (id) on delete cascade,
  role            public.family_role not null default 'member',
  joined_at       timestamptz not null default now(),
  unique (family_group_id, user_id)
);
create index if not exists idx_fgm_user  on public.family_group_members (user_id);
create index if not exists idx_fgm_group on public.family_group_members (family_group_id);

-- Convites por link (token aleatório, não sequencial; §9/§20).
create table if not exists public.family_group_invites (
  id              uuid primary key default gen_random_uuid(),
  family_group_id uuid not null references public.family_groups (id) on delete cascade,
  token           text not null unique default encode(gen_random_bytes(24), 'hex'),
  created_by      uuid references public.users (id) on delete set null,
  expires_at      timestamptz,
  used_at         timestamptz,
  created_at      timestamptz not null default now()
);

-- Última localização conhecida (uma linha por usuário — sem histórico no MVP).
create table if not exists public.user_locations (
  user_id     uuid primary key references public.users (id) on delete cascade,
  latitude    double precision not null,
  longitude   double precision not null,
  accuracy    double precision,
  altitude    double precision,
  speed       double precision,
  heading     double precision,
  recorded_at timestamptz not null default now()
);

-- Locais salvos (pertencem à FAMÍLIA, não ao usuário; §14).
create table if not exists public.saved_places (
  id              uuid primary key default gen_random_uuid(),
  family_group_id uuid not null references public.family_groups (id) on delete cascade,
  name            text not null check (char_length(name) between 1 and 120),
  latitude        double precision not null,
  longitude       double precision not null,
  radius          integer not null default 100 check (radius between 10 and 100000),
  icon            text,
  created_by      uuid references public.users (id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists idx_saved_places_group on public.saved_places (family_group_id);

-- Preferências de notificação por membro/local (§17).
create table if not exists public.place_notifications (
  id              uuid primary key default gen_random_uuid(),
  saved_place_id  uuid not null references public.saved_places (id) on delete cascade,
  user_id         uuid not null references public.users (id) on delete cascade,
  notify_on_enter boolean not null default true,
  notify_on_exit  boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (saved_place_id, user_id)
);

-- =============================================================================
-- Funções utilitárias
-- =============================================================================

-- updated_at automático.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end
$$;

drop trigger if exists trg_users_updated             on public.users;
drop trigger if exists trg_family_groups_updated      on public.family_groups;
drop trigger if exists trg_saved_places_updated       on public.saved_places;
drop trigger if exists trg_place_notifications_updated on public.place_notifications;

create trigger trg_users_updated              before update on public.users              for each row execute function public.set_updated_at();
create trigger trg_family_groups_updated      before update on public.family_groups       for each row execute function public.set_updated_at();
create trigger trg_saved_places_updated       before update on public.saved_places        for each row execute function public.set_updated_at();
create trigger trg_place_notifications_updated before update on public.place_notifications for each row execute function public.set_updated_at();

-- Cria o perfil em public.users quando um usuário do Auth é criado (login Google).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, name, email, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    new.email,
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do update
    set email      = excluded.email,
        name       = coalesce(public.users.name, excluded.name),
        avatar_url = coalesce(excluded.avatar_url, public.users.avatar_url);
  return new;
end
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Helpers SECURITY DEFINER — evitam recursão de RLS ao consultar a tabela de membros.
create or replace function public.is_group_member(p_group uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.family_group_members m
    where m.family_group_id = p_group and m.user_id = auth.uid()
  );
$$;

create or replace function public.has_group_role(p_group uuid, p_roles public.family_role[])
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.family_group_members m
    where m.family_group_id = p_group
      and m.user_id = auth.uid()
      and m.role = any (p_roles)
  );
$$;

-- auth.uid() compartilha alguma família com p_user?
create or replace function public.shares_family_with(p_user uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.family_group_members a
    join public.family_group_members b on a.family_group_id = b.family_group_id
    where a.user_id = auth.uid() and b.user_id = p_user
  );
$$;

-- =============================================================================
-- RPCs (SECURITY DEFINER) para operações que precisam furar a RLS com segurança
-- =============================================================================

-- Cria uma família e já vincula o criador como owner (atômico).
create or replace function public.create_family_group(p_name text)
returns public.family_groups
language plpgsql
security definer
set search_path = public
as $$
declare
  g public.family_groups;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  insert into public.family_groups (name, created_by)
  values (p_name, auth.uid())
  returning * into g;

  insert into public.family_group_members (family_group_id, user_id, role)
  values (g.id, auth.uid(), 'owner');

  return g;
end
$$;

-- Aceita um convite válido (não expirado/não usado) e adiciona o usuário como member.
create or replace function public.accept_invite(p_token text)
returns public.family_group_members
language plpgsql
security definer
set search_path = public
as $$
declare
  inv public.family_group_invites;
  mem public.family_group_members;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  select * into inv
  from public.family_group_invites
  where token = p_token
  for update;

  if inv.id is null then
    raise exception 'invite not found';
  end if;
  if inv.used_at is not null then
    raise exception 'invite already used';
  end if;
  if inv.expires_at is not null and inv.expires_at < now() then
    raise exception 'invite expired';
  end if;

  insert into public.family_group_members (family_group_id, user_id, role)
  values (inv.family_group_id, auth.uid(), 'member')
  on conflict (family_group_id, user_id) do update set role = public.family_group_members.role
  returning * into mem;

  update public.family_group_invites set used_at = now() where id = inv.id;

  return mem;
end
$$;

grant execute on function public.create_family_group(text) to authenticated;
grant execute on function public.accept_invite(text)       to authenticated;

-- =============================================================================
-- Row Level Security
-- =============================================================================
alter table public.users                 enable row level security;
alter table public.family_groups          enable row level security;
alter table public.family_group_members   enable row level security;
alter table public.family_group_invites   enable row level security;
alter table public.user_locations         enable row level security;
alter table public.saved_places           enable row level security;
alter table public.place_notifications    enable row level security;

-- users: vê a si mesmo e a membros das famílias que compartilha; edita só o próprio perfil.
drop policy if exists users_select on public.users;
create policy users_select on public.users for select to authenticated
  using (id = auth.uid() or public.shares_family_with(id));

drop policy if exists users_update on public.users;
create policy users_update on public.users for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- family_groups: membros veem; qualquer autenticado cria (via RPC); owner altera/remove.
drop policy if exists fg_select on public.family_groups;
create policy fg_select on public.family_groups for select to authenticated
  using (public.is_group_member(id));

drop policy if exists fg_insert on public.family_groups;
create policy fg_insert on public.family_groups for insert to authenticated
  with check (created_by = auth.uid());

drop policy if exists fg_update on public.family_groups;
create policy fg_update on public.family_groups for update to authenticated
  using (public.has_group_role(id, array['owner']::public.family_role[]))
  with check (public.has_group_role(id, array['owner']::public.family_role[]));

drop policy if exists fg_delete on public.family_groups;
create policy fg_delete on public.family_groups for delete to authenticated
  using (public.has_group_role(id, array['owner']::public.family_role[]));

-- family_group_members: membros veem o grupo; owner/admin gerenciam; o próprio pode sair.
drop policy if exists fgm_select on public.family_group_members;
create policy fgm_select on public.family_group_members for select to authenticated
  using (public.is_group_member(family_group_id));

drop policy if exists fgm_insert on public.family_group_members;
create policy fgm_insert on public.family_group_members for insert to authenticated
  with check (public.has_group_role(family_group_id, array['owner','admin']::public.family_role[]));

drop policy if exists fgm_update on public.family_group_members;
create policy fgm_update on public.family_group_members for update to authenticated
  using (public.has_group_role(family_group_id, array['owner','admin']::public.family_role[]))
  with check (public.has_group_role(family_group_id, array['owner','admin']::public.family_role[]));

drop policy if exists fgm_delete on public.family_group_members;
create policy fgm_delete on public.family_group_members for delete to authenticated
  using (
    user_id = auth.uid()  -- sair da família
    or public.has_group_role(family_group_id, array['owner','admin']::public.family_role[])
  );

-- family_group_invites: membros veem; owner/admin criam/removem.
drop policy if exists inv_select on public.family_group_invites;
create policy inv_select on public.family_group_invites for select to authenticated
  using (public.is_group_member(family_group_id));

drop policy if exists inv_insert on public.family_group_invites;
create policy inv_insert on public.family_group_invites for insert to authenticated
  with check (public.has_group_role(family_group_id, array['owner','admin']::public.family_role[]) and created_by = auth.uid());

drop policy if exists inv_delete on public.family_group_invites;
create policy inv_delete on public.family_group_invites for delete to authenticated
  using (public.has_group_role(family_group_id, array['owner','admin']::public.family_role[]));

-- user_locations: vê quem compartilha família; faz upsert só da própria localização.
drop policy if exists loc_select on public.user_locations;
create policy loc_select on public.user_locations for select to authenticated
  using (user_id = auth.uid() or public.shares_family_with(user_id));

drop policy if exists loc_insert on public.user_locations;
create policy loc_insert on public.user_locations for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists loc_update on public.user_locations;
create policy loc_update on public.user_locations for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- saved_places: membros veem e criam/editam; remoção restrita a owner/admin.
drop policy if exists sp_select on public.saved_places;
create policy sp_select on public.saved_places for select to authenticated
  using (public.is_group_member(family_group_id));

drop policy if exists sp_insert on public.saved_places;
create policy sp_insert on public.saved_places for insert to authenticated
  with check (public.is_group_member(family_group_id) and created_by = auth.uid());

drop policy if exists sp_update on public.saved_places;
create policy sp_update on public.saved_places for update to authenticated
  using (public.is_group_member(family_group_id))
  with check (public.is_group_member(family_group_id));

drop policy if exists sp_delete on public.saved_places;
create policy sp_delete on public.saved_places for delete to authenticated
  using (public.has_group_role(family_group_id, array['owner','admin']::public.family_role[]));

-- place_notifications: cada usuário gerencia as próprias preferências, em locais que enxerga.
drop policy if exists pn_select on public.place_notifications;
create policy pn_select on public.place_notifications for select to authenticated
  using (
    user_id = auth.uid()
    or exists (
      select 1 from public.saved_places sp
      where sp.id = saved_place_id and public.is_group_member(sp.family_group_id)
    )
  );

drop policy if exists pn_write on public.place_notifications;
create policy pn_write on public.place_notifications for all to authenticated
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.saved_places sp
      where sp.id = saved_place_id and public.is_group_member(sp.family_group_id)
    )
  );

-- =============================================================================
-- Realtime (localização e locais atualizam em tempo real; §5/§13)
-- =============================================================================
do $$
begin
  alter publication supabase_realtime add table public.user_locations;
exception when duplicate_object then null; end
$$;
do $$
begin
  alter publication supabase_realtime add table public.saved_places;
exception when duplicate_object then null; end
$$;
