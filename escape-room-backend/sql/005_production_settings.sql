-- إعدادات مطلوبة للبرودكشن — شغّل هذا مرة واحدة قبل الرفع

-- سعر الشخص الواحد بالدينار العراقي
INSERT INTO app_settings(key, value) VALUES('price_per_person_iqd', '35000')
ON CONFLICT(key) DO NOTHING;

-- مدة الحجز بالدقائق
INSERT INTO app_settings(key, value) VALUES('booking_duration_min', '60')
ON CONFLICT(key) DO NOTHING;
