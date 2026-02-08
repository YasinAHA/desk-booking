-- seed 3 desks for tests
INSERT INTO desks(code, name)
SELECT
  'T' || lpad(i::text, 2, '0'),
  'Test ' || lpad(i::text, 2, '0')
FROM generate_series(1, 3) i
ON CONFLICT (code) DO NOTHING;
