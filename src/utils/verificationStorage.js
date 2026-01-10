/**
 * Utility functions for persisting OTP verification status
 */

const VERIFICATION_STORAGE_KEY = 'public_challenge_verifications';
const VERIFICATION_EXPIRY_HOURS = 24; // Verification valid for 24 hours

/**
 * Get all stored verifications
 */
export const getStoredVerifications = () => {
  if (typeof window === 'undefined') return {};
  
  try {
    const stored = localStorage.getItem(VERIFICATION_STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch (error) {
    console.error('Failed to read verifications from storage:', error);
    return {};
  }
};

/**
 * Check if user is verified for a specific challenge
 * @param {string} phone - User's phone number
 * @param {string|number} challengeId - Challenge ID
 * @returns {boolean} - True if verified and not expired
 */
export const isVerifiedForChallenge = (phone, challengeId) => {
  if (typeof window === 'undefined') return false;
  
  const verifications = getStoredVerifications();
  const key = `${phone}_${challengeId}`;
  const verification = verifications[key];
  
  if (!verification) return false;
  
  // Check if verification has expired
  const now = new Date();
  const verifiedAt = new Date(verification.verifiedAt);
  const hoursSinceVerification = (now - verifiedAt) / (1000 * 60 * 60);
  
  if (hoursSinceVerification > VERIFICATION_EXPIRY_HOURS) {
    // Expired - remove it
    delete verifications[key];
    localStorage.setItem(VERIFICATION_STORAGE_KEY, JSON.stringify(verifications));
    return false;
  }
  
  return true;
};

/**
 * Store verification for a challenge
 * @param {string} phone - User's phone number
 * @param {string|number} challengeId - Challenge ID
 */
export const storeVerification = (phone, challengeId) => {
  if (typeof window === 'undefined') return;
  
  try {
    const verifications = getStoredVerifications();
    const key = `${phone}_${challengeId}`;
    
    verifications[key] = {
      phone,
      challengeId: String(challengeId),
      verifiedAt: new Date().toISOString(),
    };
    
    localStorage.setItem(VERIFICATION_STORAGE_KEY, JSON.stringify(verifications));
  } catch (error) {
    console.error('Failed to store verification:', error);
  }
};

/**
 * Clear verification for a challenge
 * @param {string} phone - User's phone number
 * @param {string|number} challengeId - Challenge ID
 */
export const clearVerification = (phone, challengeId) => {
  if (typeof window === 'undefined') return;
  
  try {
    const verifications = getStoredVerifications();
    const key = `${phone}_${challengeId}`;
    delete verifications[key];
    localStorage.setItem(VERIFICATION_STORAGE_KEY, JSON.stringify(verifications));
  } catch (error) {
    console.error('Failed to clear verification:', error);
  }
};

/**
 * Clear all expired verifications
 */
export const clearExpiredVerifications = () => {
  if (typeof window === 'undefined') return;
  
  try {
    const verifications = getStoredVerifications();
    const now = new Date();
    let hasChanges = false;
    
    Object.keys(verifications).forEach((key) => {
      const verification = verifications[key];
      const verifiedAt = new Date(verification.verifiedAt);
      const hoursSinceVerification = (now - verifiedAt) / (1000 * 60 * 60);
      
      if (hoursSinceVerification > VERIFICATION_EXPIRY_HOURS) {
        delete verifications[key];
        hasChanges = true;
      }
    });
    
    if (hasChanges) {
      localStorage.setItem(VERIFICATION_STORAGE_KEY, JSON.stringify(verifications));
    }
  } catch (error) {
    console.error('Failed to clear expired verifications:', error);
  }
};

