/**
 * Time synchronization utility for Asia/Kolkata timezone
 * Fetches accurate server time from backend API and maintains clock offset
 * Singleton pattern - only syncs once globally
 */

const IST_TIMEZONE = 'Asia/Kolkata';
let clockOffsetMs = 0; // serverNowMs - clientNowMs
let lastSyncAtMs = 0;
let isSyncing = false;
let syncPromise = null;
let isInitialized = false;

/**
 * Get the backend API base URL from environment variables
 */
function getBackendUrl() {
    const baseUrl = process.env.NEXT_PUBLIC_baseUrl;
    if (!baseUrl) {
        return 'http://localhost:8000';
    }
    return baseUrl;
}

/**
 * Fetch current time from backend API for Asia/Kolkata timezone
 */
async function fetchISTTime() {
    try {
        const t0 = performance.now();
        const baseUrl = getBackendUrl();
        // Remove trailing slash from baseUrl to avoid double slashes
        const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
        // Don't add /api/ prefix since baseUrl already includes it
        const url = `${cleanBaseUrl}/student/server-time/`;

        const response = await fetch(url, {
            method: 'GET',
            cache: 'no-store',
            mode: 'cors',
            headers: {
                'Accept': 'application/json',
            },
        });
        const t1 = performance.now();

        if (!response.ok) {
            const errorText = await response.text().catch(() => '');
            throw new Error(`Backend HTTP ${response.status}: ${errorText || response.statusText}`);
        }

        const data = await response.json();

        // Use the datetime field which is in IST (Asia/Kolkata)
        // Format: "2025-12-03T10:30:45.123456+05:30"
        let serverNowMs;
        if (data.datetime) {
            serverNowMs = new Date(data.datetime).getTime();
        } else if (data.unixtime) {
            serverNowMs = Number(data.unixtime) * 1000;
        } else {
            throw new Error('No valid time data in response');
        }

        if (isNaN(serverNowMs)) {
            throw new Error('Invalid server time parsed');
        }

        const rtt = t1 - t0;
        const clientNowMs = Date.now();
        const midClientMs = clientNowMs - (rtt / 2);
        const offset = serverNowMs - midClientMs;

        return {
            offset,
            rtt,
            serverTime: serverNowMs,
            timezone: data.timezone || 'Asia/Kolkata',
        };
    } catch (error) {
        throw error;
    }
}

/**
 * Sync with server time (Asia/Kolkata)
 * Only one sync operation at a time - returns existing promise if already syncing
 */
export async function syncServerTime() {
    // If already syncing, return the existing promise
    if (isSyncing && syncPromise) {
        return syncPromise;
    }

    // If synced recently (within last 5 minutes), skip
    // This prevents too many syncs when user navigates quickly between pages
    const fiveMinutes = 5 * 60 * 1000;
    if (lastSyncAtMs > 0 && (Date.now() - lastSyncAtMs) < fiveMinutes) {
        return { offsetMs: clockOffsetMs, lastSyncAtMs };
    }

    isSyncing = true;
    syncPromise = (async () => {
        try {
            const reading = await fetchISTTime();

            clockOffsetMs = reading.offset;
            lastSyncAtMs = Date.now();

            return { offsetMs: clockOffsetMs, lastSyncAtMs };
        } catch (error) {
            // If sync fails, keep existing offset or use 0 (system clock)
            return { offsetMs: clockOffsetMs || 0, lastSyncAtMs };
        } finally {
            isSyncing = false;
            syncPromise = null;
        }
    })();

    return syncPromise;
}

/**
 * Get current time in milliseconds (adjusted with server offset)
 */
export function getNowMs() {
    return Date.now() + clockOffsetMs;
}

/**
 * Get current time as Date object
 */
export function getNowIST() {
    const nowMs = getNowMs();
    return new Date(nowMs);
}

/**
 * Format date/time in IST timezone
 */
export function formatDateTimeIST(value, options = {}) {
    if (!value) return '--';

    const date = typeof value === 'string' || typeof value === 'number'
        ? new Date(value)
        : value;

    const defaultOptions = {
        timeZone: IST_TIMEZONE,
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        ...options,
    };

    return date.toLocaleString('en-IN', defaultOptions);
}

/**
 * Get clock offset in milliseconds
 */
export function getOffsetMs() {
    return clockOffsetMs;
}

/**
 * Check if time is synced
 */
export function isTimeSynced() {
    return lastSyncAtMs > 0 && Math.abs(clockOffsetMs) < 24 * 60 * 60 * 1000; // Within 24 hours
}

/**
 * Initialize time sync on app load
 * Only initializes once globally - safe to call multiple times
 */
export async function initTimeSync() {
    // Only initialize once
    if (isInitialized) {
        return;
    }

    isInitialized = true;

    try {
        await syncServerTime();
    } catch (error) {
        // Fail silently - app continues with system clock
        clockOffsetMs = 0;
    }
}
