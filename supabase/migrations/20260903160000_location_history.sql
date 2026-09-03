-- =============================================================================
-- Family Location — Leva 2, §1 (infra compartilhada) + §2 (Histórico de localização)
-- docs/FEATURES_NEXT_2.md
-- =============================================================================
-- Substitui o upsert direto em user_locations (feito hoje pelo client) por uma RPC
-- que faz upsert + throttle de histórico + retenção numa transação só — mesmo
-- padrão de create_family_group/accept_invite (§20 do PROJECT.md).
--
-- Como aplicar: cole no SQL Editor do Supabase e rode.
-- =============================================================================

-- ------------------------------------------------------------- distance_meters
-- Haversine em SQL puro — evita adicionar PostGIS só para isso. Reaproveitada
-- pelo throttle do histórico (aqui) e pela detecção de geofence (Presença, §3).
create or replace function public.distance_meters(
  lat1 double precision, lng1 double precision,
  lat2 double precision, lng2 double precision
) returns double precision
language sql
immutable
as $$
  select 2 * 6371000 * asin(least(1.0, sqrt(
    sin(radians(lat2 - lat1) / 2) ^ 2 +
    cos(radians(lat1)) * cos(radians(lat2)) * sin(radians(lng2 - lng1) / 2) ^ 2
  )));
$$;

-- ---------------------------------------------------------------- location_history
create table if not exists public.location_history (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.users (id) on delete cascade,
  latitude    double precision not null,
  longitude   double precision not null,
  accuracy    double precision,
  recorded_at timestamptz not null
);
create index if not exists idx_history_user_time on public.location_history (user_id, recorded_at desc);

alter table public.location_history enable row level security;

drop policy if exists history_select on public.location_history;
create policy history_select on public.location_history for select to authenticated
  using (user_id = auth.uid() or public.shares_family_with(user_id));

-- Sem policy de insert/delete para `authenticated`: só a RPC save_location escreve.

-- ---------------------------------------------------------------- RPC save_location
-- Substitui o .upsert() direto em user_locations feito por src/services/location.
-- Numa chamada só: 1) upsert user_locations (dispara o trigger de geofence da
-- Presença, §3, automaticamente); 2) throttle + grava em location_history;
-- 3) apaga histórico do próprio usuário com mais de 7 dias.
create or replace function public.save_location(
  p_lat double precision,
  p_lng double precision,
  p_accuracy double precision,
  p_altitude double precision,
  p_speed double precision,
  p_heading double precision,
  p_recorded_at timestamptz
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid;
  v_last public.location_history;
begin
  v_uid := auth.uid();
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  insert into public.user_locations (user_id, latitude, longitude, accuracy, altitude, speed, heading, recorded_at)
  values (v_uid, p_lat, p_lng, p_accuracy, p_altitude, p_speed, p_heading, p_recorded_at)
  on conflict (user_id) do update set
    latitude    = excluded.latitude,
    longitude   = excluded.longitude,
    accuracy    = excluded.accuracy,
    altitude    = excluded.altitude,
    speed       = excluded.speed,
    heading     = excluded.heading,
    recorded_at = excluded.recorded_at;

  select * into v_last from public.location_history
  where user_id = v_uid
  order by recorded_at desc
  limit 1;

  if v_last.id is null
     or public.distance_meters(v_last.latitude, v_last.longitude, p_lat, p_lng) > 40
     or p_recorded_at - v_last.recorded_at > interval '5 minutes'
  then
    insert into public.location_history (user_id, latitude, longitude, accuracy, recorded_at)
    values (v_uid, p_lat, p_lng, p_accuracy, p_recorded_at);
  end if;

  delete from public.location_history
  where user_id = v_uid and recorded_at < now() - interval '7 days';
end
$$;

grant execute on function public.save_location(
  double precision, double precision, double precision, double precision,
  double precision, double precision, timestamptz
) to authenticated;
