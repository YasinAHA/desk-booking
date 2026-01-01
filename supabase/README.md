# Supabase setup

1. Crea un proyecto en Supabase
2. En Auth:
   - Enable Email (OTP / Magic Link)
   - Configura "Site URL" y "Redirect URLs" (tu URL local y/o futura)
3. En SQL Editor:
   - Ejecuta `migrations/001_init.sql`
4. Copia en `app/config.js`:
   - SUPABASE_URL
   - SUPABASE_ANON_KEY
