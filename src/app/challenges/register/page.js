"use client";
import React, { useState, useEffect, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useDispatch, useSelector } from "react-redux";
import Link from "next/link";
import Image from "next/image";
import { registerForChallenge } from "@/services/publicChallengeApi";
import {
    fetchChallengeDetails,
    fetchChallengeBySlug,
    setAccessCode,
    setPhone,
    clearError,
} from "@/redux/features/publicChallenge/publicChallengeSlice";
import { usePhoneOTP } from "@/hooks/usePhoneOTP";
import { getDisplayParticipantCount } from "@/shared/config";
import BatchStudentShareModal from "@/components/shared/BatchStudentShareModal";

import {
    FaSpinner,
    FaCheckCircle,
    FaExclamationTriangle,
    FaArrowLeft,
    FaPhone,
    FaUser,
    FaEnvelope,
    FaMapMarkerAlt,
    FaGraduationCap,
    FaCalendarAlt,
    FaUsers,
    FaClock,
    FaCode,
    FaQuestionCircle,
    FaCopy,
    FaCheck,
    FaInfoCircle,
    FaListAlt,
} from "react-icons/fa";
import { formatPhoneNumber, formatPhoneInputDisplay, parsePhoneInputValue, validateIndianPhoneNumber } from "@/services/phoneUtils";
import { motion, AnimatePresence } from "framer-motion";

/** Basic email format validation (required, has @ and domain). */
function isValidEmail(value) {
    if (!value || typeof value !== "string") return false;
    const trimmed = value.trim();
    if (!trimmed) return false;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
}

export default function RegisterPage() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const challengeId = searchParams.get("id");
    const slug = searchParams.get("slug");
    const dispatch = useDispatch();

    const {
        currentChallenge,
        loading: challengeLoading,
        error: reduxError,
    } = useSelector((state) => ({
        currentChallenge: state.publicChallenge.currentChallenge,
        loading: state.publicChallenge.loading.challengeDetails,
        error: state.publicChallenge.error,
    }));

    const challenge = currentChallenge || {
        title: "Challenge",
        description: "Loading challenge details...",
        target_audience: "PUBLIC",
        registration_count: 0
    };

    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);
    const [accessCodeValue, setAccessCodeValue] = useState(null);
    const [otpCode, setOtpCode] = useState("");
    const [otpStep, setOtpStep] = useState("phone");

    const [copied, setCopied] = useState(false);
    const fetchKeyRef = useRef(null);

    const [showBatchStudentModal, setShowBatchStudentModal] = useState(false);
    const {
        sendOTP,
        verifyOTP,
        resendOTP,
        loading: otpLoading,
        error: otpError,
        lastErrorCode: otpErrorCode,
        isVerified: otpVerified,
        countdown,
        phoneNumber: otpPhoneNumber,
        reset: resetOtp,
        clearError: clearOtpError,
    } = usePhoneOTP({ blockBatchStudents: false });

    const [formData, setFormData] = useState({
        name: "",
        email: "",
        phone: "",
        address: "",
        qualification: "",
        college_name: "",
        year_of_passing: "",
        utm_src: "organic",
        utm_medium: "",
        utm_term: "",
        utm_campaign: "",
    });

    useEffect(() => {
        const key = slug ? `slug:${slug}` : challengeId ? `id:${challengeId}` : null;
        if (!key) {
            setError("Challenge ID or Slug is required");
            return;
        }
        if (fetchKeyRef.current === key) return;
        fetchKeyRef.current = key;
        dispatch(clearError());
        if (slug) {
            dispatch(fetchChallengeBySlug(slug));
        } else {
            dispatch(fetchChallengeDetails(challengeId));
        }
    }, [challengeId, slug, dispatch]);

    // Collect UTM parameters from URL
    useEffect(() => {
        const getSearchParam = (name, defaultValue = "organic") => {
            if (typeof window !== "undefined") {
                const params = new URLSearchParams(window.location.search);
                return params.get(name) || defaultValue;
            }
            return defaultValue;
        };

        const utm_src = getSearchParam("utm_source", "organic");
        const utm_medium = getSearchParam("utm_medium", "");
        const utm_term = getSearchParam("utm_term", "");
        const utm_campaign = getSearchParam("utm_campaign", "");

        setFormData((prev) => ({
            ...prev,
            utm_src,
            utm_medium,
            utm_term,
            utm_campaign,
        }));
    }, []);

    useEffect(() => {
        if (reduxError) {
            setError(reduxError);
        }
    }, [reduxError]);

    // When challenge details are loaded: if registration has ended AND challenge is live, redirect to interface
    useEffect(() => {
        if (challengeLoading || !currentChallenge?.id) return;
        // Only act on the challenge that matches this page (from API response for this id/slug)
        const matchesPage =
            (challengeId && String(currentChallenge.id) === String(challengeId)) ||
            (slug && currentChallenge.slug === slug);
        if (!matchesPage) return;

        const regEnd = currentChallenge.registration_end_at ? new Date(currentChallenge.registration_end_at) : null;
        const registrationEnded = regEnd && regEnd.getTime() < Date.now();
        if (!registrationEnded) return;

        // Challenge is "live" when status is ONGOING or we're within the challenge time window
        const now = Date.now();
        const startAt = currentChallenge.challenge_start_at ? new Date(currentChallenge.challenge_start_at) : null;
        const endAt = currentChallenge.challenge_end_at ? new Date(currentChallenge.challenge_end_at) : null;
        const isLive =
            currentChallenge.status === "ONGOING" ||
            (startAt && endAt && now >= startAt.getTime() && now <= endAt.getTime());
        if (!isLive) return;

        const params = new URLSearchParams();
        params.set("id", String(currentChallenge.id));
        const utmSource = searchParams.get("utm_source");
        const utmMedium = searchParams.get("utm_medium");
        const utmTerm = searchParams.get("utm_term");
        const utmCampaign = searchParams.get("utm_campaign");
        if (utmSource) params.set("utm_source", utmSource);
        if (utmMedium) params.set("utm_medium", utmMedium);
        if (utmTerm) params.set("utm_term", utmTerm);
        if (utmCampaign) params.set("utm_campaign", utmCampaign);
        router.replace(`/challenges/interface?${params.toString()}`);
    }, [currentChallenge, challengeLoading, router, searchParams, challengeId, slug]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        if (name === "phone") {
            const digitsOnly = parsePhoneInputValue(value);
            setFormData((prev) => ({ ...prev, phone: digitsOnly }));
            if (otpStep !== "phone") {
                setOtpStep("phone");
                resetOtp();
            }
            return;
        }
        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }));
    };



    const handleSendOTP = async () => {
        setError(null);
        if (!formData.phone.trim()) {
            setError("Please enter your phone number to send OTP");
            return false;
        }
        if (!validateIndianPhoneNumber(formData.phone)) {
            setError("Please enter a valid 10-digit mobile number");
            return false;
        }
        const result = await sendOTP(formData.phone);
        if (result?.success) {
            setOtpStep("otp");
            return true;
        }
        if (result?.code === "already_in_a_batch") {
            setShowBatchStudentModal(true);
            return false;
        }
        setError(otpError || "Failed to send OTP. Please try again.");
        return false;
    };

    const handleVerifyOTP = async (code) => {
        setError(null);
        setOtpCode(code);

        if (!code || code.length !== 6) {
            setError("Please enter a valid 6-digit OTP code");
            return false;
        }

        const success = await verifyOTP(code);
        if (success) {
            setOtpStep("verified");
            setError(null);
            // Auto-advance to next step immediately
            return true;
        } else {
            setError(otpError || "Invalid OTP. Please try again.");
            return false;
        }
    };

    const handleResendOTP = async () => {
        setError(null);
        await resendOTP();
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);

        if (!formData.name.trim()) {
            setError("Name is required");
            return;
        }

        if (!formData.email.trim()) {
            setError("Please enter your email");
            return;
        }
        if (!isValidEmail(formData.email)) {
            setError("Please enter a valid email address");
            return;
        }

        if (!formData.phone.trim()) {
            setError("Phone number is required");
            return;
        }
        if (!validateIndianPhoneNumber(formData.phone)) {
            setError("Please enter a valid 10-digit mobile number");
            return;
        }

        // Single primary CTA flow:
        // 1) If phone not verified yet -> send OTP (or verify OTP if already sent)
        // 2) After successful OTP verification -> continue registration
        if (!otpVerified) {
            if (otpStep === "phone") {
                await handleSendOTP();
                return;
            }
            if (otpStep === "otp") {
                const ok = await handleVerifyOTP(otpCode);
                if (!ok) return;
            } else {
                setOtpStep("phone");
                resetOtp();
                return;
            }
        }

        if (formatPhoneNumber(formData.phone) !== otpPhoneNumber) {
            setError("The phone number has changed. Please re-verify with OTP.");
            setOtpStep("phone");
            resetOtp();
            return;
        }

        try {
            setSubmitting(true);
            const registrationData = {
                ...formData,
                challenge_id: parseInt(challengeId || currentChallenge?.id),
                year_of_passing: formData.year_of_passing
                    ? parseInt(formData.year_of_passing)
                    : null,
            };

            registrationData.email = registrationData.email.trim();

            const response = await registerForChallenge(registrationData);

            if (response.success) {
                setSuccess(true);
                if (response.access_code) {
                    setAccessCodeValue(response.access_code);
                    dispatch(setAccessCode(response.access_code));
                    dispatch(setPhone(formatPhoneNumber(formData.phone)));
                }
            } else {
                setError(response.message || "Registration failed");
            }
        } catch (err) {
            let errorMessage = "Registration failed. Please try again.";

            if (err.response?.data) {
                if (err.response.data.already_registered) {
                    const challengeStart = err.response.data.challenge_start_at;
                    if (challengeStart) {
                        const challengeDate = new Date(challengeStart);
                        const formattedDate = challengeDate.toLocaleDateString("en-US", {
                            month: "long",
                            day: "numeric",
                        });
                        const formattedTime = challengeDate.toLocaleTimeString("en-US", {
                            hour: "numeric",
                            minute: "2-digit",
                            hour12: true,
                        });
                        errorMessage = `You have already registered for this challenge. The challenge will be on ${formattedDate} at ${formattedTime}.`;
                    } else {
                        errorMessage =
                            err.response.data.message ||
                            "You have already registered for this challenge.";
                    }
                } else if (err.response.data.message) {
                    errorMessage = err.response.data.message;
                }
            } else if (err.message) {
                errorMessage = err.message;
            }

            setError(errorMessage);
        } finally {
            setSubmitting(false);
        }
    };

    const copyAccessCode = () => {
        if (accessCodeValue) {
            navigator.clipboard.writeText(accessCodeValue);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return "N/A";
        const date = new Date(dateString);
        return date.toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    if (challengeLoading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center pt-20">
                <div className="text-center">
                    <FaSpinner className="animate-spin text-4xl text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">Loading challenge details...</p>
                </div>
            </div>
        );
    }





    return (
        <div className="min-h-screen flex flex-col md:flex-row bg-white">
            <BatchStudentShareModal
                open={showBatchStudentModal}
                onClose={() => setShowBatchStudentModal(false)}
                referrerBatch={searchParams.get("utm_campaign") || undefined}
                referrerName={searchParams.get("utm_term") || undefined}
            />
            {/* Left Side - Immersive Brand Sidebar (Desktop Only) */}
            <div className="hidden md:flex md:w-5/12 bg-[#0F0F0F] relative text-white flex-col justify-between overflow-hidden md:h-screen md:sticky md:top-0">
                {/* Background Gradients & Effects */}
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-br from-orange-600/30 to-red-600/30 rounded-full mix-blend-screen filter blur-[100px] opacity-50 animate-pulse"></div>
                <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-orange-900/40 rounded-full mix-blend-screen filter blur-[80px] opacity-30"></div>
                <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-5"></div>

                <div className="relative z-10 p-12 h-full flex flex-col items-start text-left">
                    {/* Logo Area */}
                    <div className="mb-auto">
                        <Link href="/" className="inline-block group">
                            <motion.div
                                whileHover={{ scale: 1.05 }}
                                className="bg-white/5 backdrop-blur-sm p-4 rounded-2xl border border-white/10"
                            >
                                <Image
                                    src="/logos/10k_logo_white.webp"
                                    alt="10000Coders Logo"
                                    width={240}
                                    height={80}
                                    className="h-16 w-auto object-contain"
                                    priority
                                />
                            </motion.div>
                        </Link>
                    </div>

                    {/* Challenge Details - Centered Vertically */}
                    <div className="my-0 space-y-8 w-full">
                        <div>
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.2 }}
                            >
                                <span className="inline-flex items-center px-4 py-1.5 rounded-full text-sm font-bold bg-gradient-to-r from-orange-500 to-red-600 text-white shadow-lg shadow-orange-500/20 mb-6 tracking-wide uppercase">
                                    <FaCode className="mr-2" />
                                    Active Challenge
                                </span>

                                {/* Desktop Title */}
                                <h1 className="text-5xl font-extrabold mb-6 leading-tight tracking-tight text-white">
                                    {challenge.title}
                                </h1>
                                {challenge.description && (
                                    <p className="text-lg text-gray-300 leading-relaxed max-w-lg font-light">
                                        {challenge.description}
                                    </p>
                                )}
                            </motion.div>
                        </div>

                        {/* Stats Grid */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.4 }}
                            className="grid grid-cols-2 gap-4"
                        >
                            <div className="p-5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md">
                                <div className="text-3xl font-bold text-orange-500 mb-1">
                                    <FaCode />
                                </div>
                                <div className="text-sm text-gray-400 font-medium uppercase tracking-wider">
                                    Problem Solving
                                </div>
                            </div>

                            {challenge.target_audience === 'COLLEGE_STUDENTS' && (
                                <div className="p-5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md">
                                    <div className="text-3xl font-bold text-orange-500 mb-1">
                                        <FaListAlt />
                                    </div>
                                    <div className="text-sm text-gray-400 font-medium uppercase tracking-wider">
                                        Aptitude MCQs
                                    </div>
                                </div>
                            )}

                            <div className={`${challenge.target_audience === 'COLLEGE_STUDENTS' ? 'col-span-2' : 'col-span-1'} p-5 rounded-2xl bg-gradient-to-r from-orange-600/20 to-red-600/20 border border-orange-500/20 backdrop-blur-md flex items-center justify-between`}>
                                <div>
                                    <div className="text-2xl font-bold text-white mb-1">
                                        {getDisplayParticipantCount(challenge.registration_count)}
                                    </div>
                                    <div className="text-xs text-gray-300 uppercase tracking-wider">
                                        registered
                                    </div>
                                </div>
                                <div className="h-10 w-10 rounded-full bg-orange-500 flex items-center justify-center text-white shadow-lg shadow-orange-500/50">
                                    <FaUsers />
                                </div>
                            </div>
                        </motion.div>
                    </div>

                    {/* Footer */}
                    <div className="mt-auto pt-8 border-t border-white/10 text-sm text-gray-500 flex justify-between items-center">
                        <p>© 2026 10000Coders. All rights reserved.</p>
                        <div className="flex gap-4 text-xl text-gray-400">
                            {/* Social icons could go here */}
                        </div>
                    </div>
                </div>
            </div>

            {/* Right Side - Scrollable Form Area */}
            <div className="w-full md:w-7/12 bg-white flex flex-col min-h-screen">
                {/* Error View (Replaces Form) */}
                {!currentChallenge && !challengeLoading ? (
                    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center animate-fadeIn">
                        <div className="relative w-64 h-64 md:w-80 md:h-80 mb-8 transform transition-transform hover:scale-105 duration-300">
                            <Image
                                src="/helpers/timeout.jpg"
                                alt="Timeout or Error"
                                fill
                                className="object-contain drop-shadow-xl"
                                priority
                            />
                        </div>
                        <h2 className="text-4xl md:text-5xl font-black text-gray-900 mb-6 tracking-tight leading-tight">
                            {reduxError && reduxError.toLowerCase().includes('registration') ? 'REGISTRATION CLOSED' : 'CHALLENGE NOT FOUND'}
                        </h2>
                        <p className="text-xl md:text-2xl text-gray-600 mb-10 font-bold max-w-lg leading-relaxed">
                            {reduxError && reduxError.toLowerCase().includes('registration') ? reduxError : "Please check your URL properly."}
                        </p>
                        <Link
                            href="/"
                            className="inline-flex items-center justify-center bg-gray-900 text-white px-10 py-4 rounded-xl hover:bg-black transition-all hover:scale-105 font-extrabold text-lg shadow-xl hover:shadow-2xl ring-4 ring-gray-100"
                        >
                            GO TO HOME
                        </Link>
                    </div>
                ) : (
                    <div className="flex-1 w-full max-w-2xl mx-auto px-4 sm:px-5 py-6 sm:py-8 md:p-16 flex flex-col justify-start md:justify-center pb-[env(safe-area-inset-bottom)]">

                        {/* Mobile Header (Integrated) */}
                        {/* Mobile Header (Integrated) */}
                        <div className="md:hidden mb-8">
                            {/* Mobile Header Card */}
                            {/* Mobile Header Card */}
                            <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-gray-900 via-gray-800 to-black p-8 shadow-2xl shadow-gray-900/20 mb-8">
                                {/* Decorative Blobs */}
                                <div className="absolute top-0 right-0 w-40 h-40 bg-orange-500/20 rounded-full blur-3xl -mr-10 -mt-10"></div>
                                <div className="absolute bottom-0 left-0 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl -ml-6 -mb-6"></div>

                                <div className="relative z-10 text-white flex flex-col items-center text-center">
                                    <div className="mb-6 relative">
                                        <div className="absolute -inset-4 bg-white/5 rounded-full blur-lg"></div>
                                        <Image
                                            src="/logos/10k_logo_white.webp"
                                            alt="10000Coders"
                                            width={180}
                                            height={60}
                                            className="h-14 w-auto object-contain relative z-10"
                                            priority
                                        />
                                    </div>

                                    <h1 className="text-3xl font-black leading-tight mb-3 tracking-tight capitalize bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
                                        {challenge.title}
                                    </h1>

                                    <p className="text-gray-300 font-medium text-sm leading-relaxed mb-6 max-w-xs mx-auto">
                                        Join elite developers in this exclusive challenge. Prove your skills, build your portfolio, and accelerate your career.
                                    </p>

                                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 border border-white/10 backdrop-blur-sm text-xs font-bold text-white uppercase tracking-widest">
                                        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                                        Registration Closing Soon
                                    </div>
                                </div>
                            </div>

                            {/* Mobile Logo Header (Top Bar) - Kept simple above the card or integrated? 
                                 Let's stick to just the card as the main header, maybe a simple nav above if needed. 
                                 But for this specific request "why they are filling", the card is key. 
                             */}
                        </div>

                        {success ? (
                            <div className="flex-1 flex flex-col items-center justify-center py-8 text-center animate-fadeIn">
                                <div className="relative w-64 h-64 md:w-80 md:h-80 mb-8 transform transition-transform hover:scale-105 duration-300">
                                    <Image
                                        src="/helpers/registered.jpg"
                                        alt="Successfully Registered"
                                        fill
                                        className="object-contain drop-shadow-xl"
                                        priority
                                    />
                                </div>
                                <h2 className="text-3xl md:text-4xl font-black text-gray-900 mb-4 tracking-tight leading-tight uppercase">
                                    Successfully Registered!
                                </h2>
                                <p className="text-lg md:text-xl text-gray-600 mb-10 font-medium max-w-lg leading-relaxed">
                                    Challenge timings will be announced soon. Stay tuned.
                                </p>
                                <Link
                                    href="/"
                                    className="inline-flex items-center justify-center bg-gray-900 text-white px-10 py-4 rounded-xl hover:bg-black transition-all hover:scale-105 font-extrabold text-lg shadow-xl hover:shadow-2xl ring-4 ring-gray-100"
                                >
                                    GO TO HOME
                                </Link>
                            </div>
                        ) : (
                            <>
                                <div className="mb-6 sm:mb-8">
                                    <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1 sm:mb-2">
                                        Register Now
                                    </h2>
                                    <p className="text-sm sm:text-base text-gray-500">
                                        Fill in your details to get started with the challenge.
                                    </p>
                                </div>



                                {/* Error Display */}
                                <AnimatePresence>
                                    {(error) && (
                                        <motion.div
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: "auto" }}
                                            exit={{ opacity: 0, height: 0 }}
                                            className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg mb-4 sm:mb-6 flex items-start gap-2 text-sm"
                                        >
                                            <FaExclamationTriangle className="shrink-0 mt-0.5" />
                                            <p className="min-w-0 break-words">{error}</p>
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                {/* Main Form */}
                                {/* Main Form - Single Section */}
                                <form onSubmit={handleSubmit} className="space-y-8">

                                    {/* Personal Info Group */}
                                    <div className="space-y-6">
                                        <div>
                                            <label htmlFor="name" className="block text-sm font-semibold text-gray-900 mb-2">
                                                Full Name <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                type="text"
                                                id="name"
                                                name="name"
                                                value={formData.name}
                                                onChange={handleInputChange}
                                                required
                                                className="w-full min-h-[48px] sm:min-h-0 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 outline-none transition-all font-medium text-base text-gray-900"
                                                placeholder="Enter your full name"
                                            />
                                        </div>

                                        <div>
                                            <label htmlFor="email" className="block text-sm font-semibold text-gray-900 mb-2">
                                                Email Address <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                type="email"
                                                id="email"
                                                name="email"
                                                value={formData.email}
                                                onChange={handleInputChange}
                                                required
                                                className="w-full min-h-[48px] sm:min-h-0 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 outline-none transition-all font-medium text-base text-gray-900"
                                                placeholder="name@example.com"
                                            />
                                        </div>
                                    </div>

                                    {/* Phone & Verification Group */}
                                    <div className="space-y-4 sm:space-y-6 pt-4 border-t border-gray-100">
                                        <div>
                                            <label htmlFor="phone" className="block text-sm font-semibold text-gray-900 mb-1.5 sm:mb-2">
                                                Mobile Number (India only) <span className="text-red-500">*</span>
                                            </label>
                                            <p className="text-xs text-gray-500 mb-2">Indian registrations only. Enter 10-digit mobile number.</p>
                                            <div className="flex rounded-xl border border-gray-200 bg-gray-50 overflow-hidden focus-within:ring-4 focus-within:ring-orange-500/10 focus-within:border-orange-500">
                                                <input
                                                    type="tel"
                                                    id="phone"
                                                    name="phone"
                                                    value={formatPhoneInputDisplay(formData.phone)}
                                                    onChange={handleInputChange}
                                                    required
                                                    disabled={otpStep !== "phone"}
                                                    maxLength={14}
                                                    inputMode="numeric"
                                                    pattern="[0-9 ]*"
                                                    className="flex-1 min-w-0 min-h-[48px] sm:min-h-0 px-4 py-3 bg-transparent font-medium text-base text-gray-900 outline-none placeholder:text-gray-400 disabled:opacity-60"
                                                    placeholder="91 98765 43210"
                                                />
                                            </div>
                                            {otpStep === "verified" && (
                                                <div className="px-4 py-3 bg-green-50 text-green-700 rounded-xl border border-green-200 font-bold flex items-center gap-2">
                                                    <FaCheckCircle /> Verified
                                                </div>
                                            )}
                                        </div>

                                        {otpStep === "otp" && (
                                            <motion.div
                                                initial={{ opacity: 0, height: 0 }}
                                                animate={{ opacity: 1, height: "auto" }}
                                                className="bg-white border border-gray-100 rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-sm space-y-4 sm:space-y-6"
                                            >
                                                <div className="text-center">
                                                    <h3 className="text-base sm:text-lg font-bold text-gray-900">Verify your number</h3>
                                                    <p className="text-xs sm:text-sm text-gray-500 mt-1 break-all">Enter code sent to {formData.phone ? `+91 ${formData.phone.length === 10 ? `${formData.phone.slice(0, 5)} ${formData.phone.slice(5)}` : formData.phone}` : ''}</p>
                                                </div>

                                                <div className="flex justify-center">
                                                    <OTPInput
                                                        value={otpCode}
                                                        onChange={(value) => {
                                                            setOtpCode(value);
                                                            clearOtpError();
                                                        }}
                                                        onComplete={(code) => {
                                                            setOtpCode(code);
                                                            if (code.length === 6) handleVerifyOTP(code);
                                                        }}
                                                    />
                                                </div>

                                                {otpError && (
                                                    <div className="text-center">
                                                        <p className="inline-flex items-center gap-1.5 text-red-600 bg-red-50 px-3 py-1.5 rounded-lg text-sm font-semibold border border-red-100 animate-pulse">
                                                            <FaExclamationTriangle className="text-xs" />
                                                            {otpError}
                                                        </p>
                                                    </div>
                                                )}

                                                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 text-sm pt-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setOtpStep("phone");
                                                            resetOtp();
                                                        }}
                                                        className="min-h-[44px] sm:min-h-0 px-3 py-2 text-gray-500 hover:text-gray-900 font-medium rounded-lg touch-manipulation"
                                                    >
                                                        Wrong Number?
                                                    </button>

                                                    {countdown > 0 ? (
                                                        <span className="text-gray-400 font-mono text-center">
                                                            {Math.floor(countdown / 60)}:{(countdown % 60).toString().padStart(2, '0')}
                                                        </span>
                                                    ) : (
                                                        <button
                                                            type="button"
                                                            onClick={handleResendOTP}
                                                            disabled={otpLoading}
                                                            className="min-h-[44px] sm:min-h-0 px-3 py-2 text-orange-600 font-semibold hover:underline rounded-lg touch-manipulation disabled:opacity-50"
                                                        >
                                                            Resend Code
                                                        </button>
                                                    )}
                                                </div>

                                            </motion.div>
                                        )}
                                    </div>

                                    {/* Additional Info Group */}
                                    <div className="space-y-6 pt-4 border-t border-gray-100">
                                        <div>
                                            <label htmlFor="address" className="block text-sm font-semibold text-gray-900 mb-2">
                                                Address
                                            </label>
                                            <textarea
                                                id="address"
                                                name="address"
                                                value={formData.address}
                                                onChange={handleInputChange}
                                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 outline-none transition-all font-medium text-base text-gray-900 min-h-[100px]"
                                                placeholder="Enter your full address"
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <label htmlFor="qualification" className="block text-sm font-semibold text-gray-900">
                                                Qualification
                                            </label>
                                            <input
                                                type="text"
                                                id="qualification"
                                                name="qualification"
                                                value={formData.qualification}
                                                onChange={handleInputChange}
                                                className="w-full min-h-[48px] sm:min-h-0 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 outline-none transition-all font-medium text-base text-gray-900"
                                                placeholder="Highest Qualification (e.g. B.Tech)"
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <label htmlFor="college_name" className="block text-sm font-semibold text-gray-900">
                                                College/University Name
                                            </label>
                                            <input
                                                type="text"
                                                id="college_name"
                                                name="college_name"
                                                value={formData.college_name}
                                                onChange={handleInputChange}
                                                className="w-full min-h-[48px] sm:min-h-0 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 outline-none transition-all font-medium text-base text-gray-900"
                                                placeholder="Enter your college name"
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <label htmlFor="year_of_passing" className="block text-sm font-semibold text-gray-900">
                                                Year of Passing
                                            </label>
                                            <input
                                                type="number"
                                                id="year_of_passing"
                                                name="year_of_passing"
                                                value={formData.year_of_passing}
                                                onChange={handleInputChange}
                                                min="1900"
                                                max="2100"
                                                className="w-full min-h-[48px] sm:min-h-0 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 outline-none transition-all font-medium text-base text-gray-900"
                                                placeholder="2024"
                                            />
                                        </div>
                                    </div>

                                    <div className="pt-6 sm:pt-8 mt-6 sm:mt-8 border-t border-gray-100">
                                        <button
                                            type="submit"
                                            disabled={submitting || otpLoading || (otpStep === "otp" && !otpVerified && otpCode.length !== 6) || !formData.name.trim() || !formData.email.trim() || !isValidEmail(formData.email)}
                                            className={`w-full min-h-[48px] sm:min-h-0 py-4 rounded-xl font-bold text-base sm:text-lg shadow-lg transition-all duration-300 transform hover:-translate-y-0.5 touch-manipulation ${!submitting && !otpLoading
                                                ? "bg-gradient-to-r from-orange-600 to-orange-500 text-white shadow-orange-500/25 hover:shadow-orange-500/40"
                                                : "bg-gray-200 text-gray-400 cursor-not-allowed shadow-none"
                                                }`}
                                        >
                                            {submitting ? (
                                                <span className="flex items-center justify-center gap-2">
                                                    <FaSpinner className="animate-spin" /> Processing...
                                                </span>
                                            ) : otpLoading ? (
                                                "Please wait..."
                                            ) : (
                                                otpVerified ? "Register Now" : otpStep === "otp" ? "Verify & Register" : "Send OTP"
                                            )}
                                        </button>
                                    </div>
                                </form>
                            </>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

// Helper component for OTP Input
function OTPInput({ value, onChange, onComplete }) {
    // ... existing OTP implementation ...
    const handleChange = (e, index) => {
        const val = e.target.value;
        if (isNaN(val)) return;

        const newOtp = value.split("");
        newOtp[index] = val;
        const newOtpStr = newOtp.join("");
        onChange(newOtpStr);

        if (val && index < 5) {
            const nextInput = document.getElementById(`otp-${index + 1}`);
            if (nextInput) nextInput.focus();
        }

        if (newOtpStr.length === 6) {
            onComplete(newOtpStr);
        }
    };

    const handleKeyDown = (e, index) => {
        if (e.key === "Backspace" && !value[index] && index > 0) {
            const prevInput = document.getElementById(`otp-${index - 1}`);
            if (prevInput) prevInput.focus();
        }
    };

    return (
        <div className="flex gap-2 sm:gap-3">
            {[0, 1, 2, 3, 4, 5].map((index) => (
                <input
                    key={index}
                    id={`otp-${index}`}
                    type="text"
                    maxLength="1"
                    value={value[index] || ""}
                    onChange={(e) => handleChange(e, index)}
                    onKeyDown={(e) => handleKeyDown(e, index)}
                    className="w-10 h-12 sm:w-12 sm:h-14 border-2 border-gray-200 rounded-lg text-center text-xl font-bold focus:border-orange-600 focus:ring-4 focus:ring-orange-100 outline-none transition-all bg-white"
                />
            ))}
        </div>
    );
}
