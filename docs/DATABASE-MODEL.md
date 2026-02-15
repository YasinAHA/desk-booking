# Database Model (v1.0.0)

## Purpose
This document defines the database model for the v1.0.0 Camerfirma Internal Release.
It follows the product scope and business rules described in SCOPE.md.

## Design principles
- Single organization (one row in `organizations`)
- Office-first hierarchy: office -> floor (optional) -> zone (optional) -> desk
- One active reservation per user per day, one active reservation per desk per day
- Policies are stored in DB (not hardcoded)
- Check-in via desk QR with optional walk-in under policy rules
- Auditing of admin/system actions
- PostgreSQL constraints enforce policy fallback and active-reservation uniqueness
- Office/floor/zone/desk are configurable data managed by admin (not hardcoded)
- **Soft delete strategy**: users/desks/reservations use status-based soft delete to preserve historical data and audit trails

## Tables

### organizations
Single row for the internal organization.

Columns:
- id (uuid, pk)
- name (text)
- email_domain (CITEXT)  -- Single domain for v1.0.0 (Camerfirma: "camerfirma.com"), case-insensitive
- created_at (timestamptz)
- updated_at (timestamptz)  -- Auto-updated via trigger

Notes:
- Only one row in v1.0.0
- Used as policy fallback scope
- **Future expansion (v1.x+)**: If multiple domains needed (e.g., .com, .es, .eu):
  - Quick: Migrate to `text[]` with GIN index
  - Full: Create `organization_email_domains` table (better for v2.0.0 multi-tenant)

Optional (if multiple domains are needed later):

### organization_email_domains (optional)
Columns:
- id (uuid, pk)
- organization_id (uuid, fk -> organizations.id)
- domain (text)
- created_at (timestamptz)

Notes:
- Use if more than one allowed domain is required

### offices
Columns:
- id (uuid, pk)
- organization_id (uuid, fk -> organizations.id)
- name (text)
- address (text, nullable)
- timezone (text, default 'Europe/Madrid')
- created_at (timestamptz)
- updated_at (timestamptz)

### floors (optional)
Columns:
- id (uuid, pk)
- office_id (uuid, fk -> offices.id)
- name (text)
- level (int, nullable)
- created_at (timestamptz)
- updated_at (timestamptz)

Notes:
- Optional. Can be omitted if not used.

### zones (optional)
Columns:
- id (uuid, pk)
- office_id (uuid, fk -> offices.id)
- floor_id (uuid, fk -> floors.id, nullable)
- name (text)
- created_at (timestamptz)
- updated_at (timestamptz)

Notes:
- Optional. Can be omitted if not used.

### desks
Columns:
- id (uuid, pk)
- office_id (uuid, fk -> offices.id)
- floor_id (uuid, fk -> floors.id, nullable)
- zone_id (uuid, fk -> zones.id, nullable)
- code (text)              -- e.g. "D01" - required unique identifier
- name (text, nullable)    -- e.g. "Puesto 01" - friendly display name (UI can fallback to code)
- status (text)            -- active | maintenance | disabled
- qr_public_id (text, unique)
- status_changed_at (timestamptz, nullable)
- status_reason (text, nullable)
- created_at (timestamptz)
- updated_at (timestamptz)

Constraints:
- unique (office_id, code)

Checks (recommended):
- status in ('active', 'maintenance', 'disabled')

### desk_blocks (optional but recommended)
Tracks maintenance blocks by period.

Columns:
- id (uuid, pk)
- desk_id (uuid, fk -> desks.id)
- start_at (timestamptz)
- end_at (timestamptz, nullable)
- reason (text, nullable)
- created_by (uuid, fk -> users.id)
- created_at (timestamptz)

Checks:
- end_at IS NULL OR end_at > start_at

Notes:
- Use for reports and admin operations
- Prevent overlapping blocks per desk

Constraints (minimum):
- unique (desk_id) where end_at is null

Constraints (optional, stronger):
- exclusion constraint on (desk_id, tstzrange(start_at, end_at)) to prevent overlaps

### users
Columns:
- id (uuid, pk)
- email (CITEXT, unique)  -- Case-insensitive, prevents User@X.com vs user@x.com duplicates
- first_name (text)
- last_name (text)
- second_last_name (text, nullable)  -- Spanish naming convention
- password_hash (text)
- confirmed_at (timestamptz, nullable)
- status (text)            -- active | suspended
- role (text)              -- user | admin
- created_at (timestamptz)
- updated_at (timestamptz) -- Auto-updated via trigger
- deleted_at (timestamptz, nullable)  -- Soft delete: if NOT NULL, user is deleted

Notes:
- Role is minimal in v1.0.0
- Admin subtypes (admin_operaciones, admin_tecnico) can be stored as role or in a separate table if needed
- **Soft delete convention**: `deleted_at IS NOT NULL` indicates user is deleted
  - `status` reflects last state before deletion (useful for historical context)
  - Application layer MUST filter `WHERE deleted_at IS NULL` in all user queries (auth, listings, lookups)
  - No CHECK constraint enforced to maintain flexibility
  - Repositories should centralize this filter to avoid bugs
- ON DELETE constraints use RESTRICT to prevent accidental data loss

Checks (recommended):
- status in ('active', 'suspended')
- role in ('user', 'admin')

### reservation_policies
Policy per office, with org fallback.

Columns:
- id (uuid, pk)
- organization_id (uuid, fk -> organizations.id)
- office_id (uuid, fk -> offices.id, nullable)
- max_advance_days (int)
- max_reservations_per_day (int)
- checkin_allowed_from (time)
- checkin_cutoff_time (time)
- cancellation_deadline_hours (int)
- require_email_domain_match (bool)
- created_at (timestamptz)
- updated_at (timestamptz) -- Auto-updated via trigger

Constraints:

PostgreSQL unique indexes (required):
- unique (organization_id) where office_id is null
- unique (organization_id, office_id) where office_id is not null

Checks:
- checkin_allowed_from < checkin_cutoff_time
- max_advance_days >= 0  -- 0 means "same day only", 1 means "today + 1 day", etc.
- max_reservations_per_day > 0
- cancellation_deadline_hours >= 0

Rules:
- If no office-specific policy exists, use organization-level policy (office_id is null)

### reservations
Columns:
- id (uuid, pk)
- user_id (uuid, fk -> users.id ON DELETE RESTRICT)
- desk_id (uuid, fk -> desks.id ON DELETE RESTRICT)
- office_id (uuid, fk -> offices.id ON DELETE RESTRICT)
- reservation_date (date)
- status (text)            -- reserved | checked_in | cancelled | no_show
- created_at (timestamptz)
- cancelled_at (timestamptz, nullable)
- check_in_at (timestamptz, nullable)
- no_show_at (timestamptz, nullable)
- created_by (uuid, fk -> users.id ON DELETE SET NULL, nullable)  -- for admin-created reservations
- source (text)            -- user | admin | walk_in | system

Constraints:

PostgreSQL unique indexes (active reservations only):
- unique (desk_id, reservation_date) where status in ('reserved', 'checked_in')
- unique (user_id, reservation_date) where status in ('reserved', 'checked_in')

Trigger validation:
- ensure_reservation_office_consistency(): Hybrid approach for office_id consistency
  - If `office_id IS NULL`: Auto-completes from `desks.office_id` (convenience for simple inserts)
  - If `office_id` provided: Validates it matches `desks.office_id` (prevents silent bugs)
  - Only runs on INSERT/UPDATE OF desk_id, office_id (optimized)

Notes:
- Walk-in creates a new reservation row and can check-in immediately if allowed
- Cancelled and no_show reservations do not block new reservations that day
- office_id is denormalized for faster reporting and policy lookup
- office_id consistency enforced by trigger (prevents desk/office mismatch)
- **ON DELETE RESTRICT**: Prevents deletion of users/desks/offices with active reservations
- Use soft delete on parent entities before removing reservations

Checks (recommended):
- status in ('reserved', 'checked_in', 'cancelled', 'no_show')
- source in ('user', 'admin', 'walk_in', 'system')

Notes on source field:
- 'user': Normal reservation via app by end user
- 'admin': Admin created reservation on behalf of user (created_by ≠ user_id)
- 'walk_in': User directly checked in without prior reservation
- 'system': System-generated (migrations, imports, batch operations)

### audit_events
Columns:
- id (uuid, pk)
- event_type (text)        -- Controlled vocabulary via CHECK constraint
- actor_type (text)        -- user | admin | system
- actor_user_id (uuid, fk -> users.id, nullable)
- reservation_id (uuid, fk -> reservations.id, nullable)
- desk_id (uuid, fk -> desks.id, nullable)
- office_id (uuid, fk -> offices.id, nullable)
- reason (text, nullable)
- metadata (jsonb, nullable)
- created_at (timestamptz)

Checks (recommended):
- actor_type in ('user', 'admin', 'system')
- event_type in ('reservation_created', 'reservation_cancelled', 'reservation_checked_in', 'reservation_no_show', 'desk_status_changed', 'desk_block_created', 'desk_block_ended', 'user_status_changed', 'admin_action')

Notes:
- Controlled vocabulary via CHECK ensures consistency
- Adding new event types requires migration (intentional: encourages documentation)
- For v1.0.0 TFM context, this trade-off is acceptable

### token_revocation
(Already present from security hardening.)

Columns:
- jti (text, pk)
- user_id (uuid, fk -> users.id)
- revoked_at (timestamptz)
- expires_at (timestamptz)

## Indexing
- organizations: (email_domain) unique - for idempotent seeding
- offices: (organization_id, name) unique - for idempotent seeding
- reservations: (desk_id, reservation_date) unique where status in ('reserved', 'checked_in')
- reservations: (user_id, reservation_date) unique where status in ('reserved', 'checked_in')
- reservations: (reservation_date) for reporting
- reservations: (status, reservation_date) for status-based reports
- reservations: (user_id, status) for user history
- desks: (office_id, code) unique
- email_verifications: (token_hash) for verification lookup
- email_verifications: (user_id) for cleanup and user token listing
- audit_events: (created_at), (event_type), (actor_type)
- audit_events: (reservation_id) partial where not null
- audit_events: (desk_id) partial where not null
- audit_events: (actor_user_id) partial where not null
- desk_blocks: (desk_id, start_at)
- email_outbox: (status, next_retry_at) partial where status='pending'
- email_outbox: (status, created_at) partial where status='failed'
- email_outbox: (next_retry_at) partial where status='pending' - for worker queries
- reservation_policies: unique (organization_id) where office_id is null
- reservation_policies: unique (organization_id, office_id) where office_id is not null
- reservation_policies: (organization_id, office_id) for policy lookup ("get office policy or fallback to org")
- desk_blocks: unique (desk_id) where end_at is null

## DELETE Constraints Strategy

### Soft Delete (status-based)
Primary entities use soft delete to preserve historical data and audit trails:

**users**:
- status='deleted' + deleted_at timestamp
- Prevents: accidental data loss, GDPR compliance issues, historical audit loss
- Use case: user leaves organization but reservations/audit trail must remain

**desks**:
- status='disabled' (already implemented)
- Prevents: losing desk history when physically removed
- Use case: desk retired but past reservations remain valid for reporting

**reservations**:
- status='cancelled'/'no_show' (logical states, not deletion)
- Prevents: losing booking history
- Use case: all reservations preserved for auditing and reporting

### ON DELETE CASCADE
Use only for truly dependent data that has no value without parent:

**email_verifications** → users (CASCADE):
- Verification tokens meaningless without user account

**token_revocation** → users (CASCADE):
- JWT blacklist entries irrelevant if user deleted

**desk_blocks** → desks (CASCADE):
- Maintenance blocks have no meaning without desk context

**offices/floors/zones** → hierarchical CASCADE:
- Structural data cascades down hierarchy

### ON DELETE RESTRICT
Use for critical relationships requiring explicit handling:

**reservations** → users/desks/offices (RESTRICT):
- Prevents accidental deletion of entities with existing reservations
- Forces: soft delete parent first, then handle reservations explicitly
- Rationale: reservations are historical business records (legal/compliance)

### ON DELETE SET NULL
Use for optional audit/tracking references:

**audit_events** → users/reservations/desks (SET NULL):
- Audit record preserved even if referenced entity deleted
- NULL indicates "entity no longer exists" (still useful for compliance)

**reservations.created_by** → users (SET NULL):
- Tracks which admin created reservation (if applicable)
- Doesn't break reservation if admin account removed

## Auto-updated Timestamps

The following tables have `updated_at` automatically maintained via database triggers:
- organizations
- offices
- floors
- zones
- users
- desks
- reservation_policies

Trigger: `update_updated_at_column()` executes BEFORE UPDATE and sets `updated_at = now()`

Benefit: Guarantees consistency without relying on application layer remembering to update the field.

## Check-in rules (summary)
- Check-in allowed only within office policy window
- If no check-in before cutoff, status -> no_show
- Walk-in allowed only if desk is free or reservation expired and user has no reservation that day
- Admin may override cancellation deadline

## Notes for future versions
- v1.x: introduce slots or half-day (slot_id or time ranges)
- v2.0: multi-organization with organization_id across all core tables
- v1.x: optional branding fields in organizations (logo_url, theme_color)
- v1.x: office layout assets (manual desk positioning)
- v2.0+: AI-assisted desk detection from uploaded floor plans
