-- Migration to add custom branding colors for Pro stores
ALTER TABLE stores ADD COLUMN IF NOT EXISTS primary_color TEXT;
ALTER TABLE stores ADD COLUMN IF NOT EXISTS secondary_color TEXT;

COMMENT ON COLUMN stores.primary_color IS 'Custom primary brand color (HEX/HSL) for Pro stores';
COMMENT ON COLUMN stores.secondary_color IS 'Custom secondary brand color (HEX/HSL) for Pro stores';
