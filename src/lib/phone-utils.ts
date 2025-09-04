/**
 * Phone number utilities for Indonesian phone numbers
 * Supports hybrid approach: input 08... or +62..., store as +62..., display as 08...
 */

/**
 * Detect if input string is a phone number or email
 */
export function isPhoneNumber(input: string): boolean {
  const trimmed = input.trim();
  
  // If contains @ symbol, likely email
  if (trimmed.includes('@')) {
    return false;
  }
  
  // Check for phone patterns:
  // - Starts with +62, 62, 08, or just 8
  // - Contains only digits, +, spaces, dashes, parentheses
  const phonePattern = /^[\+]?[0-9\s\-\(\)]{8,15}$/;
  const startsWithIndonesianCode = /^(\+?62|08|8)/;
  
  return phonePattern.test(trimmed) && startsWithIndonesianCode.test(trimmed);
}

/**
 * Normalize Indonesian phone number to E.164 format (+6281234567890)
 */
export function normalizePhoneNumber(input: string): string {
  // Remove all non-digit characters except +
  let cleaned = input.replace(/[^\d+]/g, '');
  
  // Handle different input formats
  if (cleaned.startsWith('08')) {
    // 081234567890 -> +6281234567890
    cleaned = '+62' + cleaned.substring(1);
  } else if (cleaned.startsWith('8')) {
    // 81234567890 -> +6281234567890
    cleaned = '+62' + cleaned;
  } else if (cleaned.startsWith('62') && !cleaned.startsWith('+62')) {
    // 6281234567890 -> +6281234567890
    cleaned = '+' + cleaned;
  } else if (!cleaned.startsWith('+')) {
    // Assume it needs +62 prefix
    cleaned = '+62' + cleaned;
  }
  
  return cleaned;
}

/**
 * Format phone number for display (E.164 -> 08 format)
 */
export function formatPhoneForDisplay(phoneE164: string): string {
  if (!phoneE164.startsWith('+62')) {
    return phoneE164; // Return as-is if not Indonesian number
  }
  
  // +6281234567890 -> 081234567890
  const withoutCountryCode = '0' + phoneE164.substring(3);
  
  // Add formatting: 081234567890 -> 0812-3456-7890
  if (withoutCountryCode.length >= 11) {
    return withoutCountryCode.substring(0, 4) + '-' + 
           withoutCountryCode.substring(4, 8) + '-' + 
           withoutCountryCode.substring(8);
  }
  
  return withoutCountryCode;
}

/**
 * Validate if phone number is valid Indonesian mobile number
 */
export function isValidIndonesianPhone(phone: string): boolean {
  const normalized = normalizePhoneNumber(phone);
  
  // Indonesian mobile numbers: +62811..., +62812..., +62813... etc
  // Length should be 13-14 digits total
  const pattern = /^\+628[0-9]{8,9}$/;
  
  return pattern.test(normalized);
}

/**
 * Convert phone for WhatsApp URL (remove + from E.164)
 */
export function phoneForWhatsApp(phoneE164: string): string {
  return phoneE164.replace('+', '');
}
