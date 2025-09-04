import { supabase } from './supabase-client';

/**
 * Find user email by phone number using optimized RPC function
 * Uses parent-priority search with single database call
 */
export async function findEmailByPhoneNumber(phoneInput: string): Promise<string | null> {
  try {
    // Use optimized RPC function that handles:
    // 1. Phone normalization (08xxx -> +62xxx)
    // 2. Parent-priority search (80% of users)
    // 3. Single query instead of multiple
    // 4. Built-in error handling

    const { data: email, error } = await supabase
      .rpc('optimized_phone_to_email_lookup', {
        phone_input: phoneInput
      });

    if (error) {
      console.error('Error in optimized phone lookup:', error);
      return null;
    }

    return email || null;

  } catch (error) {
    console.error('Error in findEmailByPhoneNumber:', error);
    return null;
  }
}

/**
 * Check if phone number exists in any profile table
 */
export async function phoneNumberExists(phoneInput: string): Promise<boolean> {
  const email = await findEmailByPhoneNumber(phoneInput);
  return email !== null;
}
