import { supabase } from './supabase-client';

/**
 * Check if user has an active session
 */
export async function checkActiveSession() {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error('Error checking session:', error);
      return null;
    }
    
    return session;
  } catch (error) {
    console.error('Session check failed:', error);
    return null;
  }
}

/**
 * Get current user from session
 */
export async function getCurrentUser() {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error) {
      console.error('Error getting current user:', error);
      return null;
    }
    
    return user;
  } catch (error) {
    console.error('Get user failed:', error);
    return null;
  }
}

/**
 * Sign out user and clear session
 */
export async function signOutUser() {
  try {
    const { error } = await supabase.auth.signOut();
    
    if (error) {
      console.error('Error signing out:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Sign out failed:', error);
    return false;
  }
}

/**
 * Refresh session token
 */
export async function refreshSession() {
  try {
    const { data, error } = await supabase.auth.refreshSession();
    
    if (error) {
      console.error('Error refreshing session:', error);
      return null;
    }
    
    return data.session;
  } catch (error) {
    console.error('Session refresh failed:', error);
    return null;
  }
}

/**
 * Check if remember me was enabled for current session
 */
export function isRememberMeEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  
  try {
    // Check if session is stored in localStorage (means remember me was enabled)
    const authToken = localStorage.getItem('sb-auth-token');
    return !!authToken;
  } catch (error) {
    console.error('Error checking remember me status:', error);
    return false;
  }
}
