# API (Supabase)

## RPC

### get_desk_occupancy(p_date)
Devuelve el estado del grid para una fecha:
- is_active
- is_reserved
- is_mine
- my_reservation_id
- desk_name / desk_id

### create_reservation(p_date, p_desk_id)
Crea una reserva si cumple reglas. Devuelve `{ ok, message }`.

### cancel_my_reservation(p_reservation_id)
Cancela una reserva propia. Devuelve `{ ok, message }`.

## Tablas

### reservations
Campos principales:
- id
- reserved_date
- desk_id
- user_id
- cancelled_at
