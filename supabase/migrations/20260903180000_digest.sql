-- =============================================================================
-- Family Location — Leva 2, §4 (Resumo diário/semanal)
-- docs/FEATURES_NEXT_2.md
-- =============================================================================
-- Sem tabela nova: agrega location_history (§2) e place_events (§3), que só
-- existem depois que essas duas rodarem. Nenhuma policy nova — a RPC roda como
-- security definer e filtra por is_group_member antes de agregar.
--
-- Como aplicar: cole no SQL Editor do Supabase e rode. Depende de
-- 20260903160000_location_history.sql e 20260903170000_presence.sql.
-- =============================================================================

create or replace function public.family_digest(p_family_id uuid, p_period text)
returns table (
  user_id         uuid,
  distance_meters double precision,
  places_visited  integer,
  last_event_id   uuid,
  last_event_type text,
  last_place_name text,
  last_event_at   timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_since timestamptz;
begin
  if not public.is_group_member(p_family_id) then
    return;
  end if;

  v_since := case
    when p_period = 'week' then date_trunc('day', now()) - interval '6 days'
    else date_trunc('day', now())
  end;

  return query
  with members as (
    select fgm.user_id from public.family_group_members fgm where fgm.family_group_id = p_family_id
  ),
  history_ordered as (
    select
      lh.user_id, lh.latitude, lh.longitude,
      lag(lh.latitude) over (partition by lh.user_id order by lh.recorded_at) as prev_lat,
      lag(lh.longitude) over (partition by lh.user_id order by lh.recorded_at) as prev_lng
    from public.location_history lh
    join members m on m.user_id = lh.user_id
    where lh.recorded_at >= v_since
  ),
  distances as (
    select h.user_id, sum(public.distance_meters(h.prev_lat, h.prev_lng, h.latitude, h.longitude)) as dist
    from history_ordered h
    where h.prev_lat is not null
    group by h.user_id
  ),
  places as (
    select pe.user_id, count(distinct pe.saved_place_id) as cnt
    from public.place_events pe
    join members m on m.user_id = pe.user_id
    where pe.event = 'enter' and pe.occurred_at >= v_since
    group by pe.user_id
  ),
  last_events as (
    select distinct on (pe.user_id) pe.user_id, pe.id, pe.event, pe.place_name, pe.occurred_at
    from public.place_events pe
    join members m on m.user_id = pe.user_id
    where pe.occurred_at >= v_since
    order by pe.user_id, pe.occurred_at desc
  )
  select
    m.user_id,
    coalesce(d.dist, 0) as distance_meters,
    coalesce(p.cnt, 0)::int as places_visited,
    le.id as last_event_id,
    le.event as last_event_type,
    le.place_name as last_place_name,
    le.occurred_at as last_event_at
  from members m
  left join distances d on d.user_id = m.user_id
  left join places p on p.user_id = m.user_id
  left join last_events le on le.user_id = m.user_id;
end
$$;

grant execute on function public.family_digest(uuid, text) to authenticated;
