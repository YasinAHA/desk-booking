# Arquitectura

## Visión general
App estática (vanilla JS) servida desde `app/` que consume Supabase (Auth + Postgres + RPC).

## Módulos
- `app/app.js`: UI + estado + acciones (reserve/cancel/refresh)
- `app/supabaseClient.js`: creación del cliente Supabase + helpers de config

## Datos (alto nivel)
- `desks`
- `reservations`
- RPC: `get_desk_occupancy`, `create_reservation`, `cancel_my_reservation`

## Seguridad
- RLS: reservas aisladas por usuario
- Dominios permitidos en cliente (y recomendado reforzar en backend/policies)

## Flujo de refresh
- (describir la estrategia acordada cuando cerremos el bug de pestañas)
