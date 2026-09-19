-- Additional indexes for query performance

CREATE INDEX IF NOT EXISTS idx_bookings_theme
ON bookings(theme_id);

CREATE INDEX IF NOT EXISTS idx_bookings_branch
ON bookings(branch_id);

CREATE INDEX IF NOT EXISTS idx_bookings_status
ON bookings(status);

CREATE INDEX IF NOT EXISTS idx_bookings_start_at
ON bookings(start_at);

CREATE INDEX IF NOT EXISTS idx_participants_booking
ON booking_participants(booking_id);

CREATE INDEX IF NOT EXISTS idx_waivers_booking
ON waivers(booking_id);

CREATE INDEX IF NOT EXISTS idx_audit_logs_staff
ON audit_logs(staff_id);

CREATE INDEX IF NOT EXISTS idx_audit_logs_entity
ON audit_logs(entity_type, entity_id);

CREATE INDEX IF NOT EXISTS idx_room_theme_schedule_theme
ON room_theme_schedule(theme_id);
