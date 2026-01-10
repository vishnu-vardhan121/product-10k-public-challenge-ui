"use client";
import { useState, useCallback, useEffect, useRef } from "react";
import { signInWithPhoneNumber, ConfirmationResult } from "firebase/auth";
import { auth, setupRecaptchaVerifier, clearRecaptchaVerifier } from "@/config/firebase";
import { formatPhoneNumber, validatePhoneNumber } from "@/services/phoneUtils";

const RESEND_COOLDOWN = 60; // 60 seconds cooldown for resend

export const usePhoneOTP = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [verificationId, setVerificationId] = useState(null);
  const [isVerified, setIsVerified] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [phoneNumber, setPhoneNumber] = useState("");
  
  const confirmationResultRef = useRef(null);
  const countdownIntervalRef = useRef(null);

  // Cleanup countdown on unmount
  useEffect(() => {
    return () => {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
      clearRecaptchaVerifier();
    };
  }, []);

  // Countdown timer
  useEffect(() => {
    if (countdown > 0) {
      countdownIntervalRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(countdownIntervalRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
    }

    return () => {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
    };
  }, [countdown]);

  /**
   * Send OTP to phone number
   * @param {string} phone - Phone number in E.164 format
   * @returns {Promise<boolean>} - True if OTP sent successfully
   */
  const sendOTP = useCallback(async (phone) => {
    try {
      setLoading(true);
      setError(null);
      setIsVerified(false);
      setVerificationId(null);
      confirmationResultRef.current = null;

      // IMPORTANT: Clear any existing reCAPTCHA first
      clearRecaptchaVerifier();

      // Trim and clean the input first
      const trimmedPhone = phone ? String(phone).trim() : '';
      
      if (!trimmedPhone) {
        throw new Error("Please enter your phone number");
      }
      
      // Format phone number to E.164 first
      const formattedPhone = formatPhoneNumber(trimmedPhone);
      
      // Validate formatted phone number
      if (!formattedPhone || formattedPhone.length === 0) {
        throw new Error(`Please enter a valid phone number (minimum 10 digits). You entered: "${trimmedPhone}"`);
      }
      
      // Additional validation for E.164 format
      if (!formattedPhone.startsWith('+')) {
        throw new Error("Invalid phone number format. Please include country code.");
      }
      
      // Check minimum length (country code + 10 digits minimum)
      // For India: +91 (2 digits) + 10 digits = 12 characters minimum
      const digitsAfterPlus = formattedPhone.substring(1).replace(/\D/g, '');
      if (digitsAfterPlus.length < 10) {
        throw new Error(`Phone number is too short. Please enter at least 10 digits. Current: ${digitsAfterPlus.length} digits`);
      }
      
      if (formattedPhone.length < 12) {
        throw new Error(`Phone number is too short. Please enter a valid phone number. Current length: ${formattedPhone.length}`);
      }
      
      setPhoneNumber(formattedPhone);

      // Setup reCAPTCHA verifier
      const verifier = setupRecaptchaVerifier("recaptcha-container");
      if (!verifier) {
        throw new Error("Failed to initialize reCAPTCHA. Please refresh the page.");
      }

      // Send OTP
      const confirmation = await signInWithPhoneNumber(auth, formattedPhone, verifier);
      
      confirmationResultRef.current = confirmation;
      setVerificationId(confirmation.verificationId);
      setCountdown(RESEND_COOLDOWN);
      
      return true;
    } catch (err) {
      console.error("Error sending OTP:", err);
      
      // Clear reCAPTCHA on error
      clearRecaptchaVerifier();
      
      // Handle specific Firebase errors
      let errorMessage = "Failed to send OTP. Please try again.";
      
      if (err.code === "auth/billing-not-enabled") {
        errorMessage = "Phone authentication requires billing to be enabled in Firebase. Please contact administrator or use a test phone number for development.";
      } else if (err.code === "auth/invalid-phone-number") {
        errorMessage = "Invalid phone number format. Please check and try again.";
      } else if (err.code === "auth/too-many-requests") {
        errorMessage = "Too many requests. Please wait a few minutes and try again.";
      } else if (err.code === "auth/quota-exceeded") {
        errorMessage = "SMS quota exceeded. Please try again later.";
      } else if (err.code === "auth/captcha-check-failed") {
        errorMessage = "reCAPTCHA verification failed. Please refresh the page and try again.";
      } else if (err.code === "auth/session-expired") {
        errorMessage = "Session expired. Please try again.";
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Verify OTP code
   * @param {string} code - 6-digit OTP code
   * @returns {Promise<boolean>} - True if OTP verified successfully
   */
  const verifyOTP = useCallback(async (code) => {
    try {
      setLoading(true);
      setError(null);

      if (!code || code.length !== 6) {
        throw new Error("Please enter a valid 6-digit OTP code");
      }

      if (!confirmationResultRef.current) {
        throw new Error("OTP session expired. Please request a new OTP.");
      }

      // Verify OTP
      const result = await confirmationResultRef.current.confirm(code);
      
      if (result.user) {
        setIsVerified(true);
        clearRecaptchaVerifier();
        return true;
      }
      
      return false;
    } catch (err) {
      console.error("Error verifying OTP:", err);
      
      let errorMessage = "Invalid OTP code. Please try again.";
      
      if (err.code === "auth/invalid-verification-code") {
        errorMessage = "Invalid OTP code. Please check and try again.";
      } else if (err.code === "auth/code-expired") {
        errorMessage = "OTP code has expired. Please request a new one.";
      } else if (err.code === "auth/session-expired") {
        errorMessage = "OTP session expired. Please request a new OTP.";
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Resend OTP
   * @returns {Promise<boolean>} - True if OTP resent successfully
   */
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

  /**
   * Reset OTP state
   */
  const reset = useCallback(() => {
    setError(null);
    setVerificationId(null);
    setIsVerified(false);
    setCountdown(0);
    setPhoneNumber("");
    confirmationResultRef.current = null;
    clearRecaptchaVerifier();
  }, []);

  return {
    loading,
    error,
    verificationId,
    isVerified,
    countdown,
    phoneNumber,
    sendOTP,
    verifyOTP,
    resendOTP,
    reset,
  };
};

