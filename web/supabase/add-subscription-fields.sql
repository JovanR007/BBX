-- Add subscription fields to stores table
-- Run this in Supabase SQL Editor

ALTER TABLE stores 
ADD COLUMN IF NOT EXISTS subscription_tier TEXT DEFAULT 'free' CHECK (subscription_tier IN ('free', 'pro')),
ADD COLUMN IF NOT EXISTS lemonsqueezy_customer_id TEXT,
ADD COLUMN IF NOT EXISTS lemonsqueezy_subscription_id TEXT;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_stores_subscription_tier ON stores(subscription_tier);

-- Comment for documentation
COMMENT ON COLUMN stores.subscription_tier IS 'Current subscription tier: free or pro';
COMMENT ON COLUMN stores.lemonsqueezy_customer_id IS 'LemonSqueezy customer ID for billing';
COMMENT ON COLUMN stores.lemonsqueezy_subscription_id IS 'Active LemonSqueezy subscription ID';
