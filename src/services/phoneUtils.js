// Phone number utilities for validation and formatting (India +91 only)

const INDIAN_COUNTRY_CODE = '+91';
const INDIAN_MOBILE_LENGTH = 10;

/**
 * Validate Indian mobile number (10 digits only).
 * Accepts 10 digits or 91 followed by 10 digits.
 * @param {string} phone - Phone number to validate
 * @returns {boolean} - True if valid Indian mobile
 */
export const validateIndianPhoneNumber = (phone) => {
  if (!phone) return false;
  const digitsOnly = String(phone).replace(/\D/g, '');
  if (digitsOnly.length === 10) return true;
  if (digitsOnly.length === 12 && digitsOnly.startsWith('91')) return true;
  return false;
};

/**
 * Validate phone number format (Indian mobile: 10 digits).
 * @param {string} phone - Phone number to validate (after formatting with +91)
 * @returns {boolean} - True if valid
 */
export const validatePhoneNumber = (phone) => {
  return validateIndianPhoneNumber(phone);
};

/**
 * Format phone number to E.164 format (+91 for India).
 * Expects 10 digits or 91+10 digits; returns +91 followed by 10 digits.
 * @param {string} phone - Phone number to format
 * @param {string} countryCode - Country code (default: +91 for India)
 * @returns {string} - Formatted phone number e.g. +919876543210
 */
export const formatPhoneNumber = (phone, countryCode = INDIAN_COUNTRY_CODE) => {
  if (!phone) return '';
  
  // Convert to string if not already
  const phoneStr = String(phone).trim();
  if (!phoneStr) return '';
  
  // Remove all non-digit characters first (except + if present)
  let cleaned = phoneStr.replace(/[^\d+]/g, '');
  
  // If empty after cleaning, return empty
  if (!cleaned) return '';
  
  // If already starts with +, process it
  if (cleaned.startsWith('+')) {
    // Remove + and get only digits
    let digitsOnly = cleaned.substring(1).replace(/\D/g, '');
    
    // If it's exactly 10 digits after +, add country code
    if (digitsOnly.length === 10) {
      return `${countryCode}${digitsOnly}`;
    }
    
    // If it's 12 digits and starts with 91, it's already correct
    if (digitsOnly.length === 12 && digitsOnly.startsWith('91')) {
      return `+${digitsOnly}`;
    }
    
    // If it has 10+ digits, use as is
    if (digitsOnly.length >= 10) {
      return `+${digitsOnly}`;
    }
    
    // Too short
    return '';
  }
  
  // Remove all non-digit characters (should already be done, but just in case)
  cleaned = cleaned.replace(/\D/g, '');
  
  // If empty after cleaning, return empty
  if (!cleaned || cleaned.length === 0) return '';
  
  // Remove leading zeros (but keep at least one digit)
  cleaned = cleaned.replace(/^0+/, '') || cleaned;
  
  const countryCodeDigits = countryCode.replace('+', '');
  
  // Special case: If it's exactly 10 digits, always add country code
  // Even if it starts with 91, treat it as a 10-digit local number
  if (cleaned.length === 10) {
    return `${countryCode}${cleaned}`;
  }
  
  // If it's 12 digits and starts with 91, it already has country code
  if (cleaned.length === 12 && cleaned.startsWith('91')) {
    return `+${cleaned}`;
  }
  
  // If it's more than 12 digits, it might already have country code
  if (cleaned.length > 12) {
    if (cleaned.startsWith(countryCodeDigits)) {
      return `+${cleaned}`;
    }
    // If it doesn't start with country code, add it
    return `${countryCode}${cleaned}`;
  }
  
  // If it's 11 digits and starts with country code, it's valid
  if (cleaned.length === 11 && cleaned.startsWith(countryCodeDigits)) {
    return `+${cleaned}`;
  }
  
  // If it's less than 10 digits, it's too short
  if (cleaned.length < 10) {
    return ''; // Too short
  }
  
  // For any other case with 10+ digits, add country code
  if (cleaned.length >= 10 && cleaned.length <= 15) {
    return `${countryCode}${cleaned}`;
  }
  
  // Too long or invalid
  return '';
};

/**
 * Format phone number for display (adds spaces for readability)
 * @param {string} phone - Phone number
 * @returns {string} - Formatted display string
 */
export const formatPhoneForDisplay = (phone) => {
  if (!phone) return '';
  
  // Remove all non-digit characters
  const cleaned = phone.replace(/\D/g, '');
  
  // Format Indian numbers (10 digits)
  if (cleaned.length === 10) {
    return `${cleaned.slice(0, 5)} ${cleaned.slice(5)}`;
  }
  
  // Format with country code
  if (cleaned.length > 10) {
    const countryCode = cleaned.slice(0, cleaned.length - 10);
    const number = cleaned.slice(cleaned.length - 10);
    return `+${countryCode} ${number.slice(0, 5)} ${number.slice(5)}`;
  }
  
  return cleaned;
};

/**
 * Extract country code from phone number
 * @param {string} phone - Phone number
 * @returns {string} - Country code (default: +91)
 */
export const extractCountryCode = (phone) => {
  if (!phone) return '+91';
  
  if (phone.startsWith('+')) {
    // Extract country code (1-3 digits after +)
    const match = phone.match(/^\+(\d{1,3})/);
    if (match) {
      return `+${match[1]}`;
    }
  }
  
  return '+91'; // Default to India
};

/**
 * Clean phone number (remove all formatting)
 * @param {string} phone - Phone number
 * @returns {string} - Cleaned phone number (digits only)
 */
export const cleanPhoneNumber = (phone) => {
  if (!phone) return '';
  return phone.replace(/\D/g, '');
};

/**
 * Restrict input to Indian mobile: digits only, max 10 digits.
 * Use in onChange to keep field to 10-digit Indian number.
 * @param {string} value - Raw input value
 * @returns {string} - At most 10 digits
 */
export const restrictToIndianMobile = (value) => {
  const digits = String(value || '').replace(/\D/g, '');
  return digits.slice(0, INDIAN_MOBILE_LENGTH);
};

/**
 * Format 10-digit phone for input display: "91 xxxxx xxxxx"
 * @param {string} digits - Up to 10 digits (stored value)
 * @returns {string} - Display string e.g. "91 98765 43210"
 */
export const formatPhoneInputDisplay = (digits) => {
  if (!digits) return '91 ';
  const d = String(digits).replace(/\D/g, '').slice(0, INDIAN_MOBILE_LENGTH);
  if (d.length <= 5) return `91 ${d}`;
  return `91 ${d.slice(0, 5)} ${d.slice(5)}`;
};

/**
 * Parse input value (e.g. "91 98765 43210") to stored 10 digits only.
 * @param {string} value - Raw input value from the field
 * @returns {string} - At most 10 digits (without 91)
 */
export const parsePhoneInputValue = (value) => {
  let digits = String(value || '').replace(/\D/g, '');
  if (digits.startsWith('91')) digits = digits.slice(2);
  return digits.slice(0, INDIAN_MOBILE_LENGTH);
};

