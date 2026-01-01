-- 001_init.sql

-- Desks
create table if not exists public.desks (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Reservations
create table if not exists public.reservations (
  id uuid primary key default gen_random_uuid(),
  desk_id uuid not null references public.desks(id),
  user_id uuid not null references auth.users(id),
  reserved_date date not null,
  cancelled_at timestamptz null,
  created_at timestamptz not null default now()
);

-- Un desk solo puede estar reservado una vez por día (si no está cancelado)
create unique index if not exists uq_reservations_desk_day_active
on public.reservations (desk_id, reserved_date)
where cancelled_at is null;

-- Un usuario solo puede tener una reserva activa por día
create unique index if not exists uq_reservations_user_day_active
on public.reservations (user_id, reserved_date)
where cancelled_at is null;

-- Seed: 15 desks
insert into public.desks (code, name)
select
  'D' || lpad(i::text, 2, '0') as code,
  'Puesto ' || lpad(i::text, 2, '0') as name
from generate_series(1, 15) as i
on conflict (code) do nothing;

-- RLS base (afinamos en v0.2)
alter table public.desks enable row level security;
alter table public.reservations enable row level security;

-- Políticas mínimas:
-- 1) todos los autenticados pueden leer desks
drop policy if exists "desks_read_auth" on public.desks;
create policy "desks_read_auth"
on public.desks for select
to authenticated
using (true);

-- 2) reservas: el usuario solo puede ver las suyas
drop policy if exists "reservations_read_own" on public.reservations;
create policy "reservations_read_own"
on public.reservations for select
to authenticated
using (auth.uid() = user_id);

-- 3) crear reserva: solo para sí mismo
drop policy if exists "reservations_insert_own" on public.reservations;
create policy "reservations_insert_own"
on public.reservations for insert
to authenticated
with check (auth.uid() = user_id);

-- 4) cancelar: solo actualizar su reserva (cancelled_at)
drop policy if exists "reservations_update_own" on public.reservations;
create policy "reservations_update_own"
on public.reservations for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
