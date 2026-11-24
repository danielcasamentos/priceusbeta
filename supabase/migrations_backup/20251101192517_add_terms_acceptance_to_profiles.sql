/*
  # Add Terms Acceptance Fields to Profiles

  ## Summary
  This migration adds fields to track user acceptance of Terms & Conditions and Privacy Policy,
  ensuring legal compliance with LGPD (Brazil), GDPR (Europe), and CCPA (California).

  ## Changes Made
  
  ### Modified Tables
  - `profiles` table:
    - Added `terms_accepted_at` (timestamptz) - When user accepted T&C
    - Added `terms_version` (text, default '1.0') - Version of terms accepted
    - Added `privacy_policy_accepted_at` (timestamptz) - When user accepted Privacy Policy
  
  ## Legal Compliance
  - LGPD (Brazil) - Lei 13.709/2018 - Requires explicit consent tracking
  - GDPR (Europe) - Requires proof of consent with timestamp
  - CCPA (California) - Requires consent documentation
  
  ## Important Notes
  1. All new users MUST accept terms before account creation
  2. Timestamp records WHEN consent was given
  3. Version allows tracking of which terms version was accepted
  4. Future updates to terms will increment version number
*/

-- Add terms acceptance fields to profiles table
DO $$
BEGIN
  -- Add terms_accepted_at column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'terms_accepted_at'
  ) THEN
    ALTER TABLE profiles ADD COLUMN terms_accepted_at timestamptz;
  END IF;

  -- Add terms_version column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'terms_version'
  ) THEN
    ALTER TABLE profiles ADD COLUMN terms_version text DEFAULT '1.0';
  END IF;

  -- Add privacy_policy_accepted_at column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'privacy_policy_accepted_at'
  ) THEN
    ALTER TABLE profiles ADD COLUMN privacy_policy_accepted_at timestamptz;
  END IF;
END $$;

-- Create index for querying users by terms acceptance
CREATE INDEX IF NOT EXISTS idx_profiles_terms_accepted 
  ON profiles(terms_accepted_at) 
  WHERE terms_accepted_at IS NOT NULL;

-- Create index for querying users by terms version
CREATE INDEX IF NOT EXISTS idx_profiles_terms_version 
  ON profiles(terms_version);

-- Add comment explaining the fields
COMMENT ON COLUMN profiles.terms_accepted_at IS 
  'Timestamp when user accepted Terms & Conditions. Required for LGPD/GDPR compliance.';

COMMENT ON COLUMN profiles.terms_version IS 
  'Version of Terms & Conditions that user accepted. Allows tracking consent for different versions.';

COMMENT ON COLUMN profiles.privacy_policy_accepted_at IS 
  'Timestamp when user accepted Privacy Policy. Required for LGPD/GDPR compliance.';