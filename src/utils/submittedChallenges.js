/**
 * Track which public challenges the user has submitted (by challenge id and slug).
 * Used to show "Submitted" on challenges page and landing when user returns after submitting.
 */
const STORAGE_KEY = 'public_challenge_submitted';

function getStored() {
  if (typeof window === 'undefined') return { ids: new Set(), slugs: new Set() };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ids: new Set(), slugs: new Set() };
    const data = JSON.parse(raw);
    return {
      ids: new Set(Array.isArray(data.ids) ? data.ids : []),
      slugs: new Set(Array.isArray(data.slugs) ? data.slugs : []),
    };
  } catch {
    return { ids: new Set(), slugs: new Set() };
  }
}

function saveStored(ids, slugs) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      ids: Array.from(ids),
      slugs: Array.from(slugs),
    }));
  } catch (_) {}
}

/**
 * Mark a challenge as submitted (call when user submits or when challenge timer ends).
 * @param {number|string} challengeId
 * @param {string} [slug] - optional slug for the same challenge
 */
export function addSubmittedChallenge(challengeId, slug) {
  const { ids, slugs } = getStored();
  if (challengeId != null && String(challengeId).trim() !== '') {
    ids.add(String(challengeId).trim());
  }
  if (slug != null && String(slug).trim() !== '') {
    slugs.add(String(slug).trim());
  }
  saveStored(ids, slugs);
}

/**
 * Check if a challenge is submitted (by id or slug).
 * @param {{ id: number|string, slug?: string }} challenge - object with at least id, optionally slug
 * @returns {boolean}
 */
export function isChallengeSubmitted(challenge) {
  if (!challenge) return false;
  const { ids, slugs } = getStored();
  const id = challenge.id != null ? String(challenge.id).trim() : '';
  const slug = challenge.slug != null ? String(challenge.slug).trim() : '';
  return (id && ids.has(id)) || (slug && slugs.has(slug));
}
