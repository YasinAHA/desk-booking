BEGIN;

INSERT INTO app_settings (
  scope_type,
  allow_self_registration,
  guest_mode_enabled,
  checkin_window_minutes,
  max_advance_days,
  max_reservations_per_user,
  cancellation_deadline_minutes,
  default_reservation_duration_minutes,
  business_hours_start,
  business_hours_end
)
VALUES (
  'global',
  true,
  true,
  15,
  7,
  1,
  120,
  480,
  '08:00',
  '20:00'
)
ON CONFLICT DO NOTHING;

COMMIT;
