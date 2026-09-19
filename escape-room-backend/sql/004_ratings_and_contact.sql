-- Theme ratings table
CREATE TABLE IF NOT EXISTS theme_ratings (
  id          BIGSERIAL PRIMARY KEY,
  theme_id    BIGINT NOT NULL REFERENCES themes(id) ON DELETE CASCADE,
  user_id     BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  booking_id  BIGINT NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  rating      INT NOT NULL,
  comment     TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT rating_range_chk CHECK (rating >= 1 AND rating <= 5),
  UNIQUE(booking_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_theme_ratings_theme ON theme_ratings(theme_id);

-- Contact us settings
INSERT INTO app_settings(key, value) VALUES
  ('contact_phone', '+964 XXX XXX XXXX'),
  ('contact_address', 'بغداد، العراق'),
  ('contact_email', 'info@escaperoomiraq.com')
ON CONFLICT (key) DO NOTHING;
