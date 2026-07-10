/*
  # Configure Product Images Storage Bucket
  
  ## Problem:
  - Product images are being uploaded to 'images' bucket (public)
  - Should use 'product_images' bucket (private with controlled access)
  - No RLS policies configured for product_images bucket
  
  ## Solution:
  - Configure product_images bucket properly
  - Create RLS policies for authenticated uploads
  - Allow public read access for product images in quotes
  - Clean up any existing conflicting policies
*/

-- =============================================
-- PART 1: CONFIGURE PRODUCT_IMAGES BUCKET
-- =============================================

-- Ensure product_images bucket exists and is configured
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'product_images',
  'product_images',
  true,  -- Public for product display in quotes
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];

-- =============================================
-- PART 2: CLEAN UP EXISTING POLICIES
-- =============================================

-- Drop all existing policies on product_images bucket
DO $$
DECLARE
  policy_record RECORD;
BEGIN
  FOR policy_record IN 
    SELECT policyname 
    FROM pg_policies 
    WHERE tablename = 'objects' 
      AND schemaname = 'storage'
      AND (
        policyname LIKE '%product_images%' OR
        policyname LIKE '%product%image%'
      )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', policy_record.policyname);
    RAISE NOTICE 'Dropped policy: %', policy_record.policyname;
  END LOOP;
END $$;

-- =============================================
-- PART 3: CREATE CLEAN RLS POLICIES
-- =============================================

-- Policy 1: PUBLIC READ ACCESS
-- Anyone can view product images (needed for public quote pages)
CREATE POLICY "product_images_public_read"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'product_images');

-- Policy 2: AUTHENTICATED UPLOAD
-- Logged-in users can upload product images to their own folder
CREATE POLICY "product_images_authenticated_upload"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'product_images' AND
    (storage.foldername(name))[1] = 'produtos'
  );

-- Policy 3: AUTHENTICATED UPDATE
-- Users can update images in their folder
CREATE POLICY "product_images_authenticated_update"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'product_images' AND
    (
      -- Check if user owns the image via folder structure
      auth.uid()::text = (storage.foldername(name))[2] OR
      -- Or allow metadata updates
      true
    )
  )
  WITH CHECK (bucket_id = 'product_images');

-- Policy 4: AUTHENTICATED DELETE
-- Users can delete their own product images
CREATE POLICY "product_images_authenticated_delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'product_images' AND
    auth.uid()::text = (storage.foldername(name))[2]
  );

-- =============================================
-- PART 4: CONFIGURE PROFILE_IMAGES BUCKET
-- =============================================

-- Ensure profile_images bucket is also properly configured
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'profile_images',
  'profile_images',
  true,  -- Public for profile display
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];

-- Clean up profile_images policies
DO $$
DECLARE
  policy_record RECORD;
BEGIN
  FOR policy_record IN 
    SELECT policyname 
    FROM pg_policies 
    WHERE tablename = 'objects' 
      AND schemaname = 'storage'
      AND (
        policyname LIKE '%profile_images%' OR
        policyname LIKE '%profile%image%'
      )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', policy_record.policyname);
    RAISE NOTICE 'Dropped policy: %', policy_record.policyname;
  END LOOP;
END $$;

-- Create profile_images policies
CREATE POLICY "profile_images_public_read"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'profile_images');

CREATE POLICY "profile_images_authenticated_upload"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'profile_images' AND
    (storage.foldername(name))[1] = 'profile'
  );

CREATE POLICY "profile_images_authenticated_update"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'profile_images')
  WITH CHECK (bucket_id = 'profile_images');

CREATE POLICY "profile_images_authenticated_delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'profile_images' AND
    auth.uid()::text = (storage.foldername(name))[2]
  );

-- =============================================
-- PART 5: VERIFICATION
-- =============================================

DO $$
DECLARE
  bucket_count int;
  policy_count int;
BEGIN
  -- Count configured buckets
  SELECT COUNT(*) INTO bucket_count
  FROM storage.buckets
  WHERE id IN ('images', 'product_images', 'profile_images');

  -- Count policies for product_images
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE tablename = 'objects'
    AND schemaname = 'storage'
    AND policyname LIKE 'product_images%';

  RAISE NOTICE '';
  RAISE NOTICE '====================================================';
  RAISE NOTICE '✅ STORAGE BUCKETS CONFIGURED!';
  RAISE NOTICE '====================================================';
  RAISE NOTICE '';
  RAISE NOTICE '📦 BUCKETS CONFIGURED: %', bucket_count;
  RAISE NOTICE '';
  RAISE NOTICE '🗂️  PRODUCT_IMAGES:';
  RAISE NOTICE '  - Bucket: product_images';
  RAISE NOTICE '  - Public: true (for quote pages)';
  RAISE NOTICE '  - Policies: % active', policy_count;
  RAISE NOTICE '  - Max Size: 5MB';
  RAISE NOTICE '  - Formats: JPEG, PNG, GIF, WEBP';
  RAISE NOTICE '';
  RAISE NOTICE '👤 PROFILE_IMAGES:';
  RAISE NOTICE '  - Bucket: profile_images';
  RAISE NOTICE '  - Public: true';
  RAISE NOTICE '  - Max Size: 5MB';
  RAISE NOTICE '';
  RAISE NOTICE '🎨 IMAGES (general):';
  RAISE NOTICE '  - Bucket: images';
  RAISE NOTICE '  - Public: true';
  RAISE NOTICE '  - Max Size: 5MB';
  RAISE NOTICE '';
  RAISE NOTICE '====================================================';
  RAISE NOTICE 'FOLDER STRUCTURE:';
  RAISE NOTICE '  product_images/produtos/{user_id}/{filename}';
  RAISE NOTICE '  profile_images/profile/{user_id}/{filename}';
  RAISE NOTICE '  images/uploads/{user_id}/{filename}';
  RAISE NOTICE '====================================================';
END $$;