// Public Challenge UI Configuration
// Version tracking for the public challenge application

const APP_VERSION = "1.0.0"; // Update this with each new build

/** Extra count added to real registration count for social proof / trust (e.g. "100+ already enrolled") */
export const PARTICIPANTS_TRUST_OFFSET = 100;

/**
 * Display count for participants = real count + trust offset.
 * Use this everywhere we show "X participants" so it stays consistent.
 */
export function getDisplayParticipantCount(realCount) {
  const n = Number(realCount) || 0;
  return n + PARTICIPANTS_TRUST_OFFSET;
}

/**
 * Label for participant count by challenge status:
 * - Ended → "participated"
 * - Registration open / Ongoing / Upcoming → "registered"
 * @param {string} statusKey - e.g. "ENDED", "REGISTRATION_OPEN", "ONGOING"
 * @param {string} [statusText] - alternative: "Ended", "Registration Open", etc.
 */
export function getParticipantLabel(statusKey, statusText) {
  const key = (statusKey || statusText || "").toUpperCase();
  if (key === "ENDED") return "participated";
  return "registered";
}

export { APP_VERSION };

