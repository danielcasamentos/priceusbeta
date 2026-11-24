-- Create a secure RPC function to allow authenticated users to delete their own account.
-- It executes with SECURITY DEFINER to bypass RLS policies on the auth schema, ensuring
-- cascading deletes clear all associated records in public.* tables.
CREATE OR REPLACE FUNCTION delete_user()
RETURNS void AS $$
BEGIN
  -- Perform self-deletion based on the current authenticated user's ID
  DELETE FROM auth.users WHERE id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
