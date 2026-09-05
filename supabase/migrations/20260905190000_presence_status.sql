-- =============================================================================
-- Family Location — status de presença por membro
-- =============================================================================
-- Alimenta a linha de status da lista de membros, que substitui o "Atualizado
-- há Xmin" (esse virou tooltip no hover):
--   at_place → "Em {local} desde {hora}"
--   stopped  → "Parado desde {hora}"
--   moving   → "Em deslocamento"
--
-- Calculado no banco de propósito: fazer isso no client exigiria baixar o
-- location_history de cada membro só para descobrir desde quando ele está parado.
--
-- Como aplicar: cole no SQL Editor do Supabase e rode (idempotente).
-- =============================================================================

-- Raio que ainda conta como "o mesmo lugar". Precisa ficar acima dos 40 m que a
-- save_location usa como limiar para gravar um ponto novo no histórico, senão a
-- própria oscilação do GPS quebraria o agrupamento de quem está parado.
-- Considera-se parado a partir de 5 min no mesmo ponto.
--
-- O drop antes do create é intencional: `create or replace` recusa mudança no
-- formato de retorno, e esta migration re-roda a cada deploy do CI.
drop function if exists public.get_family_presence(uuid);

create or replace function public.get_family_presence(p_family_group_id uuid)
returns table (
  user_id    uuid,
  state      text,
  place_name text,
  place_icon text,
  since      timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_group_member(p_family_group_id) then
    raise exception 'not a member of this family';
  end if;

  return query
  with members as (
    select fgm.user_id as uid
    from public.family_group_members fgm
    where fgm.family_group_id = p_family_group_id
  ),
  base as (
    select
      m.uid,
      ul.latitude,
      ul.longitude,
      sp.id   as place_id,
      sp.name as sp_name,
      sp.icon as sp_icon
    from members m
    left join public.user_locations ul      on ul.user_id  = m.uid
    left join public.user_current_place ucp on ucp.user_id = m.uid
    -- O filtro por family_group_id aqui não é cosmético: user_current_place é
    -- global por usuário (uma linha só, sem família) e o trigger de geofence
    -- escolhe o local mais próximo entre TODAS as famílias da pessoa. Sem este
    -- filtro, e sendo esta função `security definer` (que ignora o RLS de
    -- saved_places), o nome de um local de outra família vazava para membros
    -- que não podem vê-lo.
    --
    -- Efeito colateral aceito: quem estiver dentro de locais de duas famílias ao
    -- mesmo tempo só é reportado na família que o trigger elegeu; nas demais
    -- aparece como "Parado". Resolver isso exigiria um estado por família.
    left join public.saved_places sp
      on sp.id = ucp.saved_place_id
     and sp.family_group_id = p_family_group_id
  )
  select
    b.uid,
    case
      when b.latitude is null                                             then 'unknown'
      when b.place_id is not null                                         then 'at_place'
      when stop.stopped_since is not null
       and now() - stop.stopped_since >= interval '5 minutes'             then 'stopped'
      else 'moving'
    end::text,
    b.sp_name::text,
    b.sp_icon::text,
    case
      when b.place_id is not null then coalesce(ent.occurred_at, stop.stopped_since)
      else stop.stopped_since
    end
  from base b
  -- Início do agrupamento "parado" atual: o ponto mais antigo do histórico tal que
  -- todo ponto posterior a ele também está perto da posição de agora. A janela de
  -- 24 h limita o custo — quem está parado há mais que isso reporta o começo dela.
  left join lateral (
    select min(mk.recorded_at) as stopped_since
    from (
      select
        h.recorded_at,
        public.distance_meters(h.latitude, h.longitude, b.latitude, b.longitude) as dist,
        max(
          case
            when public.distance_meters(h.latitude, h.longitude, b.latitude, b.longitude) > 75
            then h.recorded_at
          end
        ) over (order by h.recorded_at) as last_far
      from public.location_history h
      where h.user_id = b.uid
        and h.recorded_at >= now() - interval '24 hours'
    ) mk
    where mk.dist <= 75
      and (mk.last_far is null or mk.recorded_at > mk.last_far)
  ) stop on true
  -- Quando está num local salvo, "desde" é a chegada confirmada pelo geofence.
  left join lateral (
    select pe.occurred_at
    from public.place_events pe
    where pe.user_id = b.uid
      and pe.saved_place_id = b.place_id
      and pe.event = 'enter'
    order by pe.occurred_at desc
    limit 1
  ) ent on true;
end
$$;

grant execute on function public.get_family_presence(uuid) to authenticated;
