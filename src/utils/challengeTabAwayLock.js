/**
 * Block this browser from taking a challenge again after too many tab/window switches.
 * Stored locally only (no backend).
 */
const STORAGE_KEY = "public_challenge_tab_away_lock";

function getStored() {
  if (typeof window === "undefined") return { ids: new Set(), slugs: new Set() };
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
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        ids: Array.from(ids),
        slugs: Array.from(slugs),
      })
    );
  } catch (_) {}
}

/**
 * @param {number|string} challengeId
 * @param {string} [slug]
 */
export function addTabAwayLockChallenge(challengeId, slug) {
  const { ids, slugs } = getStored();
  if (challengeId != null && String(challengeId).trim() !== "") {
    ids.add(String(challengeId).trim());
  }
  if (slug != null && String(slug).trim() !== "") {
    slugs.add(String(slug).trim());
  }
  saveStored(ids, slugs);
}

/**
 * @param {{ id?: number|string, slug?: string }} challenge
 * @returns {boolean}
 */
export function isTabAwayLockBlocked(challenge) {
  if (!challenge) return false;
  const { ids, slugs } = getStored();
  const id = challenge.id != null ? String(challenge.id).trim() : "";
  const slug = challenge.slug != null ? String(challenge.slug).trim() : "";
  return (id && ids.has(id)) || (slug && slugs.has(slug));
}
