/**
 * Persist tab-away strike count per challenge so refresh does not reset the counter.
 */
const STORAGE_KEY = "public_challenge_tab_away_session_strikes";

function readAll() {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const data = JSON.parse(raw);
    return data && typeof data === "object" && !Array.isArray(data) ? data : {};
  } catch {
    return {};
  }
}

function writeAll(data) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (_) {}
}

function keyFor(challengeId) {
  return String(challengeId ?? "").trim();
}

/**
 * @param {string|number} challengeId
 * @returns {number}
 */
export function getTabAwaySessionStrikes(challengeId) {
  const k = keyFor(challengeId);
  if (!k) return 0;
  const v = Number(readAll()[k]);
  if (!Number.isFinite(v) || v < 0) return 0;
  return Math.min(Math.floor(v), 99);
}

/**
 * @param {string|number} challengeId
 * @param {number} count
 */
export function setTabAwaySessionStrikes(challengeId, count) {
  const k = keyFor(challengeId);
  if (!k) return;
  const n = Math.min(Math.max(0, Math.floor(Number(count) || 0)), 99);
  const all = readAll();
  all[k] = n;
  writeAll(all);
}

/**
 * @param {string|number} challengeId
 */
export function clearTabAwaySessionStrikes(challengeId) {
  const k = keyFor(challengeId);
  if (!k) return;
  const all = readAll();
  if (!(k in all)) return;
  delete all[k];
  writeAll(all);
}
