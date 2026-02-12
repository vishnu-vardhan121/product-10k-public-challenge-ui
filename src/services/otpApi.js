// OTP send and verify via backend API (no Firebase)
import axios from "../axios";

const OTP_BASE = "mentor/otp";

/**
 * Send OTP to mobile number.
 * @param {string} mobile - Digits-only mobile (e.g. from formatPhoneNumber then replace(/\D/g, ''))
 * @param {{ filters?: string[] }} [options] - Optional. filters: e.g. ["check_and_block_exists_in_all_batch"] to block 10000Coders batch students
 * @returns {Promise<{ success: boolean, error?: string, code?: string }>}
 */
export async function sendOtp(mobile, options = {}) {
  try {
    const body = {
      channel: "mobile",
      mobile,
    };
    if (options.filters && options.filters.length) {
      body.filters = options.filters;
    }
    const response = await axios.post(`${OTP_BASE}/send/`, body);
    const ok = response.data?.success === true;
    return {
      success: ok,
      error: ok ? undefined : response.data?.error || "Failed to send OTP.",
      code: response.data?.code,
    };
  } catch (err) {
    const message = err.response?.data?.error || err.message || "Failed to send OTP.";
    const code = err.response?.data?.code;
    return { success: false, error: message, code };
  }
}

/**
 * Verify OTP for mobile number.
 * @param {string} mobile - Digits-only mobile (same as used for send)
 * @param {string} otp - 6-digit code
 * @returns {Promise<{ success: boolean, error?: string }>}
 */
export async function verifyOtp(mobile, otp) {
  try {
    const response = await axios.post(`${OTP_BASE}/verify/`, {
      channel: "mobile",
      mobile,
      otp: String(otp).trim(),
    });
    const ok = response.data?.success === true;
    return { success: ok, error: ok ? undefined : response.data?.error || "Invalid OTP." };
  } catch (err) {
    const message = err.response?.data?.error || err.message || "Invalid OTP.";
    return { success: false, error: message };
  }
}
