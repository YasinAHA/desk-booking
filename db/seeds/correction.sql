-- seed 15 desks for correction environment
INSERT INTO desks(code, name)
SELECT
  'D' || lpad(i::text, 2, '0'),
  'Puesto ' || lpad(i::text, 2, '0')
FROM generate_series(1, 15) i
ON CONFLICT (code) DO NOTHING;
