-- New verification codes are HMAC digests, never plaintext six-digit secrets.
ALTER TABLE phone_verification_codes ALTER COLUMN code TYPE TEXT;
ALTER TABLE phone_verification_codes ADD COLUMN IF NOT EXISTS attempts INTEGER NOT NULL DEFAULT 0;
-- Old issued plaintext codes must be reissued; verified accounts remain verified.
UPDATE phone_verification_codes SET used_at=NOW() WHERE length(code)<>64 AND used_at IS NULL;
