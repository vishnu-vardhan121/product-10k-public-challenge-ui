"use client";
import { useState, useCallback, useEffect, useRef } from "react";
import { sendOtp, verifyOtp } from "@/services/otpApi";
import { formatPhoneNumber, validatePhoneNumber } from "@/services/phoneUtils";

const RESEND_COOLDOWN = 60;

/** Normalize phone to digits-only for backend (matches backend normalize_mobile). */
function toDigitsOnly(phone) {
  if (!phone) return "";
  return String(phone).trim().replace(/\D/g, "");
}

/** Return 10-digit mobile for API (backend adds 91 for SMS; batch check matches 10-digit). */
function toMobile10(phone) {
  const digits = toDigitsOnly(phone);
  if (digits.length === 12 && digits.startsWith("91")) return digits.slice(2);
  return digits;
}

const BATCH_STUDENT_FILTER = "check_and_block_exists_in_all_batch";

/**
 * @param {{ blockBatchStudents?: boolean }} [options] - If true, send OTP will use filter to block 10000Coders batch students (show share modal instead).
 */
export const usePhoneOTP = (options = {}) => {
  const { blockBatchStudents = false } = options;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastErrorCode, setLastErrorCode] = useState(null);
  const [isVerified, setIsVerified] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [phoneNumber, setPhoneNumber] = useState("");
  const countdownIntervalRef = useRef(null);

  useEffect(() => {
    return () => {
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    };
  }, []);

  useEffect(() => {
    if (countdown > 0) {
      countdownIntervalRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
    }
    return () => {
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    };
  }, [countdown]);

  const sendOTP = useCallback(async (phone) => {
    try {
      setLoading(true);
      setError(null);
      setIsVerified(false);

      const trimmedPhone = phone ? String(phone).trim() : "";
      if (!trimmedPhone) {
        setError("Please enter your phone number");
        return false;
      }

      const formattedPhone = formatPhoneNumber(trimmedPhone);
      if (!formattedPhone || !validatePhoneNumber(formattedPhone)) {
        setError("Please enter a valid 10-digit Indian mobile number.");
        return false;
      }

      const digitsOnly = toDigitsOnly(formattedPhone);
      if (digitsOnly.length !== 10 && digitsOnly.length !== 12) {
        setError("Indian mobile number must be 10 digits.");
        return false;
      }

      setPhoneNumber(formattedPhone);

      const mobileForApi = toMobile10(formattedPhone);
      const filters = blockBatchStudents ? [BATCH_STUDENT_FILTER] : undefined;
      const { success, error: apiError, code } = await sendOtp(mobileForApi, { filters });
      setLastErrorCode(code || null);
      if (success) {
        setCountdown(RESEND_COOLDOWN);
        return { success: true };
      }
      setError(apiError || "Failed to send OTP. Please try again.");
      return { success: false, code: code || null };
    } catch (err) {
      console.error("Error sending OTP:", err);
      setError(err.message || "Failed to send OTP. Please try again.");
      return { success: false, code: null };
    } finally {
      setLoading(false);
    }
  }, [blockBatchStudents]);

  const verifyOTP = useCallback(async (code) => {
    try {
      setLoading(true);
      setError(null);

      if (!code || String(code).trim().length !== 6) {
        setError("Please enter a valid 6-digit OTP code");
        return false;
      }

      if (!phoneNumber) {
        setError("OTP session expired. Please request a new OTP.");
        return false;
      }

      const mobileForApi = toMobile10(phoneNumber);
      const { success, error: apiError } = await verifyOtp(mobileForApi, String(code).trim());
      if (success) {
        setIsVerified(true);
        return true;
      }
      setError(apiError || "Invalid OTP. Please try again.");
      return false;
    } catch (err) {
      console.error("Error verifying OTP:", err);
      setError(err.message || "Invalid OTP. Please try again.");
      return false;
    } finally {
      setLoading(false);
    }
  }, [phoneNumber]);

  const resendOTP = useCallback(async () => {
    if (countdown > 0) {
      setError(`Please wait ${countdown} seconds before requesting a new OTP.`);
      return false;
    }
    if (!phoneNumber) {
      setError("Phone number is required to resend OTP.");
      return false;
    }
    return await sendOTP(phoneNumber);
  }, [phoneNumber, countdown, sendOTP]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const reset = useCallback(() => {
    setLoading(false);
    setError(null);
    setIsVerified(false);
    setCountdown(0);
    setPhoneNumber("");
  }, []);

  return {
    loading,
    error,
    lastErrorCode,
    verificationId: null,
    isVerified,
    countdown,
    phoneNumber,
    sendOTP,
    verifyOTP,
    resendOTP,
    reset,
    clearError,
  };
};
