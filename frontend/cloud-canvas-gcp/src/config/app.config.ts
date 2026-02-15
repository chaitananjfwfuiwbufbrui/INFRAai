/**
 * Application Configuration
 * 
 * Toggle features on/off from this central config file.
 */

// ============================================
// AUTHENTICATION CONFIGURATION
// ============================================

/**
 * Enable or disable Clerk authentication
 * Set to true to require user authentication
 * Set to false to allow unauthenticated access
 */
export const ENABLE_CLERK_AUTH = true;

/**
 * Clerk Publishable Key
 * Required when ENABLE_CLERK_AUTH is true
 * Get this from your Clerk dashboard
 */
export const CLERK_PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY || '';

// ============================================
// FEATURE FLAGS
// ============================================

/**
 * Enable AI Chat feature
 */
export const ENABLE_AI_CHAT = true;

/**
 * Enable multi-cloud support (AWS, Azure in addition to GCP)
 */
export const ENABLE_MULTI_CLOUD = false;
