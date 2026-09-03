-- =============================================================================
-- Family Location — corrige possível duplicidade em family_group_members
-- =============================================================================
-- Sintoma relatado: a mesma família aparece 2x na listagem do usuário, uma vez
-- como "member" e outra como "owner". A tabela já deveria ter
-- `unique (family_group_id, user_id)` desde a migration inicial — se esta
-- migration nunca chegou a rodar (ou a tabela já existia de uma versão anterior
-- do SQL colado manualmente no editor, e `create table if not exists` pulou a
-- constraint), o `on conflict` do RPC accept_invite não tem o que combinar e uma
-- segunda linha pode ter sido inserida em vez de atualizada.
--
-- Como aplicar: cole no SQL Editor do Supabase e rode (idempotente — pode rodar
-- mais de uma vez sem problema).
-- =============================================================================

-- 1) Remove duplicatas existentes, mantendo uma linha por (family_group_id, user_id):
--    prioriza o maior papel (owner > admin > member) e, em empate, a inscrição mais antiga.
with ranked as (
  select
    id,
    row_number() over (
      partition by family_group_id, user_id
      order by
        case role when 'owner' then 0 when 'admin' then 1 else 2 end,
        joined_at asc
    ) as rn
  from public.family_group_members
)
delete from public.family_group_members m
using ranked
where m.id = ranked.id
  and ranked.rn > 1;

-- 2) Garante a constraint de unicidade (idempotente).
do $$
begin
  alter table public.family_group_members
    add constraint family_group_members_family_group_id_user_id_key unique (family_group_id, user_id);
exception
  when duplicate_object then null;
end
$$;
