-- بيانات أساسية آمنة للتشغيل المحلي (بدون أي تعديل على المخطط)

-- 1) إعدادات افتراضية
INSERT INTO app_settings(key, value)
SELECT 'booking_duration_min', '60'
WHERE NOT EXISTS (SELECT 1 FROM app_settings WHERE key = 'booking_duration_min');

INSERT INTO app_settings(key, value)
SELECT 'price_per_person_iqd', '35000'
WHERE NOT EXISTS (SELECT 1 FROM app_settings WHERE key = 'price_per_person_iqd');

-- 2) فرعان فقط: Mansour و Jadriya
INSERT INTO branches(name, is_active)
SELECT 'Mansour', true
WHERE NOT EXISTS (SELECT 1 FROM branches WHERE name = 'Mansour');

INSERT INTO branches(name, is_active)
SELECT 'Jadriya', true
WHERE NOT EXISTS (SELECT 1 FROM branches WHERE name = 'Jadriya');

-- 3) ثلاث قاعات لكل فرع
INSERT INTO rooms(branch_id, name, capacity_min, capacity_max, is_active)
SELECT b.id, 'Room 1', 1, 8, true
FROM branches b
WHERE b.name = 'Mansour'
  AND NOT EXISTS (
    SELECT 1 FROM rooms r WHERE r.branch_id = b.id AND r.name = 'Room 1'
  );

INSERT INTO rooms(branch_id, name, capacity_min, capacity_max, is_active)
SELECT b.id, 'Room 2', 1, 8, true
FROM branches b
WHERE b.name = 'Mansour'
  AND NOT EXISTS (
    SELECT 1 FROM rooms r WHERE r.branch_id = b.id AND r.name = 'Room 2'
  );

INSERT INTO rooms(branch_id, name, capacity_min, capacity_max, is_active)
SELECT b.id, 'Room 3', 1, 8, true
FROM branches b
WHERE b.name = 'Mansour'
  AND NOT EXISTS (
    SELECT 1 FROM rooms r WHERE r.branch_id = b.id AND r.name = 'Room 3'
  );

INSERT INTO rooms(branch_id, name, capacity_min, capacity_max, is_active)
SELECT b.id, 'Room 1', 1, 8, true
FROM branches b
WHERE b.name = 'Jadriya'
  AND NOT EXISTS (
    SELECT 1 FROM rooms r WHERE r.branch_id = b.id AND r.name = 'Room 1'
  );

INSERT INTO rooms(branch_id, name, capacity_min, capacity_max, is_active)
SELECT b.id, 'Room 2', 1, 8, true
FROM branches b
WHERE b.name = 'Jadriya'
  AND NOT EXISTS (
    SELECT 1 FROM rooms r WHERE r.branch_id = b.id AND r.name = 'Room 2'
  );

INSERT INTO rooms(branch_id, name, capacity_min, capacity_max, is_active)
SELECT b.id, 'Room 3', 1, 8, true
FROM branches b
WHERE b.name = 'Jadriya'
  AND NOT EXISTS (
    SELECT 1 FROM rooms r WHERE r.branch_id = b.id AND r.name = 'Room 3'
  );
