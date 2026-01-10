// Phone number utilities for validation and formatting

/**
 * Validate phone number format
 * @param {string} phone - Phone number to validate
 * @returns {boolean} - True if valid
 */
export const validatePhoneNumber = (phone) => {
  if (!phone) return false;
  
  // Remove all non-digit characters except +
  let cleaned = phone.replace(/[^\d+]/g, '');
  
  // Must start with + for E.164 format
  if (!cleaned.startsWith('+')) {
    // If no +, check if it's a valid length for adding country code
    const digitsOnly = cleaned.replace(/\D/g, '');
    if (digitsOnly.length < 10 || digitsOnly.length > 15) {
      return false;
    }
    // Will be formatted with country code, so it's valid
    return true;
  }
  
  // Remove + for counting
  cleaned = cleaned.substring(1);
  
  // E.164 format: + followed by 1-15 digits
  // Minimum: country code (1-3 digits) + phone number (at least 7 digits) = 8 digits minimum
  // But for India (+91), we need 10 digits after country code
  if (cleaned.length < 10 || cleaned.length > 15) {
    return false;
  }
  
  return true;
};

/**
 * Format phone number to E.164 format (+[country code][number])
 * @param {string} phone - Phone number to format
 * @param {string} countryCode - Country code (default: +91 for India)
 * @returns {string} - Formatted phone number in E.164 format
 */
export const formatPhoneNumber = (phone, countryCode = '+91') => {
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

