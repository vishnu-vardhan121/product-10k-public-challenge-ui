/**
 * UTM param keys we preserve across navigation.
 */
const UTM_KEYS = ["utm_source", "utm_medium", "utm_term", "utm_campaign"];

/**
 * Build query string from current URL/search params containing only UTM params.
 * @param {URLSearchParams | ReadonlyURLSearchParams} searchParams - from useSearchParams() or new URL(url).searchParams
 * @returns {string} - e.g. "utm_source=google&utm_campaign=summer" or "" (no leading ? or &)
 */
export function getUtmQueryString(searchParams) {
  if (!searchParams) return "";
  const params = new URLSearchParams();
  UTM_KEYS.forEach((k) => {
    const v = searchParams.get(k);
    if (v != null && String(v).trim() !== "") params.set(k, String(v).trim());
  });
  return params.toString();
}

/**
 * Append UTM params to a path that may already have query params.
 * @param {string} path - e.g. "/challenges/interface?id=44" or "/challenges"
 * @param {string} utmQuery - result of getUtmQueryString(searchParams)
 * @returns {string} - path with UTMs appended (e.g. "/challenges?id=44&utm_source=...")
 */
export function appendUtmToPath(path, utmQuery) {
  if (!utmQuery) return path;
  const sep = path.includes("?") ? "&" : "?";
  return `${path}${sep}${utmQuery}`;
}
