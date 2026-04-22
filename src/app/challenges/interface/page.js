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
  FaPhone,
  FaLock,
  FaLaptop,
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
import { CHALLENGE_ENTRY_COPY as ENTRY } from "./challengeEntryCopy";

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
    registerLoading,
    phone: reduxPhone,
    error: reduxError,
  } = useSelector((state) => ({
    currentChallenge: state.publicChallenge.currentChallenge,
    loading: Boolean(state.publicChallenge.loading?.challengeDetails),
    registerLoading: Boolean(state.publicChallenge.loading?.register),
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
  /** After valid phone + registration-status API: show extra fields only when not yet registered for this challenge. */
  const [phoneGatePassed, setPhoneGatePassed] = useState(false);
  const [checkingRegistration, setCheckingRegistration] = useState(false);

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
  } = usePhoneOTP({ blockBatchStudents: false });

  useEffect(() => {
    setPhoneGatePassed(false);
  }, [challengeId]);

  // Check verification on mount (restore from storage and sync registration status)
  /* eslint-disable react-hooks/exhaustive-deps -- reduxPhone omitted on purpose (see comment before deps) */
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

        if (result.user_name) dispatch(setUserName(result.user_name));
        if (user_id) dispatch(setUserId(user_id));

        if (result.is_registered && registration_id) {
          dispatch(setRegistrationId(registration_id));
          userAlreadyRegisteredRef.current = true;
          setIsRegistered(true);
          setOtpStep("verified");
          return;
        }

        // Not registered for this challenge: show full details form (session already OTP-verified)
        if (!result.is_registered) {
          setFormData((prev) => ({
            ...prev,
            name: result.user_name || prev.name,
            email:
              result.user_email != null && String(result.user_email).trim() !== ""
                ? String(result.user_email).trim()
                : prev.email,
          }));
          setPhoneGatePassed(true);
          setOtpStep("phone");
          return;
        }

        setOtpStep("phone");
      })
      .catch((err) => {
        if (userAlreadyRegisteredRef.current) return;
        // Registration check failed (e.g. challenge not found, API error) -> send to challenges list
        const challengesPath = appendUtmToPath("/challenges", getUtmQueryString(searchParams));
        router.replace(challengesPath);
      });
    // Intentionally omit reduxPhone: dispatch(setPhone) after OTP must not re-run this effect
    // while registerUser is still in flight — checkRegistrationStatus can briefly return
    // is_registered: false and incorrectly reopen the details form.
  }, [challengeId, dispatch, router, searchParams]);
  /* eslint-enable react-hooks/exhaustive-deps */

  useEffect(() => {
    if (challengeId) {
      setFetchSettled(false);
      dispatch(fetchChallengeDetails(challengeId));
    } else {
      setLocalError(ENTRY.validation.challengeIdRequired);
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
      setPhoneGatePassed(false);
      setFormData(initialFormData);
      setPendingRegistrationData(null);
      setPendingAction(null);
      if (challengeId && phone) clearVerification(phone, challengeId);
    }
  };

  /** After registration check: go back to phone-only step if the number was wrong (do not clear phone so user can fix it). */
  const handleChangeMobileNumber = () => {
    setLocalError(null);
    dispatch(clearError());
    setPhoneGatePassed(false);
    setFormData(initialFormData);
    setPendingRegistrationData(null);
    setPendingAction(null);
    resetOtp();
    setOtpVerified(false);
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
      setLocalError(ENTRY.validation.mobileRequired);
      return;
    }
    if (!validateIndianPhoneNumber(phone)) {
      setLocalError(ENTRY.validation.mobileInvalid);
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
      setLocalError(ENTRY.validation.batchStudent);
      return;
    }
    setLocalError(otpError || reduxError || ENTRY.validation.sendCodeFailed);
  };

  /** Step 1: validate phone, check server, then either OTP-only (already registered) or show full details form. */
  const handlePhoneContinue = async () => {
    setLocalError(null);
    dispatch(clearError());
    if (!phone.trim()) {
      setLocalError(ENTRY.validation.mobileRequired);
      return;
    }
    if (!validateIndianPhoneNumber(phone)) {
      setLocalError(ENTRY.validation.mobileInvalid);
      return;
    }
    if (!challengeId) return;

    const phoneForApi = formatPhoneNumber(phone) || phone.trim();
    setCheckingRegistration(true);
    try {
      const result = await dispatch(
        checkRegistrationStatus({ challengeId: parseInt(challengeId, 10), phone: phoneForApi })
      ).unwrap();

      if (result.is_registered && result.registration_id) {
        if (result.user_id) dispatch(setUserId(result.user_id));
        dispatch(setRegistrationId(result.registration_id));
        if (result.user_name) dispatch(setUserName(result.user_name));

        const otpResult = await sendOTP(phoneForApi);
        if (!otpResult?.success) {
          if (otpResult?.code === "already_in_a_batch") {
            setShowBatchStudentModal(true);
            setLocalError(ENTRY.validation.batchStudent);
            return;
          }
          setLocalError(otpError || reduxError || ENTRY.validation.sendCodeFailed);
          return;
        }
        setPendingAction("enter_registered");
        setOtpStep("otp");
        setOtpCode("");
        return;
      }

      if (!result.is_registered) {
        setFormData((prev) => ({
          ...initialFormData,
          name: result.user_name || "",
          email:
            result.user_email != null && String(result.user_email).trim() !== ""
              ? String(result.user_email).trim()
              : "",
        }));
        setPhoneGatePassed(true);
        return;
      }

      setLocalError(ENTRY.validation.registrationCheckFailed);
    } catch {
      setLocalError(reduxError || ENTRY.validation.registrationCheckError);
    } finally {
      setCheckingRegistration(false);
    }
  };

  const handleVerifyOTP = async (code) => {
    setLocalError(null);
    dispatch(clearError());
    setOtpCode(code);
    if (!code || code.length !== 6) {
      setLocalError(ENTRY.validation.otpLength);
      return;
    }

    const success = await verifyOTP(code);

    if (success) {
      // OTP verified; register first when needed — only then persist phone + storage so the
      // restore effect cannot race ahead of registration and reopen the form.
      if (pendingAction === "register_after_otp" && pendingRegistrationData) {
        try {
          const regResult = await dispatch(registerUser(pendingRegistrationData)).unwrap();

          if (regResult?.user_id) dispatch(setUserId(regResult.user_id));
          if (regResult?.registration_id) dispatch(setRegistrationId(regResult.registration_id));
          if (pendingRegistrationData?.name) dispatch(setUserName(pendingRegistrationData.name));

          // Refetch challenge so start times are current; pending clears `currentChallenge` and shows this page’s loader instead of the form briefly before the countdown.
          try {
            await dispatch(fetchChallengeDetails({ challengeId, preserveExisting: true })).unwrap();
          } catch {
            /* non-fatal: countdown still uses previously loaded challenge if refetch fails */
          }

          dispatch(setPhone(phone));
          storeVerification(phone, challengeId);

          userAlreadyRegisteredRef.current = true;
          setIsRegistered(true);
          setOtpVerified(true);
          setOtpStep("verified");
          setPendingRegistrationData(null);
          setPendingAction(null);
          setPhoneGatePassed(false);
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
                try {
                  await dispatch(fetchChallengeDetails({ challengeId, preserveExisting: true })).unwrap();
                } catch (_) {}
                userAlreadyRegisteredRef.current = true;
                setIsRegistered(true);
                setOtpVerified(true);
                setOtpStep("verified");
                setPendingRegistrationData(null);
                setPendingAction(null);
                setPhoneGatePassed(false);
                setLocalError(null);
                return;
              }
            } catch (_) {}
          }
          setLocalError(
            typeof error === "object" && error?.message
              ? error.message
              : error?.message || ENTRY.validation.registrationSaveFailed
          );
          setOtpVerified(false);
          setOtpStep("phone");
          setPendingRegistrationData(null);
          setPendingAction(null);
          setPhoneGatePassed(false);
          return;
        }
      }

      // Already registered for this challenge: OTP verified, allow entry (no register API call)
      if (pendingAction === "enter_registered") {
        try {
          await dispatch(fetchChallengeDetails({ challengeId, preserveExisting: true })).unwrap();
        } catch {
          /* non-fatal */
        }
        dispatch(setPhone(phone));
        storeVerification(phone, challengeId);
        userAlreadyRegisteredRef.current = true;
        setIsRegistered(true);
        setOtpVerified(true);
        setOtpStep("verified");
        setLocalError(null);
        setPendingRegistrationData(null);
        setPendingAction(null);
        setPhoneGatePassed(false);
        return;
      }

      dispatch(setPhone(phone));
      storeVerification(phone, challengeId);

      setOtpVerified(true);
      setOtpStep("verified");
      setLocalError(null);
      setPendingRegistrationData(null);
      setPendingAction(null);
    }
  };

  const handleSendOTPFromDetails = async () => {
    if (!phoneGatePassed) {
      setLocalError(ENTRY.validation.continueMobileFirst);
      return;
    }
    if (!phone.trim() || phone.length !== 10) {
      setLocalError(ENTRY.validation.mobileInvalid);
      return;
    }
    if (!formData.name.trim()) {
      setLocalError(ENTRY.validation.nameRequired);
      return;
    }
    const emailTrim = (formData.email || "").trim();
    if (!emailTrim) {
      setLocalError(ENTRY.validation.emailRequired);
      return;
    }
    if (!isValidEmail(formData.email)) {
      setLocalError(ENTRY.validation.emailInvalid);
      return;
    }
    if (!(formData.address || "").trim()) {
      setLocalError(ENTRY.validation.addressRequired);
      return;
    }
    if (!(formData.qualification || "").trim()) {
      setLocalError(ENTRY.validation.qualificationRequired);
      return;
    }
    if (!(formData.college_name || "").trim()) {
      setLocalError(ENTRY.validation.institutionRequired);
      return;
    }
    const yop = formData.year_of_passing;
    if (yop === "" || yop == null || String(yop).trim() === "") {
      setLocalError(ENTRY.validation.yearRequired);
      return;
    }
    const yearNum = Number(yop);
    if (Number.isNaN(yearNum) || yearNum < 1900 || yearNum > 2100) {
      setLocalError(ENTRY.validation.yearRange);
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
        setLocalError(ENTRY.validation.batchStudent);
        return;
      }
      setLocalError(otpError || ENTRY.validation.sendCodeFailed);
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

  // Tick every second when showing countdown before challenge start
  useEffect(() => {
    if (!challengeNotStarted || !(otpVerified && isRegistered)) return;
    setNow(Date.now());
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [challengeNotStarted, otpVerified, isRegistered]);

  // Full-page loader only for first challenge load, wait-for-fetch, or redirect — not for soft refetch / register (those use the in-card overlay)
  const blockingChallengeLoad = Boolean(challengeLoading && !challenge);
  if (blockingChallengeLoad || waitingForFetch || shouldRedirect) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-orange-600"></div>
          <p className="font-medium text-gray-600">
            {shouldRedirect && !challengeLoading ? ENTRY.loading.redirect : ENTRY.loading.preparing}
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

  /** Phone-only or OTP: short card on desktop — centered, no flex stretch gap above the primary button */
  const compactEntryCardLayout =
    otpStep === "otp" || (otpStep === "phone" && !phoneGatePassed);

  /** Registration or soft challenge refetch: keep layout, show a light overlay on the card only */
  const cardSessionBusy = Boolean(registerLoading || (challengeLoading && challenge));

  // OTP / Login Screen
  return (
    <div className="grid h-dvh max-h-dvh min-h-0 w-full grid-cols-1 grid-rows-1 overflow-hidden bg-white lg:h-screen lg:max-h-none lg:grid-cols-2 lg:grid-rows-1">
      <BatchStudentShareModal
        open={showBatchStudentModal}
        onClose={() => setShowBatchStudentModal(false)}
        referrerBatch={searchParams.get("utm_campaign") || undefined}
        referrerName={searchParams.get("utm_term") || undefined}
      />
      {/* Left Panel — challenge context (desktop) */}
      <div className="relative hidden min-h-0 lg:flex lg:h-full lg:flex-col lg:justify-end lg:overflow-hidden bg-gray-900 p-12 lg:p-16">
        <div className="absolute inset-0">
          <img
            src="/coding/DSC_5858.webp"
            alt=""
            className="w-full h-full object-cover opacity-55"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-gray-900/85 to-gray-900/40"></div>
        </div>

        <div className="relative z-10 max-w-xl space-y-6">
          <img
            src="/logos/10k_logo_white.webp"
            alt="10000Coders"
            className="h-14 w-auto opacity-95"
          />
          <div className="space-y-3">
            <h1 className="text-3xl lg:text-4xl xl:text-[2.35rem] font-bold text-white leading-tight tracking-tight break-words">
              {challenge?.title || ENTRY.fallbackChallengeTitle}
            </h1>
            <p className="text-sm font-semibold text-orange-200/95 sm:text-base">{ENTRY.left.subtitle}</p>
            <p className="text-sm lg:text-base text-gray-300/95 leading-relaxed max-w-lg border-l-2 border-orange-500/70 pl-4">
              {ENTRY.left.description}
            </p>
          </div>
          <div className="flex flex-wrap gap-2 pt-1">
            <span className="inline-flex items-center rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-medium text-white/95 backdrop-blur-sm">
              {ENTRY.left.chipSecure}
            </span>
            <span className="inline-flex items-center rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-medium text-white/95 backdrop-blur-sm">
              {ENTRY.left.chipRealtime}
            </span>
          </div>
        </div>
      </div>

      {/* Right Panel — viewport locked; only the card body scrolls on small screens */}
      <div className="relative flex min-h-0 min-w-0 h-full max-h-full flex-col overflow-hidden bg-gray-100 p-4 pb-6 sm:p-6 sm:pb-8 md:p-8 lg:bg-gray-50/80 lg:p-14 lg:pb-8 xl:p-16">
        {/* Desktop-only ambient background */}
        <div className="pointer-events-none absolute inset-0 hidden lg:block">
          <img
            src="/coding/glasses-near-laptop-reflect-light-from-screen-dark-copy-space.webp"
            alt=""
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-linear-to-b from-gray-900/50 via-gray-900/35 to-gray-900/50"></div>
        </div>

        <div className="pointer-events-none absolute top-0 right-0 -mt-16 -mr-16 hidden h-52 w-52 rounded-full bg-orange-100/80 blur-3xl sm:-mt-20 sm:-mr-20 sm:h-64 sm:w-64 lg:block"></div>
        <div className="pointer-events-none absolute bottom-0 left-0 -mb-16 -ml-16 hidden h-52 w-52 rounded-full bg-blue-100/80 blur-3xl sm:-mb-20 sm:-ml-20 sm:h-64 sm:w-64 lg:block"></div>

        <div
          className={`relative z-10 mx-auto flex w-full min-h-0 flex-1 max-w-md flex-col justify-center lg:min-h-0 ${
            compactEntryCardLayout ? "lg:justify-center" : "lg:justify-start"
          }`}
        >
          <div
            className={`relative flex w-full min-h-0 flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white p-5 shadow-lg sm:p-6 max-lg:max-h-[min(calc(100dvh-2.5rem),calc(100svh-2.5rem))] lg:max-h-none lg:rounded-2xl lg:p-8 lg:shadow-sm ${
              compactEntryCardLayout ? "lg:flex-none lg:shadow-lg" : "lg:flex-1"
            }`}
          >
            {/* Mobile: compact brand only — full challenge story stays on desktop left panel */}
            <div className="mb-4 flex shrink-0 items-center justify-center border-b border-gray-200/80 pb-3 lg:hidden">
              <img
                src="/logos/10k_logo_black.webp"
                alt="10000Coders"
                className="h-9 w-auto"
              />
            </div>

            {/* Timer (full width when waiting for start) */}
            {otpVerified && isRegistered && challengeNotStarted && startAtMs != null ? (
              <div className="flex min-h-0 flex-1 flex-col justify-center py-6 text-center sm:py-8">
                <div
                  role="note"
                  className="mx-auto mb-5 flex w-full max-w-sm gap-3 rounded-xl border-2 border-amber-400 bg-linear-to-br from-amber-50 to-amber-100/80 p-3.5 text-left shadow-md ring-1 ring-amber-500/20 sm:mb-6 sm:p-4 lg:hidden"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-500 text-white shadow-sm sm:h-11 sm:w-11">
                    <FaLaptop className="h-4 w-4 sm:h-5 sm:w-5" aria-hidden />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-amber-950 sm:text-base">{ENTRY.laptopCallout.title}</p>
                    <p className="mt-1 text-xs leading-relaxed text-amber-900/95 sm:text-sm">{ENTRY.laptopCallout.body}</p>
                  </div>
                </div>
                <div className="animate-pulse rounded-full h-14 w-14 sm:h-16 sm:w-16 bg-orange-100 mx-auto mb-4 sm:mb-6 flex items-center justify-center">
                  <span className="text-xl sm:text-2xl">⏱</span>
                </div>
                <h2 className="text-lg sm:text-xl font-semibold text-gray-800 mb-2">{ENTRY.countdown.title}</h2>
                <p className="text-2xl sm:text-3xl font-mono font-bold text-orange-600 mb-3 sm:mb-4 tabular-nums">
                  {formatCountdown(Math.max(0, startAtMs - now))}
                </p>
                <p className="text-gray-500 text-sm">{ENTRY.countdown.helper}</p>
              </div>
            ) : (
              <div
                className={`flex min-h-0 flex-col overflow-hidden ${compactEntryCardLayout ? "lg:flex-none" : "flex-1"}`}
              >
                {/* Title: centered between logo and form */}
                <header className="flex shrink-0 flex-col items-center justify-center px-1 pb-2 pt-0 text-center lg:py-3 lg:pb-2 lg:pt-0">
                  <h2 className="text-xl font-bold tracking-tight text-gray-900 sm:text-2xl">
                    {otpStep === "otp"
                      ? ENTRY.otp.heading
                      : phoneGatePassed
                        ? ENTRY.step2.heading
                        : ENTRY.step1.heading}
                  </h2>
                  {challenge?.title && otpStep !== "otp" ? (
                    <p className="mt-1.5 max-w-sm text-center text-xs font-medium leading-snug text-gray-500 line-clamp-2 lg:hidden">
                      {challenge.title}
                    </p>
                  ) : null}
                  {otpStep !== "otp" && !phoneGatePassed ? (
                    <p className="mt-2 max-w-sm text-sm leading-relaxed text-gray-600">{ENTRY.step1.subheading}</p>
                  ) : null}
                  {otpStep !== "otp" && phoneGatePassed ? (
                    <p className="mt-2 max-w-sm text-sm leading-relaxed text-gray-600">{ENTRY.step2.subheading}</p>
                  ) : null}
                  {otpStep === "otp" ? (
                    <p className="mt-2 max-w-sm text-sm text-gray-600">
                      {ENTRY.otp.subheadingIntro}{" "}
                      <span className="font-semibold text-gray-900 whitespace-nowrap">
                        {(() => {
                          const formattedMobile = formatPhoneInputDisplay(phone);
                          return formattedMobile ? `+91 ${formattedMobile}` : "";
                        })()}
                      </span>
                    </p>
                  ) : null}
                </header>

                <div
                  role="note"
                  className="mx-auto mb-4 flex w-full max-w-sm shrink-0 gap-3 rounded-xl border-2 border-amber-400 bg-linear-to-br from-amber-50 to-amber-100/80 p-3.5 text-left shadow-md ring-1 ring-amber-500/20 sm:mb-5 sm:max-w-none sm:p-4 lg:hidden"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-500 text-white shadow-sm sm:h-11 sm:w-11">
                    <FaLaptop className="h-4 w-4 sm:h-5 sm:w-5" aria-hidden />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-amber-950 sm:text-base">{ENTRY.laptopCallout.title}</p>
                    <p className="mt-1 text-xs leading-relaxed text-amber-900/95 sm:text-sm">{ENTRY.laptopCallout.body}</p>
                  </div>
                </div>

                {/* Middle region scrolls; on desktop OTP we keep this compact so the footer sits under the code row */}
                <div
                  className={`scrollbar-hide flex min-h-0 flex-col overflow-y-auto overscroll-contain pr-0.5 [-webkit-overflow-scrolling:touch] ${
                    compactEntryCardLayout ? "max-lg:min-h-0 max-lg:flex-1 lg:min-h-0 lg:flex-none" : "min-h-0 flex-1"
                  }`}
                >
                  {displayError && (
                    <div className="mb-4 shrink-0 p-3 sm:mb-5 sm:p-4 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50">
                      <div className="mt-1 shrink-0 text-red-500">
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                      </div>
                      <p className="text-sm font-medium leading-snug text-red-700">{displayError}</p>
                    </div>
                  )}

                  <div
                    className={`flex flex-col ${compactEntryCardLayout ? "max-lg:min-h-0 max-lg:flex-1 max-lg:justify-center max-lg:py-6 lg:shrink-0 lg:justify-start lg:py-0" : "min-h-0 flex-1"}`}
                  >
                  <div
                    className={`space-y-4 pb-4 sm:space-y-5 sm:pb-6 lg:pb-8 ${
                      compactEntryCardLayout
                        ? otpStep === "otp"
                          ? "mx-auto w-full max-w-sm text-center lg:space-y-3 lg:pb-3"
                          : "mx-auto w-full max-w-sm text-left lg:space-y-3 lg:pb-3"
                        : ""
                    }`}
                  >
                    {otpStep !== "otp" ? (
                      <form
                        id="challenge-interface-register-form"
                        onSubmit={(e) => {
                          e.preventDefault();
                          if (!phoneGatePassed) {
                            handlePhoneContinue();
                          } else {
                            handleSendOTPFromDetails();
                          }
                        }}
                        className="animate-fadeIn space-y-4 sm:space-y-5"
                      >
                        <div className="rounded-xl border border-gray-200 bg-gray-50/90 p-4 shadow-sm ring-1 ring-black/[0.03] sm:p-5">
                        <div>
                          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                            <label htmlFor="phone" className="block text-sm font-semibold text-gray-900">
                              {ENTRY.step1.mobileLabel} <span className="text-red-600">*</span>
                            </label>
                            {phoneGatePassed ? (
                              <button
                                type="button"
                                onClick={handleChangeMobileNumber}
                                className="text-sm font-semibold text-orange-600 hover:text-orange-700 underline-offset-2 hover:underline"
                              >
                                {ENTRY.step2.changeMobile}
                              </button>
                            ) : null}
                          </div>
                          <div
                            className={`flex overflow-hidden rounded-xl border focus-within:border-gray-900 focus-within:ring-2 focus-within:ring-gray-900/10 ${
                              phoneGatePassed ? "border-gray-200 bg-gray-100" : "border-gray-300 bg-white"
                            }`}
                          >
                            <span className="inline-flex items-center pl-4 text-gray-500">
                              <FaPhone className="h-5 w-5 mr-2" />
                            </span>
                            <input
                              type="tel"
                              id="phone"
                              value={formatPhoneInputDisplay(phone)}
                              onChange={handlePhoneChange}
                              readOnly={phoneGatePassed}
                              maxLength={14}
                              inputMode="numeric"
                              pattern="[0-9 ]*"
                              autoComplete="tel"
                              aria-readonly={phoneGatePassed}
                              className={`flex-1 min-w-0 pr-4 py-3 bg-transparent text-gray-900 font-medium outline-none placeholder:text-gray-400 ${
                                phoneGatePassed ? "cursor-default" : ""
                              }`}
                              placeholder={ENTRY.step1.mobilePlaceholder}
                            />
                          </div>
                          {phoneGatePassed ? (
                            <p className="mt-1.5 text-xs leading-relaxed text-gray-500">
                              {ENTRY.step2.mobileCheckedHint}
                            </p>
                          ) : null}
                        </div>
                        {phoneGatePassed ? (
                        <>
                        <div>
                          <label htmlFor="name" className="block text-sm font-semibold text-gray-900 mb-2">
                            {ENTRY.step2.fullNameLabel} <span className="text-red-600">*</span>
                          </label>
                          <input
                            type="text"
                            id="name"
                            name="name"
                            value={formData.name}
                            onChange={handleFormChange}
                            required
                            autoComplete="name"
                            className="block w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10 sm:py-3.5"
                            placeholder={ENTRY.step2.fullNamePlaceholder}
                          />
                        </div>
                        <div>
                          <label htmlFor="email" className="block text-sm font-semibold text-gray-900 mb-2">
                            {ENTRY.step2.emailLabel} <span className="text-red-600">*</span>
                          </label>
                          <input
                            type="email"
                            id="email"
                            name="email"
                            value={formData.email}
                            onChange={handleFormChange}
                            required
                            autoComplete="email"
                            className="block w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10 sm:py-3.5"
                            placeholder={ENTRY.step2.emailPlaceholder}
                          />
                        </div>
                        <div>
                          <label htmlFor="address" className="block text-sm font-semibold text-gray-900 mb-2">
                            {ENTRY.step2.addressLabel} <span className="text-red-600">*</span>
                          </label>
                          <textarea
                            id="address"
                            name="address"
                            value={formData.address}
                            onChange={handleFormChange}
                            rows={2}
                            required
                            autoComplete="street-address"
                            className="block min-h-[4.5rem] w-full resize-y rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10 sm:py-3.5"
                            placeholder={ENTRY.step2.addressPlaceholder}
                          />
                        </div>
                        <div>
                          <label htmlFor="qualification" className="block text-sm font-semibold text-gray-900 mb-2">
                            {ENTRY.step2.qualificationLabel} <span className="text-red-600">*</span>
                          </label>
                          <input
                            type="text"
                            id="qualification"
                            name="qualification"
                            value={formData.qualification}
                            onChange={handleFormChange}
                            required
                            className="block w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10 sm:py-3.5"
                            placeholder={ENTRY.step2.qualificationPlaceholder}
                          />
                        </div>
                        <div>
                          <label htmlFor="college_name" className="block text-sm font-semibold text-gray-900 mb-2">
                            {ENTRY.step2.institutionLabel} <span className="text-red-600">*</span>
                          </label>
                          <input
                            type="text"
                            id="college_name"
                            name="college_name"
                            value={formData.college_name}
                            onChange={handleFormChange}
                            required
                            className="block w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10 sm:py-3.5"
                            placeholder={ENTRY.step2.institutionPlaceholder}
                          />
                        </div>
                        <div>
                          <label htmlFor="year_of_passing" className="block text-sm font-semibold text-gray-900 mb-2">
                            {ENTRY.step2.yearLabel} <span className="text-red-600">*</span>
                          </label>
                          <input
                            type="number"
                            id="year_of_passing"
                            name="year_of_passing"
                            value={formData.year_of_passing}
                            onChange={handleFormChange}
                            min={1900}
                            max={2100}
                            required
                            className="block w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10 sm:py-3.5"
                            placeholder={ENTRY.step2.yearPlaceholder}
                          />
                        </div>
                        </>
                        ) : null}
                        </div>
                      </form>
                    ) : (
                      <div className="animate-fadeIn">
                        <div className="mb-4 sm:mb-5 lg:mb-3">
                          <label className="mb-3 block text-sm font-semibold text-gray-900 lg:mb-2">
                            {ENTRY.otp.codeLabel}
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

                        <div className="flex flex-col items-center justify-center gap-3 pb-2 text-sm font-medium sm:flex-row sm:gap-8">
                          <button
                            type="button"
                            onClick={() => {
                              setOtpStep("phone");
                              resetOtp();
                              setIsRegistered(false);
                              setOtpCode("");
                              setOtpVerified(false);
                              setPendingRegistrationData(null);
                              setPendingAction(null);
                              setPhoneGatePassed(false);
                            }}
                            className="text-gray-500 transition-colors hover:text-gray-900"
                          >
                            {ENTRY.otp.changeMobile}
                          </button>
                          <div>
                            {countdown > 0 ? (
                              <span className="text-gray-400">
                                {ENTRY.otp.resendIn} {countdown}s
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  handleSendOTP();
                                  setOtpCode("");
                                }}
                                disabled={otpLoading}
                                className="text-orange-600 hover:text-orange-700 transition-colors"
                              >
                                {ENTRY.otp.resend}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  </div>
                </div>

                {/* Primary actions + footer: always visible below scroll */}
                <footer
                  className={`mt-4 shrink-0 space-y-3 border-t border-gray-200/90 pt-4 sm:mt-5 sm:space-y-3.5 sm:pt-5 ${
                    compactEntryCardLayout ? "lg:mt-3 lg:space-y-2.5 lg:pt-3" : ""
                  }`}
                >
                  {otpStep !== "otp" ? (
                    <button
                      type="submit"
                      form="challenge-interface-register-form"
                      disabled={
                        checkingRegistration ||
                        otpLoading ||
                        !phone.trim() ||
                        phone.length !== 10 ||
                        (phoneGatePassed &&
                          (!formData.name.trim() ||
                            !(formData.email || "").trim() ||
                            !(formData.address || "").trim() ||
                            !(formData.qualification || "").trim() ||
                            !(formData.college_name || "").trim() ||
                            formData.year_of_passing === "" ||
                            formData.year_of_passing == null))
                      }
                      className="w-full flex items-center justify-center rounded-xl bg-gray-900 px-6 py-3.5 text-sm font-semibold text-white shadow-md transition-all hover:bg-gray-800 hover:shadow-lg disabled:cursor-not-allowed disabled:bg-gray-300 sm:px-8 sm:py-4 sm:text-base"
                    >
                      {checkingRegistration ? (
                        <>
                          <FaSpinner className="mr-3 animate-spin" /> {ENTRY.step1.checking}
                        </>
                      ) : otpLoading ? (
                        <>
                          <FaSpinner className="mr-3 animate-spin" /> {ENTRY.step1.sendingCode}
                        </>
                      ) : phoneGatePassed ? (
                        ENTRY.step2.primaryButton
                      ) : (
                        ENTRY.step1.continue
                      )}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleVerifyOTP(otpCode)}
                      disabled={otpLoading || otpCode.length !== 6}
                      className="w-full flex items-center justify-center rounded-xl bg-gray-900 px-6 py-3.5 text-sm font-semibold text-white shadow-md transition-all hover:bg-gray-800 hover:shadow-lg disabled:cursor-not-allowed disabled:bg-gray-300 sm:px-8 sm:py-4 sm:text-base"
                    >
                      {otpLoading ? (
                        <>
                          <FaSpinner className="mr-3 animate-spin" />
                          {ENTRY.otp.verifying}
                        </>
                      ) : (
                        <>
                          {ENTRY.otp.verifyButton}
                          <FaLock className="ml-2 h-3.5 w-3.5 opacity-90" aria-hidden />
                        </>
                      )}
                    </button>
                  )}
                  <p className="text-center text-[11px] leading-relaxed text-gray-500 sm:text-xs">
                    {otpStep === "otp" || !phoneGatePassed ? ENTRY.step1.footer : ENTRY.step2.footer}
                  </p>
                </footer>
              </div>
            )}
            {cardSessionBusy ? (
              <div
                className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-2 rounded-2xl bg-white/85 px-4 backdrop-blur-[1px]"
                role="status"
                aria-live="polite"
                aria-busy="true"
              >
                <FaSpinner className="h-7 w-7 shrink-0 animate-spin text-orange-600 sm:h-8 sm:w-8" aria-hidden />
                <p className="max-w-[14rem] text-center text-xs font-medium text-gray-600 sm:max-w-none sm:text-sm">
                  {registerLoading ? ENTRY.loading.sessionSetup : ENTRY.loading.cardWait}
                </p>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

