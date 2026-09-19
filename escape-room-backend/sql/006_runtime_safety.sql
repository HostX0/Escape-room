-- Apply after the original migrations. Preserve existing operational data.
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_no_overlap;
ALTER TABLE bookings ADD CONSTRAINT bookings_no_overlap EXCLUDE USING gist
  (room_id WITH =, tstzrange(start_at,end_at,'[)') WITH &&)
  WHERE (status NOT IN ('cancelled','no_show'));
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS unit_price_iqd INTEGER;
UPDATE bookings b SET unit_price_iqd = b.fixed_price_iqd / GREATEST(1,(SELECT COUNT(*)::int FROM booking_participants p WHERE p.booking_id=b.id)) WHERE unit_price_iqd IS NULL;
ALTER TABLE waivers ADD COLUMN IF NOT EXISTS pdf_data BYTEA;
ALTER TABLE waivers ADD COLUMN IF NOT EXISTS template_snapshot TEXT;
CREATE TABLE IF NOT EXISTS app_assets (id TEXT PRIMARY KEY, content_type TEXT NOT NULL, data BYTEA NOT NULL CHECK(octet_length(data)<=2097152), created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
CREATE TABLE IF NOT EXISTS request_limits (key TEXT PRIMARY KEY, hits INTEGER NOT NULL, expires_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
CREATE INDEX IF NOT EXISTS request_limits_expiry_idx ON request_limits(expires_at);
-- Tables hold customer data and must never be accessible through an anonymous Supabase Data API.
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE waivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE phone_verification_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE request_limits ENABLE ROW LEVEL SECURITY;

ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE themes ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_theme_schedule ENABLE ROW LEVEL SECURITY;
ALTER TABLE theme_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE waiver_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE schema_migrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ALTER COLUMN unit_price_iqd SET NOT NULL;
