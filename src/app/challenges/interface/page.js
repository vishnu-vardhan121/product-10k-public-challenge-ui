"use client";
import React, { useState, useEffect, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchChallengeDetails,
  checkRegistrationStatus,
  setPhone,
  setUserId,
  setUserName,
  setRegistrationId,
  clearError,
  registerUser,
} from "@/redux/features/publicChallenge/publicChallengeSlice";
import { usePhoneOTP } from "@/hooks/usePhoneOTP";
import OTPInput from "@/components/registration/OTPInput";
import {
  FaSpinner,
  FaArrowLeft,
  FaPhone,
  FaLock,
} from "react-icons/fa";
import { formatPhoneNumber, formatPhoneInputDisplay, parsePhoneInputValue, validateIndianPhoneNumber } from "@/services/phoneUtils";
import ChallengeInterface from "@/components/challenge/ChallengeInterface";
import BatchStudentShareModal from "@/components/shared/BatchStudentShareModal";
import {
  isVerifiedForChallenge,
  storeVerification,
  clearVerification,
  getStoredVerifications
} from "@/utils/verificationStorage";
import { getUtmQueryString, appendUtmToPath } from "@/utils/utmParams";
import "@/styles/resizable-panels.css";

/** Format remaining ms as "Xd Xh Xm Xs" or "Xh Xm Xs" / "Xm Xs" / "Xs". */
function formatCountdown(ms) {
  if (ms <= 0) return "0s";
  const s = Math.floor((ms / 1000) % 60);
  const m = Math.floor((ms / (1000 * 60)) % 60);
  const h = Math.floor((ms / (1000 * 60 * 60)) % 24);
  const d = Math.floor(ms / (1000 * 60 * 60 * 24));
  const parts = [];
  if (d > 0) parts.push(`${d}d`);
  if (h > 0) parts.push(`${h}h`);
  parts.push(`${m}m`);
  parts.push(`${s}s`);
  return parts.join(" ");
}

/** Basic email format validation (required, has @ and domain). */
function isValidEmail(value) {
  if (!value || typeof value !== "string") return false;
  const trimmed = value.trim();
  if (!trimmed) return false;
  const at = trimmed.indexOf("@");
  if (at <= 0 || at === trimmed.length - 1) return false;
  const domain = trimmed.slice(at + 1);
  const dot = domain.indexOf(".");
  return dot > 0 && dot < domain.length - 1;
}

export default function ChallengeInterfacePage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const challengeId = searchParams.get("id");
  const dispatch = useDispatch();

  const {
    currentChallenge: challenge,
    loading: challengeLoading,
    phone: reduxPhone,
    error: reduxError,
  } = useSelector((state) => ({
    currentChallenge: state.publicChallenge.currentChallenge,
    loading: state.publicChallenge.loading.challengeDetails,
    phone: state.publicChallenge.phone,
    error: state.publicChallenge.error,
  }));

  const [phone, setPhoneLocal] = useState(reduxPhone || "");
  const [otpVerified, setOtpVerified] = useState(false);
  const [otpStep, setOtpStep] = useState("phone"); // 'phone' = form (all fields), 'otp' = OTP input, 'verified' = done
  const [otpCode, setOtpCode] = useState("");
  const [localError, setLocalError] = useState(null);
  const [isRegistered, setIsRegistered] = useState(false);

  const initialFormData = {
    name: "",
    email: "",
    college_name: "",
    address: "",
    qualification: "",
    year_of_passing: "",
  };
  const [formData, setFormData] = useState(initialFormData);

  const [pendingRegistrationData, setPendingRegistrationData] = useState(null);
  const [pendingAction, setPendingAction] = useState(null);

  // UTM params from URL (for registration payload; preserved when redirected from register page)
  const getUtmParams = () => ({
    utm_src: searchParams.get("utm_source") || "organic",
    utm_medium: searchParams.get("utm_medium") || "",
    utm_term: searchParams.get("utm_term") || "",
    utm_campaign: searchParams.get("utm_campaign") || "",
  });

  const [showBatchStudentModal, setShowBatchStudentModal] = useState(false);
  const [fetchSettled, setFetchSettled] = useState(false);
  const [now, setNow] = useState(() => Date.now()); // for "test will start in" countdown
  const redirectFallbackRef = useRef(null);
  // Prevent restore effect from overwriting state after user has already registered (avoids OTP screen / session expired)
  const userAlreadyRegisteredRef = useRef(false);

  // OTP hook
  const {
    sendOTP,
    verifyOTP,
    resendOTP,
    loading: otpLoading,
    error: otpError,
    lastErrorCode: otpErrorCode,
    isVerified,
    countdown,
    reset: resetOtp,
    clearError: clearOtpError,
  } = usePhoneOTP({ blockBatchStudents: true });

  // Check verification on mount (restore from storage and sync registration status)
  useEffect(() => {
    if (!challengeId) return;
    // Do not overwrite state if user has already registered in this session (avoids showing OTP again / "session ended")
    if (userAlreadyRegisteredRef.current) return;

    let verifiedPhone = null;
    if (reduxPhone && isVerifiedForChallenge(reduxPhone, challengeId)) verifiedPhone = reduxPhone;
    if (!verifiedPhone) {
      const verifications = getStoredVerifications();
      const challengeKey = String(challengeId);
      for (const key in verifications) {
        if (verifications[key].challengeId === challengeKey && isVerifiedForChallenge(verifications[key].phone, challengeId)) {
          verifiedPhone = verifications[key].phone;
          break;
        }
      }
    }

    if (!verifiedPhone) return;

    setOtpVerified(true);
    setIsRegistered(false);
    setOtpStep("verified");
    setPhoneLocal(verifiedPhone);
    dispatch(setPhone(verifiedPhone));
    dispatch(clearError());

    // Use normalized phone so backend finds user (backend stores +91...; storage may have 10 digits)
    const phoneForApi = formatPhoneNumber(verifiedPhone) || verifiedPhone;
    dispatch(checkRegistrationStatus({ challengeId: parseInt(challengeId), phone: phoneForApi }))
      .unwrap()
      .then((result) => {
        // Stale response: user may have already registered via form; do not overwrite
        if (userAlreadyRegisteredRef.current) return;

        const { user_id, registration_id } = result;
        const userName = result.user_name;

        if (userName) dispatch(setUserName(userName));
        if (user_id) dispatch(setUserId(user_id));

        if (result.details_required) {
          setFormData((prev) => ({ ...prev, name: result.user_name || prev.name }));
          setOtpStep("phone");
          return;
        }

        if (result.is_registered && registration_id) {
          dispatch(setRegistrationId(registration_id));
          userAlreadyRegisteredRef.current = true;
          setIsRegistered(true);
          setOtpStep("verified");
          return;
        }

        // OTP already verified, but registration doesn't exist yet -> register now
        if (userName) {
          const regData = {
            name: userName,
            phone: phoneForApi,
            challenge_id: parseInt(challengeId),
            ...getUtmParams(),
          };
          dispatch(registerUser(regData))
            .unwrap()
            .then((regResult) => {
              if (userAlreadyRegisteredRef.current) return;
              if (regResult?.user_id) dispatch(setUserId(regResult.user_id));
              if (regResult?.registration_id) dispatch(setRegistrationId(regResult.registration_id));
              userAlreadyRegisteredRef.current = true;
              setIsRegistered(true);
              setOtpStep("verified");
            })
            .catch(async (err) => {
              if (userAlreadyRegisteredRef.current) return;
              if (err?.already_registered) {
                try {
                  const statusResult = await dispatch(checkRegistrationStatus({ challengeId: parseInt(challengeId), phone: phoneForApi })).unwrap();
                  if (statusResult?.is_registered && statusResult?.registration_id) {
                    dispatch(clearError());
                    if (statusResult.user_id) dispatch(setUserId(statusResult.user_id));
                    dispatch(setRegistrationId(statusResult.registration_id));
                    if (statusResult.user_name) dispatch(setUserName(statusResult.user_name));
                    userAlreadyRegisteredRef.current = true;
                    setIsRegistered(true);
                    setOtpStep("verified");
                  } else {
                    setOtpStep("phone");
                    setOtpVerified(false);
                  }
                } catch (_) {
                  setOtpStep("phone");
                  setOtpVerified(false);
                }
              } else {
                console.error('Failed to register after stored OTP verification:', err);
                setOtpStep("phone");
                setOtpVerified(false);
              }
            });
        } else {
          setOtpStep("phone");
        }
      })
      .catch((err) => {
        if (userAlreadyRegisteredRef.current) return;
        // Registration check failed (e.g. challenge not found, API error) -> send to challenges list
        const challengesPath = appendUtmToPath("/challenges", getUtmQueryString(searchParams));
        router.replace(challengesPath);
      });
  }, [challengeId, dispatch, reduxPhone, router, searchParams]);

  useEffect(() => {
    if (challengeId) {
      setFetchSettled(false);
      dispatch(fetchChallengeDetails(challengeId));
    } else {
      setLocalError("Challenge ID is required");
    }
    return () => dispatch(clearError());
  }, [challengeId, dispatch]);

  // Mark fetch as settled when loading finishes (so we don't redirect before first load completes)
  useEffect(() => {
    if (challengeId && !challengeLoading) setFetchSettled(true);
  }, [challengeId, challengeLoading]);

  // Redirect to challenges list when no id, fetch failed, or challenge has ended (preserve UTMs)
  useEffect(() => {
    if (redirectFallbackRef.current) {
      clearTimeout(redirectFallbackRef.current);
      redirectFallbackRef.current = null;
    }
    const utmQ = getUtmQueryString(searchParams);
    const challengesPath = appendUtmToPath("/challenges", utmQ);

    const doRedirect = () => {
      router.replace(challengesPath);
      // Fallback: if Next.js router doesn't navigate within 2.5s, force navigation (avoids stuck "Taking you to challenges...")
      redirectFallbackRef.current = setTimeout(() => {
        if (typeof window !== "undefined") window.location.assign(challengesPath);
      }, 2500);
    };

    if (!challengeId) {
      doRedirect();
      return () => { if (redirectFallbackRef.current) clearTimeout(redirectFallbackRef.current); };
    }
    if (!challengeLoading && challengeId && fetchSettled) {
      if (!challenge) {
        doRedirect();
        return () => { if (redirectFallbackRef.current) clearTimeout(redirectFallbackRef.current); };
      }
      // Only treat as ended when the loaded challenge matches this page (avoid stale Redux challenge from another id)
      const isCurrentChallenge = challenge && String(challenge.id) === String(challengeId);
      const endAt = isCurrentChallenge ? challenge.challenge_end_at : null;
      if (endAt && new Date(endAt).getTime() <= Date.now()) {
        doRedirect();
        return () => { if (redirectFallbackRef.current) clearTimeout(redirectFallbackRef.current); };
      }
    }
    return () => { if (redirectFallbackRef.current) clearTimeout(redirectFallbackRef.current); };
  }, [challengeId, challengeLoading, challenge, fetchSettled, router, searchParams]);

  useEffect(() => {
    if (isVerified) {
      setOtpVerified(true);
      setOtpStep("verified");
    }
  }, [isVerified]);

  const handlePhoneChange = (e) => {
    setPhoneLocal(parsePhoneInputValue(e.target.value));
    setLocalError(null);
    dispatch(clearError());
    if (otpStep !== "phone") {
      setOtpStep("phone");
      resetOtp();
      setIsRegistered(false);
      setFormData(initialFormData);
      setPendingRegistrationData(null);
      setPendingAction(null);
      if (challengeId && phone) clearVerification(phone, challengeId);
    }
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === "year_of_passing" ? (value === "" ? "" : value) : value,
    }));
  };

  const handleSendOTP = async () => {
    setLocalError(null);
    dispatch(clearError());
    if (!phone.trim()) {
      setLocalError("Please enter your phone number to send OTP");
      return;
    }
    if (!validateIndianPhoneNumber(phone)) {
      setLocalError("Please enter a valid 10-digit mobile number");
      return;
    }
    const result = await sendOTP(formatPhoneNumber(phone));
    if (result?.success) {
      setOtpStep("otp");
      return;
    }
    if (result?.code === "already_in_a_batch") {
      setOtpStep("phone");
      setShowBatchStudentModal(true);
      setLocalError("This challenge is for new participants only. You're already a 10000 Coders student — share the link with friends!");
      return;
    }
    setLocalError(otpError || reduxError || "Failed to send OTP. Please try again.");
  };

  const handleVerifyOTP = async (code) => {
    setLocalError(null);
    dispatch(clearError());
    setOtpCode(code);
    if (!code || code.length !== 6) {
      setLocalError("Please enter a valid 6-digit OTP code");
      return;
    }

    const success = await verifyOTP(code);

    if (success) {
      dispatch(setPhone(phone));
      storeVerification(phone, challengeId);

      // OTP verified; now register if required
      if (pendingAction === "register_after_otp" && pendingRegistrationData) {
        try {
          const regResult = await dispatch(registerUser(pendingRegistrationData)).unwrap();

          if (regResult?.user_id) dispatch(setUserId(regResult.user_id));
          if (regResult?.registration_id) dispatch(setRegistrationId(regResult.registration_id));
          if (pendingRegistrationData?.name) dispatch(setUserName(pendingRegistrationData.name));

          userAlreadyRegisteredRef.current = true;
          setIsRegistered(true);
          setOtpVerified(true);
          setOtpStep("verified");
          setPendingRegistrationData(null);
          setPendingAction(null);
          setLocalError(null);
          return;
        } catch (error) {
          if (error?.already_registered) {
            try {
              const statusResult = await dispatch(checkRegistrationStatus({ challengeId: parseInt(challengeId), phone: formatPhoneNumber(phone) })).unwrap();
              if (statusResult?.is_registered && statusResult?.registration_id) {
                dispatch(clearError());
                if (statusResult.user_id) dispatch(setUserId(statusResult.user_id));
                dispatch(setRegistrationId(statusResult.registration_id));
                if (statusResult.user_name) dispatch(setUserName(statusResult.user_name));
                userAlreadyRegisteredRef.current = true;
                setIsRegistered(true);
                setOtpVerified(true);
                setOtpStep("verified");
                setPendingRegistrationData(null);
                setPendingAction(null);
                setLocalError(null);
                return;
              }
            } catch (_) {}
          }
          setLocalError(typeof error === 'object' && error?.message ? error.message : error?.message || "Registration failed. Please try again.");
          setOtpVerified(false);
          setOtpStep("phone");
          setPendingRegistrationData(null);
          setPendingAction(null);
          return;
        }
      }

      // Already registered: OTP verified, allow entry
      if (pendingAction === "enter_registered") {
        userAlreadyRegisteredRef.current = true;
        setIsRegistered(true);
      }

      setOtpVerified(true);
      setOtpStep("verified");
      setLocalError(null);
      setPendingRegistrationData(null);
      setPendingAction(null);
    }
  };

  const handleSendOTPFromDetails = async () => {
    if (!phone.trim() || phone.length !== 10) {
      setLocalError("Please enter a valid 10-digit mobile number");
      return;
    }
    if (!formData.name.trim()) {
      setLocalError("Please enter your name");
      return;
    }
    const emailTrim = (formData.email || "").trim();
    if (!emailTrim) {
      setLocalError("Please enter your email");
      return;
    }
    if (!isValidEmail(formData.email)) {
      setLocalError("Please enter a valid email address");
      return;
    }
    if (!(formData.address || "").trim()) {
      setLocalError("Please enter your address");
      return;
    }
    if (!(formData.qualification || "").trim()) {
      setLocalError("Please enter your qualification");
      return;
    }
    if (!(formData.college_name || "").trim()) {
      setLocalError("Please enter your college name");
      return;
    }
    const yop = formData.year_of_passing;
    if (yop === "" || yop == null || String(yop).trim() === "") {
      setLocalError("Please enter year of passing");
      return;
    }
    const yearNum = Number(yop);
    if (Number.isNaN(yearNum) || yearNum < 1900 || yearNum > 2100) {
      setLocalError("Please enter a valid year of passing (1900–2100)");
      return;
    }
    setLocalError(null);
    dispatch(clearError());

    const registrationData = {
      name: formData.name.trim(),
      email: emailTrim,
      address: (formData.address || "").trim(),
      qualification: (formData.qualification || "").trim(),
      college_name: (formData.college_name || "").trim(),
      year_of_passing: yearNum,
      phone: formatPhoneNumber(phone) || phone.trim(),
      challenge_id: parseInt(challengeId),
      ...getUtmParams(),
    };

    // Send OTP first; only show OTP screen if successful (batch students stay on form with clear message)
    const result = await sendOTP(formatPhoneNumber(phone) || phone.trim());
    if (!result?.success) {
      if (result?.code === "already_in_a_batch") {
        setShowBatchStudentModal(true);
        setLocalError("This challenge is for new participants only. You're already a 10000 Coders student — share the link with friends!");
        return;
      }
      setLocalError(otpError || "Failed to send OTP. Please try again.");
      return;
    }
    setPendingRegistrationData(registrationData);
    setPendingAction("register_after_otp");
    setOtpStep("otp");
    setOtpCode("");
  };

  const rawError = localError || reduxError || otpError;
  const displayError = !rawError ? null : typeof rawError === "string" ? rawError : (rawError?.message != null ? String(rawError.message) : "Something went wrong.");

  // Only consider ended when loaded challenge matches this page (avoid stale state after refresh/navigation)
  const isCurrentChallenge = challenge && String(challenge.id) === String(challengeId);
  const challengeEnded = isCurrentChallenge && challenge?.challenge_end_at && new Date(challenge.challenge_end_at).getTime() <= Date.now();
  const startAtMs = isCurrentChallenge && challenge?.challenge_start_at ? new Date(challenge.challenge_start_at).getTime() : null;
  const challengeNotStarted = startAtMs != null && startAtMs > now;
  const shouldRedirect = !challengeId || (fetchSettled && !challengeLoading && (!challenge || challengeEnded));
  const waitingForFetch = challengeId && !fetchSettled;

  // Tick every second when showing "test will start in" so countdown updates
  useEffect(() => {
    if (!challengeNotStarted || !(otpVerified && isRegistered)) return;
    setNow(Date.now());
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [challengeNotStarted, otpVerified, isRegistered]);

  // Loading Screen (while fetching, or while redirecting so we don't flash the form)
  if (challengeLoading || waitingForFetch || shouldRedirect) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">
            {shouldRedirect && !challengeLoading ? "Taking you to challenges..." : "Preparing your challenge environment..."}
          </p>
        </div>
      </div>
    );
  }

  const handleSessionInvalid = () => {
    userAlreadyRegisteredRef.current = false;
    setLocalError(null);
    dispatch(clearError());
    setIsRegistered(false);
    setOtpVerified(false);
    setOtpStep("phone");
    setPendingRegistrationData(null);
    setPendingAction(null);
  };

  // Challenge Verified -> Main Interface (only when challenge has started)
  if (otpVerified && isRegistered && !challengeNotStarted) {
    return (
      <div className="fixed inset-0 overflow-hidden">
        <ChallengeInterface challengeId={challengeId} onSessionInvalid={handleSessionInvalid} utmQuery={getUtmQueryString(searchParams)} />
      </div>
    );
  }

  // OTP / Login Screen
  return (
    <div className="h-svh lg:h-screen grid grid-cols-1 lg:grid-cols-2 bg-white overflow-x-hidden">
      <BatchStudentShareModal
        open={showBatchStudentModal}
        onClose={() => setShowBatchStudentModal(false)}
        referrerBatch={searchParams.get("utm_campaign") || undefined}
        referrerName={searchParams.get("utm_term") || undefined}
      />
      {/* Left Panel - Immersive Visual */}
      <div className="relative hidden lg:flex flex-col justify-end p-12 lg:p-16 overflow-hidden bg-gray-900">
        <div className="absolute inset-0">
          <img
            src="/coding/DSC_5858.webp"
            alt="Coding World"
            className="w-full h-full object-cover opacity-60"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/80 to-transparent"></div>
        </div>

        <div className="relative z-10 max-w-lg">
          <img
            src="/logos/10k_logo_white.webp"
            alt="10000Coders"
            className="h-16 mb-8"
          />
          <h1 className="text-4xl lg:text-5xl font-bold text-white mb-6 leading-tight">
            {challenge?.title || 'Challenge'}<br />
            Your Skills.<br />
            <span className="text-orange-500">Master the Code.</span>
          </h1>
          <p className="text-gray-300 text-lg leading-relaxed mb-8">
            Enter the arena where logic meets creativity. Solve real-world challenges, track your progress, and join a community of elite developers.
          </p>
          <div className="flex gap-4">
            <div className="px-4 py-2 bg-white/10 backdrop-blur-md rounded-lg border border-white/20 text-white text-sm font-medium flex items-center gap-2">
              Live Challenge
            </div>
            <div className="px-4 py-2 bg-white/10 backdrop-blur-md rounded-lg border border-white/20 text-white text-sm font-medium flex items-center gap-2">
              Real-time Evaluation
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Interaction Zone (only card content scrolls on small screens) */}
      <div className="relative flex flex-col h-full min-h-0 p-4 sm:p-8 md:p-10 lg:p-24 bg-gray-50 lg:bg-white overflow-hidden">
        {/* Mobile/Tablet Background Image */}
        <div className="lg:hidden absolute inset-0">
          <img
            src="/coding/glasses-near-laptop-reflect-light-from-screen-dark-copy-space.webp"
            alt="Coding background"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-linear-to-b from-gray-900/70 via-gray-900/55 to-gray-900/70"></div>
        </div>

        {/* Mobile Background Decorations */}
        <div className="lg:hidden absolute top-0 right-0 -mr-16 -mt-16 w-52 h-52 sm:-mr-20 sm:-mt-20 sm:w-64 sm:h-64 bg-orange-100 rounded-full blur-3xl opacity-60 pointer-events-none"></div>
        <div className="lg:hidden absolute bottom-0 left-0 -ml-16 -mb-16 w-52 h-52 sm:-ml-20 sm:-mb-20 sm:w-64 sm:h-64 bg-blue-100 rounded-full blur-3xl opacity-60 pointer-events-none"></div>

        <div className="relative z-10 max-w-md w-full mx-auto h-full min-h-0 flex flex-col">
          <div className="bg-white/95 backdrop-blur-md lg:bg-transparent p-5 sm:p-6 lg:p-0 rounded-2xl lg:rounded-none shadow-lg lg:shadow-none border border-white/20 lg:border-none flex flex-col h-full min-h-0">
            {/* Mobile Logo */}
            <div className="lg:hidden mb-8 sm:mb-12 flex justify-center flex-shrink-0">
              <img
                src="/logos/10k_logo_black.webp"
                alt="10000Coders"
                className="h-14 w-auto"
              />
            </div>

            <div className="scrollbar-hide flex-1 min-h-0 overflow-y-auto">
              {/* Timer in form section when challenge not started yet (verified + registered) */}
              {otpVerified && isRegistered && challengeNotStarted && startAtMs != null ? (
                <div className="text-center py-6 sm:py-8">
                  <div className="animate-pulse rounded-full h-14 w-14 sm:h-16 sm:w-16 bg-orange-100 mx-auto mb-4 sm:mb-6 flex items-center justify-center">
                    <span className="text-xl sm:text-2xl">⏱</span>
                  </div>
                  <h2 className="text-lg sm:text-xl font-semibold text-gray-800 mb-2">Test will start in</h2>
                  <p className="text-2xl sm:text-3xl font-mono font-bold text-orange-600 mb-3 sm:mb-4 tabular-nums">
                    {formatCountdown(Math.max(0, startAtMs - now))}
                  </p>
                  <p className="text-gray-500 text-sm">Stay on this page. The challenge will begin automatically.</p>
                </div>
              ) : (
              <>
              <div className="mb-8 sm:mb-10">
                <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
                  {otpStep === "otp" ? "Verify your number" : "Join the challenge"}
                </h2>
                <p className="text-sm sm:text-base text-gray-600">
                  {otpStep === "otp"
                    ? `Enter the 6-digit code we sent to  ${formatPhoneInputDisplay(phone).trim()}`
                    : "Share your details below. We'll send a one-time code to your phone to verify and get you in."}
                </p>
              </div>

              {displayError && (
                <div className="mb-5 sm:mb-6 p-3 sm:p-4 rounded-xl bg-red-50 border border-red-200 flex items-start gap-3">
                  <div className="text-red-500 mt-1">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <p className="text-sm text-red-700 font-medium leading-snug">{displayError}</p>
                </div>
              )}

              <div className="space-y-5 sm:space-y-6">
                {otpStep !== "otp" ? (
                  <form onSubmit={(e) => { e.preventDefault(); handleSendOTPFromDetails(); }} className="animate-fadeIn space-y-3 sm:space-y-4">
                <div>
                  <label htmlFor="phone" className="block text-sm font-semibold text-gray-900 mb-2">Mobile Number (India only) *</label>
                  <p className="text-xs text-gray-500 mb-1">10-digit number.</p>
                  <div className="flex rounded-xl border border-gray-200 bg-gray-50 overflow-hidden focus-within:ring-2 focus-within:ring-gray-900 focus-within:border-transparent">
                    <span className="inline-flex items-center pl-4 text-gray-500"><FaPhone className="h-5 w-5 mr-2" /></span>
                    <input type="tel" id="phone" value={formatPhoneInputDisplay(phone)} onChange={handlePhoneChange} maxLength={14} inputMode="numeric" pattern="[0-9 ]*" className="flex-1 min-w-0 pr-4 py-3 bg-transparent text-gray-900 font-medium outline-none placeholder:text-gray-400" placeholder="91 98765 43210" />
                  </div>
                </div>
                <div>
                  <label htmlFor="name" className="block text-sm font-semibold text-gray-900 mb-2">Full Name *</label>
                  <input type="text" id="name" name="name" value={formData.name} onChange={handleFormChange} required className="block w-full px-4 py-3 sm:py-3.5 bg-gray-50 border border-gray-200 text-gray-900 rounded-xl focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none font-medium" placeholder="John Doe" />
                </div>
                <div>
                  <label htmlFor="email" className="block text-sm font-semibold text-gray-900 mb-2">Email *</label>
                  <input type="email" id="email" name="email" value={formData.email} onChange={handleFormChange} required className="block w-full px-4 py-3 sm:py-3.5 bg-gray-50 border border-gray-200 text-gray-900 rounded-xl focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none font-medium" placeholder="john@example.com" />
                </div>
                <div>
                  <label htmlFor="address" className="block text-sm font-semibold text-gray-900 mb-2">Address *</label>
                  <textarea id="address" name="address" value={formData.address} onChange={handleFormChange} rows={2} required className="block w-full px-4 py-3 sm:py-3.5 bg-gray-50 border border-gray-200 text-gray-900 rounded-xl focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none font-medium" placeholder="Your address" />
                </div>
                <div>
                  <label htmlFor="qualification" className="block text-sm font-semibold text-gray-900 mb-2">Qualification *</label>
                  <input type="text" id="qualification" name="qualification" value={formData.qualification} onChange={handleFormChange} required className="block w-full px-4 py-3 sm:py-3.5 bg-gray-50 border border-gray-200 text-gray-900 rounded-xl focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none font-medium" placeholder="e.g. B.Tech" />
                </div>
                <div>
                  <label htmlFor="college_name" className="block text-sm font-semibold text-gray-900 mb-2">College name *</label>
                  <input type="text" id="college_name" name="college_name" value={formData.college_name} onChange={handleFormChange} required className="block w-full px-4 py-3 sm:py-3.5 bg-gray-50 border border-gray-200 text-gray-900 rounded-xl focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none font-medium" placeholder="Your college name" />
                </div>
                <div>
                  <label htmlFor="year_of_passing" className="block text-sm font-semibold text-gray-900 mb-2">Year of passing *</label>
                  <input type="number" id="year_of_passing" name="year_of_passing" value={formData.year_of_passing} onChange={handleFormChange} min={1900} max={2100} required className="block w-full px-4 py-3 sm:py-3.5 bg-gray-50 border border-gray-200 text-gray-900 rounded-xl focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none font-medium" placeholder="2024" />
                </div>
                <button type="submit" disabled={otpLoading || !phone.trim() || phone.length !== 10 || !formData.name.trim() || !(formData.email || "").trim() || !(formData.address || "").trim() || !(formData.qualification || "").trim() || !(formData.college_name || "").trim() || formData.year_of_passing === "" || formData.year_of_passing == null} className="w-full flex items-center justify-center px-6 sm:px-8 py-3.5 sm:py-4 bg-gray-900 hover:bg-gray-800 text-white font-bold rounded-xl transition-all shadow-md hover:shadow-lg disabled:bg-gray-300 disabled:cursor-not-allowed transform hover:-translate-y-0.5 active:translate-y-0 mt-4">
                  {otpLoading ? <><FaSpinner className="animate-spin mr-3" /> Sending OTP...</> : <>Send OTP & enter challenge <FaArrowLeft className="ml-2 rotate-180" /></>}
                </button>
              </form>
            ) : (
              <div className="animate-fadeIn">
                <div className="mb-6 sm:mb-8">
                  <label className="block text-sm font-semibold text-gray-900 mb-3">
                    One-Time Password
                  </label>
                  <OTPInput 
                    value={otpCode} 
                    onChange={setOtpCode} 
                    onComplete={handleVerifyOTP}
                    error={displayError}
                    onClearError={() => {
                      setLocalError(null);
                      dispatch(clearError());
                      clearOtpError();
                    }}
                  />
                </div>

                <button
                  onClick={() => handleVerifyOTP(otpCode)}
                  disabled={otpLoading || otpCode.length !== 6}
                  className="w-full flex items-center justify-center px-6 sm:px-8 py-3.5 sm:py-4 bg-gray-900 hover:bg-gray-800 text-white font-bold rounded-xl transition-all shadow-md hover:shadow-lg disabled:bg-gray-300 disabled:cursor-not-allowed transform hover:-translate-y-0.5 active:translate-y-0 mb-6"
                >
                  {otpLoading ? (
                    <>
                      <FaSpinner className="animate-spin mr-3" />
                      Verifying...
                    </>
                  ) : (
                    <>
                      Verify & Enter
                      <FaLock className="ml-2" />
                    </>
                  )}
                </button>

                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-sm font-medium">
                  <button
                    onClick={() => {
                      setOtpStep("phone");
                      resetOtp();
                      setIsRegistered(false);
                      setOtpCode("");
                      setOtpVerified(false);
                      setPendingRegistrationData(null);
                      setPendingAction(null);
                    }}
                    className="text-gray-500 hover:text-gray-900 transition-colors"
                  >
                    Change number
                  </button>

                  <div className="sm:text-right">
                    {countdown > 0 ? (
                      <span className="text-gray-400">Resend code in {countdown}s</span>
                    ) : (
                      <button
                        onClick={() => {
                          handleSendOTP();
                          setOtpCode("");
                        }}
                        disabled={otpLoading}
                        className="text-orange-600 hover:text-orange-700 transition-colors"
                      >
                        Resend Code
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
              </div>
              </>
              )}
            </div>

            <div className="mt-8 sm:mt-12 pt-6 sm:pt-8 border-t border-gray-100 text-center flex-shrink-0">
              <p className="text-xs text-gray-400">
                Protected by 10000Coders Secure Login System.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

