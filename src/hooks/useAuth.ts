/**
 * Re-export useAuth from AuthProvider context (src/lib/auth.tsx)
 * Ensures all components share the EXACT SAME React Context state for authentication.
 */
export { useAuth } from '../lib/auth';