"use client";
import React, { useState, useEffect } from "react";
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
import { formatPhoneNumber } from "@/services/phoneUtils";
import ChallengeInterface from "@/components/challenge/ChallengeInterface";
import {
  isVerifiedForChallenge,
  storeVerification,
  clearVerification,
  getStoredVerifications
} from "@/utils/verificationStorage";
import "@/styles/resizable-panels.css";

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
  const [otpStep, setOtpStep] = useState("phone"); // 'phone' | 'otp' | 'verified' | 'register'
  const [otpCode, setOtpCode] = useState("");
  const [localError, setLocalError] = useState(null);
  const [isRegistered, setIsRegistered] = useState(false);
  const [checkingRegistration, setCheckingRegistration] = useState(false);
  
  // New state for registration form
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [collegeName, setCollegeName] = useState("");
  const [showRegistrationForm, setShowRegistrationForm] = useState(false);

  const [pendingRegistrationData, setPendingRegistrationData] = useState(null);
  const [pendingAction, setPendingAction] = useState(null);

  // OTP hook
  const {
    sendOTP,
    verifyOTP,
    resendOTP,
    loading: otpLoading,
    error: otpError,
    isVerified,
    countdown,
    reset: resetOtp,
  } = usePhoneOTP();

  // Check verification on mount
  useEffect(() => {
    if (challengeId) {
      let verifiedPhone = null;
      if (reduxPhone) {
        if (isVerifiedForChallenge(reduxPhone, challengeId)) verifiedPhone = reduxPhone;
      }
      if (!verifiedPhone) {
        const verifications = getStoredVerifications();
        const challengeKey = String(challengeId);
        for (const key in verifications) {
          if (verifications[key].challengeId === challengeKey) {
            if (isVerifiedForChallenge(verifications[key].phone, challengeId)) {
              verifiedPhone = verifications[key].phone;
              break;
            }
          }
        }
      }

      if (verifiedPhone) {
        setOtpVerified(true);
        setIsRegistered(false);
        setOtpStep("verified");
        setPhoneLocal(verifiedPhone);
        dispatch(setPhone(verifiedPhone));

        dispatch(checkRegistrationStatus({ challengeId: parseInt(challengeId), phone: verifiedPhone }))
          .unwrap()
          .then((result) => {
            const { user_id, registration_id } = result;
            const userName = result.user_name;

            if (userName) dispatch(setUserName(userName));
            if (user_id) dispatch(setUserId(user_id));

            if (result.details_required) {
              setShowRegistrationForm(true);
              setOtpStep("register");
              return;
            }

            if (result.is_registered && registration_id) {
              dispatch(setRegistrationId(registration_id));
              setIsRegistered(true);
              setOtpStep("verified");
              return;
            }

            // OTP already verified, but registration doesn't exist yet -> register now
            if (userName) {
              const regData = {
                name: userName,
                phone: verifiedPhone,
                challenge_id: parseInt(challengeId),
              };
              dispatch(registerUser(regData))
                .unwrap()
                .then((regResult) => {
                  if (regResult?.user_id) dispatch(setUserId(regResult.user_id));
                  if (regResult?.registration_id) dispatch(setRegistrationId(regResult.registration_id));
                  setIsRegistered(true);
                  setOtpStep("verified");
                })
                .catch((err) => {
                  console.error('Failed to register after stored OTP verification:', err);
                  setOtpStep("phone");
                  setOtpVerified(false);
                });
            } else {
              setShowRegistrationForm(true);
              setOtpStep("register");
            }
          })
          .catch((err) => console.error('Failed to fetch registration details:', err));
      }
    }
  }, [challengeId, dispatch, reduxPhone]);

  useEffect(() => {
    if (challengeId) dispatch(fetchChallengeDetails(challengeId));
    else setLocalError("Challenge ID is required");
    return () => dispatch(clearError());
  }, [challengeId, dispatch]);

  useEffect(() => {
    if (isVerified) {
      setOtpVerified(true);
      setOtpStep("verified");
    }
  }, [isVerified]);

  const handleCheckRegistration = async () => {
    if (!phone.trim()) {
      setLocalError("Please enter your phone number");
      return;
    }
    setLocalError(null);
    dispatch(clearError());
    setCheckingRegistration(true);
    setPendingRegistrationData(null);
    setPendingAction(null);

    try {
      const result = await dispatch(
        checkRegistrationStatus({ challengeId: parseInt(challengeId), phone })
      ).unwrap();

      // Handle new user case
      if (result.details_required) {
        setShowRegistrationForm(true);
        setOtpStep("register");
        return;
      }

      // Existing user flow
      const { user_id, registration_id } = result;
      const userName = result.user_name;

      if (userName) dispatch(setUserName(userName));
      if (user_id) dispatch(setUserId(user_id));

      if (result.is_registered && registration_id) {
        dispatch(setRegistrationId(registration_id));
        setPendingAction("enter_registered");
        setIsRegistered(false);
        setOtpStep("otp");
        await handleSendOTP();
        return;
      }

      // User exists but not registered: verify OTP first, then register
      if (!userName) {
        setShowRegistrationForm(true);
        setOtpStep("register");
        return;
      }

      setPendingRegistrationData({
        name: userName,
        phone: phone.trim(),
        challenge_id: parseInt(challengeId),
      });
      setPendingAction("register_after_otp");
      setIsRegistered(false);
      setOtpStep("otp");
      await handleSendOTP();
    } catch (error) {
      setLocalError(error?.message || "Failed to check registration status. Please try again.");
      setIsRegistered(false);
    } finally {
      setCheckingRegistration(false);
    }
  };

  const handlePhoneChange = (e) => {
    setPhoneLocal(e.target.value);
    setLocalError(null);
    dispatch(clearError());
    if (otpStep !== "phone") {
      setOtpStep("phone");
      resetOtp();
      setIsRegistered(false);
      setShowRegistrationForm(false);
      setName("");
      setEmail("");
      setCollegeName("");
      setPendingRegistrationData(null);
      setPendingAction(null);
      if (challengeId && phone) clearVerification(phone, challengeId);
    }
  };

  const handleSendOTP = async () => {
    setLocalError(null);
    dispatch(clearError());
    if (!phone.trim()) {
      setLocalError("Please enter your phone number to send OTP");
      return;
    }
    const success = await sendOTP(phone);
    if (success) setOtpStep("otp");
    else setLocalError(otpError || reduxError || "Failed to send OTP. Please try again.");
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

          setIsRegistered(true);
          setOtpVerified(true);
          setOtpStep("verified");
          setPendingRegistrationData(null);
          setPendingAction(null);
          setLocalError(null);
          return;
        } catch (error) {
          setLocalError(error?.message || "Registration failed. Please try again.");
          setOtpVerified(false);
          setOtpStep("phone");
          setPendingRegistrationData(null);
          setPendingAction(null);
          return;
        }
      }

      // Already registered: OTP verified, allow entry
      if (pendingAction === "enter_registered") {
        setIsRegistered(true);
      }

      setOtpVerified(true);
      setOtpStep("verified");
      setLocalError(null);
      setPendingRegistrationData(null);
      setPendingAction(null);
    }
  };

  const handleRegisterWithDetails = async () => {
    if (!name.trim()) {
      setLocalError("Please enter your name");
      return;
    }
    setLocalError(null);
    dispatch(clearError());

    const registrationData = {
      name: name.trim(),
      email: email.trim() || undefined,
      college_name: collegeName.trim() || undefined,
      phone: phone.trim(),
      challenge_id: parseInt(challengeId)
    };

    // If OTP is already verified (e.g., stored verification), register immediately
    if (otpVerified) {
      try {
        const result = await dispatch(registerUser(registrationData)).unwrap();
        if (result?.user_id) dispatch(setUserId(result.user_id));
        if (result?.registration_id) dispatch(setRegistrationId(result.registration_id));
        dispatch(setUserName(registrationData.name));
        dispatch(setPhone(phone));
        setIsRegistered(true);
        setShowRegistrationForm(false);
        setOtpStep("verified");
      } catch (error) {
        setLocalError(error?.message || "Registration failed. Please try again.");
      }
      return;
    }

    // OTP not verified yet -> send OTP first, register after OTP success
    setPendingRegistrationData(registrationData);
    setPendingAction("register_after_otp");
    setShowRegistrationForm(false);
    setOtpStep("otp");
    await handleSendOTP();
  };

  const displayError = localError || reduxError || otpError;

  // Loading Screen
  if (challengeLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Preparing your challenge environment...</p>
        </div>
      </div>
    );
  }

  // Challenge Verified -> Main Interface
  if (otpVerified && isRegistered) {
    return (
      <div className="fixed inset-0 overflow-hidden">
        <ChallengeInterface challengeId={challengeId} />
      </div>
    );
  }

  // OTP / Login Screen
  return (
    <div className="min-h-svh lg:min-h-screen grid grid-cols-1 lg:grid-cols-2 bg-white overflow-x-hidden">
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
            alt="10000 Coders"
            className="h-16 mb-8"
          />
          <h1 className="text-4xl lg:text-5xl font-bold text-white mb-6 leading-tight">
            Prove Your Skills.<br />
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

      {/* Right Panel - Interaction Zone */}
      <div className="relative flex flex-col justify-center p-4 sm:p-8 md:p-10 lg:p-24 bg-gray-50 lg:bg-white overflow-hidden lg:min-h-0">
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

        <div className="relative z-10 max-w-md w-full mx-auto bg-white/95 backdrop-blur-md lg:bg-transparent p-5 sm:p-6 lg:p-0 rounded-2xl lg:rounded-none shadow-lg lg:shadow-none border border-white/20 lg:border-none">
          {/* Mobile Logo */}
          <div className="lg:hidden mb-8 sm:mb-12 flex justify-center">
            <img
              src="/logos/10k_logo_black.webp"
              alt="10000 Coders"
              className="h-14 w-auto"
            />
          </div>

          <div className="mb-8 sm:mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Welcome Back</h2>
            <p className="text-sm sm:text-base text-gray-600">
              {otpStep === 'otp'
                ? `Enter the code sent to ${formatPhoneNumber(phone)}`
                : otpStep === 'register'
                ? "Complete your registration to continue"
                : "Verify your phone number to access the challenge."}
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
            {otpStep === "phone" ? (
              <div className="animate-fadeIn">
                <label htmlFor="phone" className="block text-sm font-semibold text-gray-900 mb-2">
                  Phone Number
                </label>
                <div className="relative mb-6">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <FaPhone className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="tel"
                    id="phone"
                    value={phone}
                    onChange={handlePhoneChange}
                    disabled={checkingRegistration}
                    className="block w-full pl-11 pr-4 py-3 sm:py-3.5 bg-gray-50 border border-gray-200 text-gray-900 rounded-xl focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-all outline-none disabled:bg-gray-100 disabled:text-gray-500 font-medium"
                    placeholder="98765 43210"
                    autoFocus
                  />
                </div>

                <button
                  onClick={handleCheckRegistration}
                  disabled={otpLoading || !phone.trim() || checkingRegistration}
                  className="w-full flex items-center justify-center px-6 sm:px-8 py-3.5 sm:py-4 bg-gray-900 hover:bg-gray-800 text-white font-bold rounded-xl transition-all shadow-md hover:shadow-lg disabled:bg-gray-300 disabled:cursor-not-allowed transform hover:-translate-y-0.5 active:translate-y-0"
                >
                  {checkingRegistration ? (
                    <>
                      <FaSpinner className="animate-spin mr-3" />
                      Checking Registration...
                    </>
                  ) : (
                    <>
                      Continue to Challenge
                      <FaArrowLeft className="ml-2 rotate-180" />
                    </>
                  )}
                </button>
              </div>
            ) : otpStep === "register" ? (
              <div className="animate-fadeIn">
                <div className="mb-6">
                  <p className="text-sm text-gray-600 mb-4 leading-relaxed">
                    You're not registered yet. Please provide your details to continue.
                  </p>
                </div>
                
                <div className="space-y-3 sm:space-y-4">
                  <div>
                    <label htmlFor="name" className="block text-sm font-semibold text-gray-900 mb-2">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="block w-full px-4 py-3 sm:py-3.5 bg-gray-50 border border-gray-200 text-gray-900 rounded-xl focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-all outline-none font-medium"
                      placeholder="John Doe"
                      autoFocus
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="email" className="block text-sm font-semibold text-gray-900 mb-2">
                      Email (Optional)
                    </label>
                    <input
                      type="email"
                      id="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="block w-full px-4 py-3 sm:py-3.5 bg-gray-50 border border-gray-200 text-gray-900 rounded-xl focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-all outline-none font-medium"
                      placeholder="john@example.com"
                    />
                  </div>

                  <div>
                    <label htmlFor="collegeName" className="block text-sm font-semibold text-gray-900 mb-2">
                      College Name (Optional)
                    </label>
                    <input
                      type="text"
                      id="collegeName"
                      value={collegeName}
                      onChange={(e) => setCollegeName(e.target.value)}
                      className="block w-full px-4 py-3 sm:py-3.5 bg-gray-50 border border-gray-200 text-gray-900 rounded-xl focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-all outline-none font-medium"
                      placeholder="Your college name"
                    />
                  </div>
                </div>

                <div className="mt-6 space-y-3">
                  <button
                    onClick={handleRegisterWithDetails}
                    disabled={!name.trim()}
                    className="w-full flex items-center justify-center px-6 sm:px-8 py-3.5 sm:py-4 bg-gray-900 hover:bg-gray-800 text-white font-bold rounded-xl transition-all shadow-md hover:shadow-lg disabled:bg-gray-300 disabled:cursor-not-allowed transform hover:-translate-y-0.5 active:translate-y-0"
                  >
                    Register & Continue
                    <FaArrowLeft className="ml-2 rotate-180" />
                  </button>
                  
                  <button
                    onClick={() => {
                      setOtpStep("phone");
                      setShowRegistrationForm(false);
                      setName("");
                      setEmail("");
                      setCollegeName("");
                    }}
                    className="w-full px-6 sm:px-8 py-2.5 sm:py-3 text-gray-600 hover:text-gray-900 font-medium transition-colors"
                  >
                    ← Back to Phone
                  </button>
                </div>
              </div>
            ) : (
              <div className="animate-fadeIn">
                <div className="mb-6 sm:mb-8">
                  <label className="block text-sm font-semibold text-gray-900 mb-3">
                    One-Time Password
                  </label>
                  <OTPInput value={otpCode} onChange={setOtpCode} onComplete={handleVerifyOTP} />
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
                      setShowRegistrationForm(false);
                      setOtpCode("");
                      setOtpVerified(false);
                      setPendingRegistrationData(null);
                      setPendingAction(null);
                    }}
                    className="text-gray-500 hover:text-gray-900 transition-colors"
                  >
                    Change Phone
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

          <div className="mt-8 sm:mt-12 pt-6 sm:pt-8 border-t border-gray-100 text-center">
            <p className="text-xs text-gray-400">
              Protected by 10000 Coders Secure Login System.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

