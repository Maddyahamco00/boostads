/**
 * Boost Market — Phone Number Validation & Normalization Utility
 * Epic 2 Feature 2.1 Task 2.1.4: Contact Information
 * 
 * Standards & Invariants:
 * - ITU-T E.164 compliance (7 to 15 digits total)
 * - Safe handling of Nigerian domestic numbers (e.g. 0803... -> +234 803 ...)
 * - International standard E.164 with clean grouping (+234 XXX XXX XXXX, +1 XXX XXX XXXX, +44 ...)
 * - Strict rejection of alphabetic or dangerous control characters
 * - Preservation of empty/null states for optional contact fields
 * - Unverified phone notice: Storing a phone number does not mean it is verified
 */

export interface PhoneValidationResult {
  valid: boolean;
  error?: string;
  normalized?: string;
  countryCode?: string;
  nationalNumber?: string;
}

/**
 * Validates and normalizes phone numbers for personal profiles.
 */
export function validatePhoneNumber(rawPhone?: string | null): PhoneValidationResult {
  // 1. Handle empty / optional input
  if (!rawPhone || typeof rawPhone !== 'string') {
    return { valid: true, normalized: undefined };
  }

  const trimmed = rawPhone.trim();
  if (trimmed.length === 0) {
    return { valid: true, normalized: undefined };
  }

  // 2. Reject control characters, newlines, null bytes, scripts
  if (/[\x00-\x1F\x7F<>]/.test(trimmed)) {
    return {
      valid: false,
      error: 'Phone number contains illegal control characters or markup.'
    };
  }

  // 3. Reject alphabetic characters or symbols other than +, -, (, ), ., and whitespace
  if (/[^0-9+\s().-]/.test(trimmed)) {
    return {
      valid: false,
      error: 'Phone number contains invalid characters. Only digits, spaces, hyphens, parentheses, and a single leading + are permitted.'
    };
  }

  // 4. Must not have multiple '+' signs or a '+' anywhere except at index 0
  const plusCount = (trimmed.match(/\+/g) || []).length;
  if (plusCount > 1 || (plusCount === 1 && !trimmed.startsWith('+'))) {
    return {
      valid: false,
      error: 'Invalid phone format: "+" is only permitted at the very beginning of an international number.'
    };
  }

  // 5. Extract raw digits
  const digits = trimmed.replace(/\D/g, '');

  // 6. Check digit bounds (ITU-T E.164: minimum 7 digits, maximum 15 digits)
  if (digits.length < 7) {
    return {
      valid: false,
      error: 'Phone number is too short. Please provide a complete number with at least 7 digits (e.g. +234 800 000 0000 or 0800 000 0000).'
    };
  }
  if (digits.length > 15) {
    return {
      valid: false,
      error: 'Phone number is too long. Standard international phone numbers cannot exceed 15 digits.'
    };
  }

  // 7. Normalization to standard E.164 (canonical +digits without spaces)
  let normalized = '';
  let countryCode = '';
  let nationalNumber = '';

  // Case A: Nigerian local format starting with 0 (e.g. 0803 123 4567, 070..., 090..., 081...)
  // 11 digits starting with '0'
  if (digits.length === 11 && digits.startsWith('0')) {
    countryCode = '+234';
    nationalNumber = digits.slice(1); // 10 digits e.g. 8031234567
    normalized = `+234${nationalNumber}`;
  }
  // Case B: Nigerian international format (starts with 234 and 13 digits total)
  else if (digits.length === 13 && digits.startsWith('234')) {
    countryCode = '+234';
    nationalNumber = digits.slice(3); // 10 digits
    normalized = `+234${nationalNumber}`;
  }
  // Case C: North American format (+1 with 10 national digits = 11 digits)
  else if (digits.length === 11 && digits.startsWith('1')) {
    countryCode = '+1';
    nationalNumber = digits.slice(1);
    normalized = `+1${nationalNumber}`;
  }
  // Case D: General international format starting with '+'
  else if (trimmed.startsWith('+')) {
    countryCode = `+${digits.slice(0, 3)}`;
    nationalNumber = digits.slice(3);
    normalized = `+${digits}`;
  }
  // Case E: Digits only without leading + or 0
  else {
    // If 10 digits without leading 0 (e.g. 8031234567), default to Nigeria +234
    if (digits.length === 10) {
      countryCode = '+234';
      nationalNumber = digits;
      normalized = `+234${digits}`;
    } else {
      normalized = `+${digits}`;
    }
  }

  return {
    valid: true,
    normalized: normalized.trim(),
    countryCode,
    nationalNumber
  };
}

/**
 * Normalizes a phone string, or returns undefined if empty or invalid.
 */
export function normalizePhoneNumber(rawPhone?: string | null): string | undefined {
  const res = validatePhoneNumber(rawPhone);
  return res.valid ? res.normalized : undefined;
}

/**
 * Formats a phone number for user-friendly UI display.
 */
export function formatPhoneDisplay(phone?: string | null): string {
  if (!phone) return 'Not provided';
  const digits = phone.replace(/[^0-9]/g, '');

  // Format Nigerian numbers cleanly: +234 803 123 4567
  if (phone.startsWith('+234') && digits.length === 13) {
    const nat = digits.slice(3);
    return `+234 ${nat.slice(0, 3)} ${nat.slice(3, 6)} ${nat.slice(6)}`;
  }
  if (digits.length === 11 && digits.startsWith('0')) {
    const nat = digits.slice(1);
    return `+234 ${nat.slice(0, 3)} ${nat.slice(3, 6)} ${nat.slice(6)}`;
  }
  // Format US / CA numbers: +1 (202) 555-0123
  if (phone.startsWith('+1') && digits.length === 11) {
    const nat = digits.slice(1);
    return `+1 (${nat.slice(0, 3)}) ${nat.slice(3, 6)}-${nat.slice(6)}`;
  }

  return phone;
}
