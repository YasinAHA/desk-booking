-- 002_rpc.sql
-- RPCs para obtener ocupación y reservar/cancelar de forma segura

-- IMPORTANTE: seguridad
-- Usamos SECURITY DEFINER para poder ver ocupación global SIN exponer quién es el ocupante.
-- Devolvemos "is_mine" para que el usuario pueda cancelar solo su reserva.

create or replace function public.get_desk_occupancy(p_date date)
returns table (
  desk_id uuid,
  desk_code text,
  desk_name text,
  is_active boolean,
  is_reserved boolean,
  is_mine boolean,
  my_reservation_id uuid
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  select
    d.id as desk_id,
    d.code as desk_code,
    d.name as desk_name,
    d.is_active,
    (r.id is not null) as is_reserved,
    (r.user_id = auth.uid()) as is_mine,
    case when r.user_id = auth.uid() then r.id else null end as my_reservation_id
  from public.desks d
  left join public.reservations r
    on r.desk_id = d.id
   and r.reserved_date = p_date
   and r.cancelled_at is null
  order by d.code;
end;
$$;

-- Permitir ejecutar a usuarios autenticados
grant execute on function public.get_desk_occupancy(date) to authenticated;


create or replace function public.create_reservation(p_date date, p_desk_id uuid)
returns table (
  ok boolean,
  message text,
  reservation_id uuid
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  insert into public.reservations (desk_id, user_id, reserved_date)
  values (p_desk_id, auth.uid(), p_date)
  returning id into v_id;

  return query select true, 'Reserva creada.', v_id;

exception
  when unique_violation then
    -- Puede ser: desk ocupado o ya tienes una reserva ese día
    return query select false, 'No se pudo reservar: el puesto está ocupado o ya tienes una reserva para ese día.', null::uuid;
  when others then
    return query select false, 'Error inesperado al reservar.', null::uuid;
end;
$$;

grant execute on function public.create_reservation(date, uuid) to authenticated;


create or replace function public.cancel_my_reservation(p_reservation_id uuid)
returns table (
  ok boolean,
  message text
)
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.reservations
     set cancelled_at = now()
   where id = p_reservation_id
     and user_id = auth.uid()
     and cancelled_at is null;

  if found then
    return query select true, 'Reserva cancelada.';
  else
    return query select false, 'No se pudo cancelar (no existe, no es tuya o ya estaba cancelada).';
  end if;
end;
$$;

grant execute on function public.cancel_my_reservation(uuid) to authenticated;

create or replace function public.create_reservation(p_date date, p_desk_id uuid)
returns table (ok boolean, message text, reservation_id uuid)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  insert into public.reservations (desk_id, user_id, reserved_date)
  values (p_desk_id, auth.uid(), p_date)
  returning id into v_id;

  return query select true, 'Reserva creada.', v_id;

exception
  when unique_violation then
    return query select false, 'No se pudo reservar: el puesto está ocupado o ya tienes una reserva para ese día.', null::uuid;
  when others then
    return query select false, 'Error inesperado al reservar.', null::uuid;
end;
$$;

grant execute on function public.create_reservation(date, uuid) to authenticated;

