-- =========================
-- Escape Room Booking Schema (PostgreSQL) - Final
-- - Booking start time can be any minute (e.g., 6:30)
-- - Fixed price (global) but saved per booking
-- - Participants (companions) require full_name + phone (NO user account required)
-- - Waiver PDF per participant
-- =========================

-- 1) ENUMs
DO $$ BEGIN
  CREATE TYPE booking_status AS ENUM ('pending','confirmed','cancelled','arrived','no_show','completed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE payment_status AS ENUM ('unpaid','paid','refunded');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE payment_method AS ENUM ('cash','pos','other');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE staff_role AS ENUM ('booking_agent','accountant','manager');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- 2) APP SETTINGS (Fixed price + duration + configs)
CREATE TABLE IF NOT EXISTS app_settings (
  key         VARCHAR(60) PRIMARY KEY,
  value       TEXT NOT NULL,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- مثال قيم:
-- INSERT INTO app_settings(key,value) VALUES
-- ('booking_duration_min','60'),
-- ('fixed_price_iqd','35000');


-- 3) BRANCHES
CREATE TABLE IF NOT EXISTS branches (
  id          BIGSERIAL PRIMARY KEY,
  name        VARCHAR(80) NOT NULL,
  address     VARCHAR(200),
  phone       VARCHAR(30),
  open_time   TIME,
  close_time  TIME,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- 4) ROOMS
CREATE TABLE IF NOT EXISTS rooms (
  id            BIGSERIAL PRIMARY KEY,
  branch_id     BIGINT NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
  name          VARCHAR(80) NOT NULL,
  capacity_min  INT NOT NULL DEFAULT 1,
  capacity_max  INT NOT NULL DEFAULT 8,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT rooms_capacity_chk CHECK (capacity_min >= 1 AND capacity_max <= 8 AND capacity_min <= capacity_max)
);


-- 5) THEMES
CREATE TABLE IF NOT EXISTS themes (
  id          BIGSERIAL PRIMARY KEY,
  name        VARCHAR(80) NOT NULL,
  description TEXT,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- 6) ROOM THEME SCHEDULE (theme changes over time)
CREATE TABLE IF NOT EXISTS room_theme_schedule (
  id         BIGSERIAL PRIMARY KEY,
  room_id    BIGINT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  theme_id   BIGINT NOT NULL REFERENCES themes(id) ON DELETE RESTRICT,
  start_at   TIMESTAMPTZ NOT NULL,
  end_at     TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT room_theme_time_chk CHECK (end_at > start_at)
);

CREATE INDEX IF NOT EXISTS idx_room_theme_schedule_room_time
ON room_theme_schedule(room_id, start_at, end_at);


-- 7) USERS (Customers - only the person who books needs an account)
CREATE TABLE IF NOT EXISTS users (
  id                BIGSERIAL PRIMARY KEY,
  full_name         VARCHAR(120) NOT NULL,
  phone             VARCHAR(30) NOT NULL UNIQUE,
  password_hash     TEXT NOT NULL,
  is_phone_verified BOOLEAN NOT NULL DEFAULT FALSE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT user_name_not_empty CHECK (length(trim(full_name)) > 0),
  CONSTRAINT user_phone_not_empty CHECK (length(trim(phone)) > 0)
);


-- 8) PHONE VERIFICATION CODES (SMS)
CREATE TABLE IF NOT EXISTS phone_verification_codes (
  id         BIGSERIAL PRIMARY KEY,
  user_id    BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  code       VARCHAR(10) NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at    TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_phone_codes_user
ON phone_verification_codes(user_id);


-- 9) BOOKINGS
-- fixed_price_iqd saved per booking (even though price is fixed globally)
CREATE TABLE IF NOT EXISTS bookings (
  id               BIGSERIAL PRIMARY KEY,
  user_id          BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  branch_id        BIGINT NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
  room_id          BIGINT NOT NULL REFERENCES rooms(id) ON DELETE RESTRICT,
  theme_id         BIGINT NOT NULL REFERENCES themes(id) ON DELETE RESTRICT, -- selected theme at booking time
  start_at         TIMESTAMPTZ NOT NULL,
  end_at           TIMESTAMPTZ NOT NULL,
  fixed_price_iqd  INT NOT NULL,
  status           booking_status NOT NULL DEFAULT 'pending',
  notes            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT booking_time_chk CHECK (end_at > start_at),
  CONSTRAINT booking_price_chk CHECK (fixed_price_iqd >= 0)
);

CREATE INDEX IF NOT EXISTS idx_bookings_room_time
ON bookings(room_id, start_at, end_at);

CREATE INDEX IF NOT EXISTS idx_bookings_user
ON bookings(user_id);


-- Prevent overlapping bookings for the same room (works for 6:30, 6:10, etc.)
CREATE EXTENSION IF NOT EXISTS btree_gist;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'bookings_no_overlap'
  ) THEN
    ALTER TABLE bookings
      ADD CONSTRAINT bookings_no_overlap
      EXCLUDE USING gist (
        room_id WITH =,
        tstzrange(start_at, end_at, '[)') WITH &&
      );
  END IF;
END $$;


-- 10) BOOKING PARTICIPANTS
-- IMPORTANT: companions do NOT need an account, but MUST have name + phone.
CREATE TABLE IF NOT EXISTS booking_participants (
  id          BIGSERIAL PRIMARY KEY,
  booking_id  BIGINT NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  full_name   VARCHAR(120) NOT NULL,
  phone       VARCHAR(30) NOT NULL,
  is_primary  BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT participant_name_not_empty CHECK (length(trim(full_name)) > 0),
  CONSTRAINT participant_phone_not_empty CHECK (length(trim(phone)) > 0)
);

-- Only one primary participant (the booker) per booking
CREATE UNIQUE INDEX IF NOT EXISTS uq_booking_one_primary
ON booking_participants(booking_id)
WHERE is_primary = TRUE;

-- Optional but recommended: prevent duplicate phone numbers inside the same booking
CREATE UNIQUE INDEX IF NOT EXISTS uq_participant_phone_per_booking
ON booking_participants(booking_id, phone);


-- 11) WAIVER TEMPLATES (versions of text)
CREATE TABLE IF NOT EXISTS waiver_templates (
  id               BIGSERIAL PRIMARY KEY,
  template_version INT NOT NULL UNIQUE,
  content          TEXT NOT NULL,
  active_from      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  active_to        TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- 12) WAIVERS (PDF per participant)
CREATE TABLE IF NOT EXISTS waivers (
  id               BIGSERIAL PRIMARY KEY,
  booking_id       BIGINT NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  participant_id   BIGINT NOT NULL REFERENCES booking_participants(id) ON DELETE CASCADE,
  template_version INT NOT NULL,
  pdf_path         TEXT NOT NULL, -- file path to the generated PDF
  generated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  signed_at        TIMESTAMPTZ,
  UNIQUE(participant_id) -- each participant has one waiver
);


-- 13) STAFF USERS (Admin dashboard)
CREATE TABLE IF NOT EXISTS staff_users (
  id            BIGSERIAL PRIMARY KEY,
  full_name     VARCHAR(120) NOT NULL,
  username      VARCHAR(60) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role          staff_role NOT NULL, -- booking_agent / accountant / manager
  branch_id     BIGINT REFERENCES branches(id) ON DELETE SET NULL,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT staff_name_not_empty CHECK (length(trim(full_name)) > 0),
  CONSTRAINT staff_username_not_empty CHECK (length(trim(username)) > 0)
);


-- 14) PAYMENTS (pay on arrival)
CREATE TABLE IF NOT EXISTS payments (
  id           BIGSERIAL PRIMARY KEY,
  booking_id   BIGINT NOT NULL UNIQUE REFERENCES bookings(id) ON DELETE CASCADE,
  amount_iqd   INT NOT NULL DEFAULT 0,
  method       payment_method NOT NULL DEFAULT 'cash',
  status       payment_status NOT NULL DEFAULT 'unpaid',
  received_by  BIGINT REFERENCES staff_users(id) ON DELETE SET NULL,
  received_at  TIMESTAMPTZ,
  reference_no VARCHAR(60),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT payment_amount_chk CHECK (amount_iqd >= 0)
);


-- 15) AUDIT LOGS (optional but recommended)
CREATE TABLE IF NOT EXISTS audit_logs (
  id          BIGSERIAL PRIMARY KEY,
  staff_id    BIGINT REFERENCES staff_users(id) ON DELETE SET NULL,
  action      VARCHAR(80) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id   BIGINT,
  details     JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
