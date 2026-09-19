-- Add image_url column to themes table for server-side image storage
ALTER TABLE themes ADD COLUMN IF NOT EXISTS image_url TEXT;
