-- =============================================================================
-- Family Location — Bateria dos membros (docs/FEATURES_NEXT.md, item 2)
-- =============================================================================
-- Tabela separada de user_locations de propósito: bateria não deveria depender de
-- um fix de GPS pra atualizar (ex.: celular parado em casa, sem distanceInterval
-- disparando, ainda deve reportar bateria periodicamente).
--
-- Como aplicar: cole no SQL Editor do Supabase e rode.
-- =============================================================================

create table if not exists public.user_device_status (
  user_id        uuid primary key references public.users (id) on delete cascade,
  battery_level  real check (battery_level between 0.0 and 1.0),
  battery_state  text not null default 'unknown' check (battery_state in ('unknown', 'unplugged', 'charging', 'full')),
  low_power_mode boolean not null default false,
  updated_at     timestamptz not null default now()
);

alter table public.user_device_status enable row level security;

drop policy if exists uds_select on public.user_device_status;
create policy uds_select on public.user_device_status for select to authenticated
  using (user_id = auth.uid() or public.shares_family_with(user_id));

drop policy if exists uds_insert on public.user_device_status;
create policy uds_insert on public.user_device_status for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists uds_update on public.user_device_status;
create policy uds_update on public.user_device_status for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

do $$
begin
  alter publication supabase_realtime add table public.user_device_status;
exception when duplicate_object then null; end
$$;
