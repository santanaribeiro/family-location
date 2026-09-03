-- =============================================================================
-- Family Location — Leva 2, §3 (Presença: chegadas/saídas via geofence)
-- docs/FEATURES_NEXT_2.md
-- =============================================================================
-- Implementa o Geofence do MVP (§15 do PROJECT.md) com debounce/histerese —
-- entrada confirma em 1 min, saída em 2 min (mais lento de propósito: é na borda
-- do raio, saindo, que o GPS mais oscila).
--
-- Como aplicar: cole no SQL Editor do Supabase e rode. Depende de
-- 20260903160000_location_history.sql (usa distance_meters).
-- =============================================================================

-- Estado por usuário: onde está confirmado agora, e o candidato sendo avaliado.
create table if not exists public.user_current_place (
  user_id            uuid primary key references public.users (id) on delete cascade,
  saved_place_id     uuid references public.saved_places (id) on delete set null,
  candidate_place_id uuid references public.saved_places (id) on delete set null,
  candidate_since    timestamptz,
  updated_at         timestamptz not null default now()
);

alter table public.user_current_place enable row level security;

drop policy if exists ucp_select on public.user_current_place;
create policy ucp_select on public.user_current_place for select to authenticated
  using (user_id = auth.uid() or public.shares_family_with(user_id));

-- Sem policy de escrita para `authenticated`: só o trigger abaixo escreve.

-- Eventos confirmados (log append-only — é o que o feed de Presença lê).
create table if not exists public.place_events (
  id              uuid primary key default gen_random_uuid(),
  family_group_id uuid not null references public.family_groups (id) on delete cascade,
  user_id         uuid not null references public.users (id) on delete cascade,
  saved_place_id  uuid references public.saved_places (id) on delete set null,
  place_name      text not null,
  place_icon      text,
  event           text not null check (event in ('enter', 'exit')),
  occurred_at     timestamptz not null default now()
);
create index if not exists idx_place_events_family on public.place_events (family_group_id, occurred_at desc);

alter table public.place_events enable row level security;

drop policy if exists pe_select on public.place_events;
create policy pe_select on public.place_events for select to authenticated
  using (public.is_group_member(family_group_id));

-- Sem policy de escrita para `authenticated`: só o trigger abaixo escreve.

-- ------------------------------------------------------------- trigger de detecção
-- Roda a cada atualização de posição (disparado pelo upsert dentro de save_location,
-- ver 20260903160000_location_history.sql). AFTER INSERT OR UPDATE cobre o upsert
-- mesmo quando o valor de lat/lng não muda de fato.
create or replace function public.detect_place_presence()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_state           public.user_current_place;
  v_candidate       uuid;
  v_candidate_place public.saved_places;
  v_current_place   public.saved_places;
  v_debounce        interval;
begin
  -- Candidato = saved_place mais próximo (entre as famílias do usuário) dentro do raio.
  select sp.id into v_candidate
  from public.saved_places sp
  join public.family_group_members fgm
    on fgm.family_group_id = sp.family_group_id and fgm.user_id = new.user_id
  where public.distance_meters(new.latitude, new.longitude, sp.latitude, sp.longitude) <= sp.radius
  order by public.distance_meters(new.latitude, new.longitude, sp.latitude, sp.longitude) asc
  limit 1;

  insert into public.user_current_place (user_id, updated_at)
  values (new.user_id, now())
  on conflict (user_id) do nothing;

  select * into v_state from public.user_current_place where user_id = new.user_id for update;

  if v_candidate is not distinct from v_state.saved_place_id then
    -- já confirmado (inclusive "em trânsito", os dois null) — só toca o timestamp.
    update public.user_current_place set updated_at = now() where user_id = new.user_id;
    return new;
  end if;

  if v_candidate is not distinct from v_state.candidate_place_id and v_state.candidate_since is not null then
    -- mesmo candidato de antes: checa se já passou o debounce.
    v_debounce := case when v_candidate is null then interval '2 minutes' else interval '1 minute' end;
    if now() - v_state.candidate_since >= v_debounce then
      if v_state.saved_place_id is not null then
        select * into v_current_place from public.saved_places where id = v_state.saved_place_id;
        if v_current_place.id is not null then
          insert into public.place_events
            (family_group_id, user_id, saved_place_id, place_name, place_icon, event, occurred_at)
          values
            (v_current_place.family_group_id, new.user_id, v_current_place.id, v_current_place.name,
             v_current_place.icon, 'exit', now());
        end if;
      end if;
      if v_candidate is not null then
        select * into v_candidate_place from public.saved_places where id = v_candidate;
        insert into public.place_events
          (family_group_id, user_id, saved_place_id, place_name, place_icon, event, occurred_at)
        values
          (v_candidate_place.family_group_id, new.user_id, v_candidate_place.id, v_candidate_place.name,
           v_candidate_place.icon, 'enter', now());
      end if;
      update public.user_current_place
      set saved_place_id = v_candidate, candidate_place_id = null, candidate_since = null, updated_at = now()
      where user_id = new.user_id;
    else
      update public.user_current_place set updated_at = now() where user_id = new.user_id;
    end if;
  else
    -- novo candidato: reinicia o timer.
    update public.user_current_place
    set candidate_place_id = v_candidate, candidate_since = now(), updated_at = now()
    where user_id = new.user_id;
  end if;

  return new;
end
$$;

drop trigger if exists trg_detect_place_presence on public.user_locations;
create trigger trg_detect_place_presence
  after insert or update of latitude, longitude on public.user_locations
  for each row execute function public.detect_place_presence();

do $$
begin
  alter publication supabase_realtime add table public.user_current_place;
exception when duplicate_object then null; end
$$;
do $$
begin
  alter publication supabase_realtime add table public.place_events;
exception when duplicate_object then null; end
$$;
