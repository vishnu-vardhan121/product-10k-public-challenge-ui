"use client";
import React, { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useDispatch, useSelector } from "react-redux";
import Link from "next/link";
import { fetchChallengeDetails, setAccessCode, setPhone, setUserId, setRegistrationId, checkRegistrationStatus } from "@/redux/features/publicChallenge/publicChallengeSlice";
import { usePhoneOTP } from "@/hooks/usePhoneOTP";
import OTPInput from "@/components/registration/OTPInput";
import { formatPhoneNumber } from "@/services/phoneUtils";
import { 
  FaSpinner, 
  FaArrowLeft, 
  FaExclamationTriangle,
  FaCheckCircle,
  FaQuestionCircle,
  FaCode,
  FaClock
} from "react-icons/fa";

export default function ChallengeTakePage() {
  const searchParams = useSearchParams();
  const challengeId = searchParams.get('id');
  const dispatch = useDispatch();

  const { challenge, loading: challengeLoading, accessCode: reduxAccessCode, phone: reduxPhone, error: reduxError } = useSelector((state) => ({
    challenge: state.publicChallenge.currentChallenge,
    loading: state.publicChallenge.loading.challengeDetails,
    accessCode: state.publicChallenge.accessCode,
    phone: state.publicChallenge.phone,
    error: state.publicChallenge.error,
  }));

  const [phone, setPhoneLocal] = useState(reduxPhone || "");
  const [accessCode, setAccessCodeLocal] = useState(reduxAccessCode || "");
  const [otpVerified, setOtpVerified] = useState(false);
  const [otpStep, setOtpStep] = useState("phone"); // 'phone' | 'otp' | 'verified'
  const [otpCode, setOtpCode] = useState("");
  const [error, setError] = useState(null);

  // OTP hook
  const {
    sendOTP,
    verifyOTP,
    resendOTP,
    loading: otpLoading,
    error: otpError,
    isVerified,
    countdown,
    phoneNumber: otpPhoneNumber,
    reset: resetOtp,
  } = usePhoneOTP();

  useEffect(() => {
    if (challengeId) {
      dispatch(fetchChallengeDetails(challengeId));
    } else {
      setError("Challenge ID is required");
    }
  }, [challengeId, dispatch]);

  // Sync local state with Redux
  useEffect(() => {
    if (reduxPhone) {
      setPhoneLocal(reduxPhone);
    }
    if (reduxAccessCode) {
      setAccessCodeLocal(reduxAccessCode);
    }
    if (reduxError) {
      setError(reduxError);
    }
  }, [reduxPhone, reduxAccessCode, reduxError]);

  const handleSendOTP = async () => {
    setError(null);
    if (!phone.trim()) {
      setError("Please enter your phone number to send OTP");
      return;
    }
    const success = await sendOTP(phone);
    if (success) {
      setOtpStep("otp");
    } else {
      setError(otpError || "Failed to send OTP. Please try again.");
    }
  };

  const handleVerifyOTP = async (code) => {
    setError(null);
    setOtpCode(code);

    if (!code || code.length !== 6) {
      setError("Please enter a valid 6-digit OTP code");
      return;
    }

    const success = await verifyOTP(code);
    if (success) {
      setOtpStep("verified");
      setOtpVerified(true);
      setError(null);
    } else {
      setError(otpError || "Invalid OTP. Please try again.");
    }
  };

  const handleResendOTP = async () => {
    setError(null);
    await resendOTP();
  };

  const handleEnterChallenge = async () => {
    if (!otpVerified) {
      setError("Please verify your phone number with OTP first");
      return;
    }
    if (!accessCode.trim() && (challenge?.challenge_type === 'PUBLIC' || challenge?.challenge_type === 'COLLEGE_STUDENTS')) {
      setError("Please enter your access code");
      return;
    }

    try {
      // Check registration status to get user_id and registration_id
      const registrationResult = await dispatch(
        checkRegistrationStatus({ 
          challengeId: parseInt(challengeId), 
          phone: formatPhoneNumber(phone) 
        })
      ).unwrap();

    // Store in Redux
    dispatch(setPhone(formatPhoneNumber(phone)));
    dispatch(setAccessCode(accessCode));
      
      // Store user_id and registration_id if available
      if (registrationResult?.user_id && registrationResult?.registration_id) {
        dispatch(setUserId(registrationResult.user_id));
        dispatch(setRegistrationId(registrationResult.registration_id));
      }

    // Redirect to challenge interface
    window.location.href = `/challenges/interface?id=${challengeId}&phone=${encodeURIComponent(formatPhoneNumber(phone))}&access_code=${encodeURIComponent(accessCode)}`;
    } catch (err) {
      setError(err?.message || "Failed to verify registration. Please try again.");
    }
  };

  if (challengeLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <FaSpinner className="animate-spin text-4xl text-gray-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading challenge details...</p>
        </div>
      </div>
    );
  }

  if (error && !challenge) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <FaExclamationTriangle className="text-4xl text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Challenge Not Found</h2>
          <p className="text-gray-600 mb-6">{error || "The challenge you're looking for doesn't exist."}</p>
          <Link
            href="/"
            className="inline-block bg-gray-900 text-white px-6 py-3 rounded-lg hover:bg-gray-800 transition-colors"
          >
            Go to Home
          </Link>
        </div>
      </div>
    );
  }

  if (!challenge) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <Link
          href={`/challenges?id=${challengeId}`}
          className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-6"
        >
          <FaArrowLeft className="mr-2" />
          Back to Challenge
        </Link>

        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Enter Challenge</h1>
          <p className="text-gray-600 mb-8">{challenge.title}</p>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
              {error}
            </div>
          )}
          {otpError && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
              {otpError}
            </div>
          )}

          {/* Phone Number & OTP Verification */}
          <div className="space-y-4 mb-6">
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                Phone Number <span className="text-red-500">*</span>
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="tel"
                  id="phone"
                  value={phone}
                  onChange={(e) => {
                    setPhoneLocal(e.target.value);
                    if (otpStep !== "phone") {
                      setOtpStep("phone");
                      resetOtp();
                      setOtpVerified(false);
                    }
                  }}
                  disabled={otpStep !== "phone" && otpStep !== "otp"}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent disabled:bg-gray-100"
                  placeholder="e.g., 9876543210"
                />
                {otpStep === "phone" && (
                  <button
                    type="button"
                    onClick={handleSendOTP}
                    disabled={otpLoading || !phone.trim()}
                    className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                  >
                    {otpLoading ? "Sending..." : "Send OTP"}
                  </button>
                )}
                {otpStep === "otp" && (
                  <button
                    type="button"
                    onClick={() => {
                      setOtpStep("phone");
                      resetOtp();
                      setOtpVerified(false);
                    }}
                    className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
                  >
                    Change
                  </button>
                )}
                {otpStep === "verified" && (
                  <span className="px-4 py-2 bg-green-100 text-green-800 rounded-lg flex items-center gap-2">
                    <FaCheckCircle /> Verified
                  </span>
                )}
              </div>
            </div>

            {otpStep === "otp" && (
              <div className="space-y-4">
                <div>
                  <label htmlFor="otp" className="block text-sm font-medium text-gray-700 mb-2">
                    Enter OTP <span className="text-red-500">*</span>
                  </label>
                  <OTPInput value={otpCode} onChange={setOtpCode} onComplete={handleVerifyOTP} />
                  <p className="text-xs text-gray-500 mt-1">
                    Enter the 6-digit code sent to {formatPhoneNumber(phone)}.
                  </p>
                </div>
                <div className="flex items-center justify-between text-sm">
                  {countdown > 0 ? (
                    <span className="text-gray-500">Resend in {countdown}s</span>
                  ) : (
                    <button
                      type="button"
                      onClick={handleResendOTP}
                      disabled={otpLoading}
                      className="text-blue-600 hover:text-blue-800 disabled:text-gray-400 disabled:cursor-not-allowed"
                    >
                      Resend OTP
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleVerifyOTP(otpCode)}
                    disabled={otpLoading || otpCode.length !== 6}
                    className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                  >
                    {otpLoading ? "Verifying..." : "Verify OTP"}
                  </button>
                </div>
              </div>
            )}

            <div id="recaptcha-container"></div>
          </div>

          {/* Access Code (for PUBLIC and COLLEGE_STUDENTS) */}
          {(challenge.challenge_type === 'PUBLIC' || challenge.challenge_type === 'COLLEGE_STUDENTS') && (
            <div className="mb-6">
              <label htmlFor="accessCode" className="block text-sm font-medium text-gray-700 mb-2">
                Access Code <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="accessCode"
                value={accessCode}
                onChange={(e) => setAccessCodeLocal(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                placeholder="Enter your access code"
              />
              <p className="text-xs text-gray-500 mt-1">
                Enter the access code you received during registration.
              </p>
            </div>
          )}

          {/* Enter Challenge Button */}
          <button
            onClick={handleEnterChallenge}
            disabled={!otpVerified || ((challenge.challenge_type === 'PUBLIC' || challenge.challenge_type === 'COLLEGE_STUDENTS') && !accessCode.trim())}
            className="w-full bg-orange-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-orange-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center"
          >
            Enter Challenge
          </button>
        </div>
      </div>
    </div>
  );
}

