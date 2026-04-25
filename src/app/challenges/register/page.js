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
import { getDisplayParticipantCount, MARKETING_SITE_URL, WHATSAPP_CHALLENGE_GROUP_URL } from "@/shared/config";
import BatchStudentShareModal from "@/components/shared/BatchStudentShareModal";
import OTPInput from "@/components/registration/OTPInput";
import { REGISTER_PAGE_COPY as COPY } from "./registerCopy";

import { FaSpinner, FaCheckCircle, FaExclamationTriangle, FaUsers, FaLaptop, FaWhatsapp } from "react-icons/fa";
import { formatPhoneNumber, formatPhoneInputDisplay, parsePhoneInputValue, validateIndianPhoneNumber } from "@/services/phoneUtils";

/** Turn slug-style API titles into readable headings (e.g. scholarship → Scholarship). */
function displayChallengeTitle(title) {
    if (!title || typeof title !== "string") return title || "";
    const t = title.trim();
    if (/^[a-z0-9_-]+$/i.test(t) && !/\s/.test(t)) {
        return t.replace(/[-_]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    }
    return t;
}

/** True when backend message indicates the challenge is over (not a missing slug). */
function isChallengeEndedApiMessage(msg) {
    if (msg == null) return false;
    const s = String(msg).toLowerCase();
    return (
        s.includes("challenge has ended") ||
        s.includes("this challenge has ended") ||
        s.includes("challenge is ended") ||
        (s.includes("has ended") && s.includes("challenge"))
    );
}

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
            <div className="flex min-h-screen items-center justify-center bg-gray-50">
                <div className="text-center">
                    <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-2 border-gray-200 border-t-orange-600" />
                    <p className="text-sm font-medium text-gray-600">{COPY.loading}</p>
                </div>
            </div>
        );
    }





    return (
        <div className="grid h-dvh min-h-0 w-full grid-cols-1 overflow-hidden bg-gray-50 md:grid-cols-[minmax(0,42%)_minmax(0,58%)] md:h-screen md:bg-white">
            <BatchStudentShareModal
                open={showBatchStudentModal}
                onClose={() => setShowBatchStudentModal(false)}
                referrerBatch={searchParams.get("utm_campaign") || undefined}
                referrerName={searchParams.get("utm_term") || undefined}
            />
            <div className="relative hidden min-h-0 md:flex md:flex-col md:justify-end md:overflow-hidden md:bg-gray-900 md:p-12 lg:p-14">
                <div className="absolute inset-0">
                    <img src="/coding/DSC_5858.webp" alt="" className="h-full w-full object-cover opacity-50" />
                    <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-gray-900/88 to-gray-900/45" />
                </div>
                <div className="relative z-10 flex max-w-xl flex-col gap-6 text-left">
                    <Link href={MARKETING_SITE_URL} className="inline-block w-fit">
                        <Image
                            src="/logos/10k_logo_white.webp"
                            alt="10000Coders"
                            width={200}
                            height={64}
                            className="h-12 w-auto opacity-95 lg:h-14"
                            priority
                        />
                    </Link>
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-widest text-orange-200/90">{COPY.left.eyebrow}</p>
                        <h1 className="mt-2 text-3xl font-bold leading-tight tracking-tight text-white lg:text-4xl">
                            {displayChallengeTitle(challenge.title)}
                        </h1>
                        {challenge.description ? (
                            <p className="mt-4 max-w-lg border-l-2 border-orange-500/60 pl-4 text-sm leading-relaxed text-gray-300 lg:text-base">
                                {challenge.description}
                            </p>
                        ) : null}
                    </div>
                    <div className="flex flex-wrap gap-2 pt-1">
                        <span className="inline-flex items-center rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-medium text-white/95 backdrop-blur-sm">
                            {challenge.target_audience === "COLLEGE_STUDENTS" ? "College program" : "Open registration"}
                        </span>
                        <span className="inline-flex items-center rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-medium text-white/95 backdrop-blur-sm">
                            OTP verification
                        </span>
                    </div>
                    <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur-sm">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-orange-500/90 text-white">
                            <FaUsers className="h-4 w-4" aria-hidden />
                        </div>
                        <div>
                            <p className="text-lg font-semibold tabular-nums text-white">
                                {getDisplayParticipantCount(challenge.registration_count)}
                            </p>
                            <p className="text-xs font-medium uppercase tracking-wide text-gray-400">{COPY.left.participantLabel}</p>
                        </div>
                    </div>
                    <p className="pt-2 text-xs text-gray-500">© {new Date().getFullYear()} 10000Coders</p>
                </div>
            </div>

            <div className="flex min-h-0 w-full flex-col overflow-hidden md:bg-gray-50">
                {/* Error View (Replaces Form) */}
                {!currentChallenge && !challengeLoading ? (
                    <div className="scrollbar-hide flex flex-1 flex-col items-center justify-center overflow-y-auto px-6 py-12 text-center">
                        <div className="relative mb-8 h-48 w-48 sm:h-56 sm:w-56">
                            <Image
                                src="/helpers/timeout.jpg"
                                alt=""
                                fill
                                className="object-contain"
                                priority
                            />
                        </div>
                        <h2 className="mb-3 text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
                            {isChallengeEndedApiMessage(reduxError)
                                ? COPY.challengeEnded.title
                                : reduxError && String(reduxError).toLowerCase().includes("registration")
                                  ? COPY.challengeNotFound.titleClosed
                                  : COPY.challengeNotFound.titleMissing}
                        </h2>
                        <p className="mb-8 max-w-md text-sm leading-relaxed text-gray-600 sm:text-base">
                            {isChallengeEndedApiMessage(reduxError)
                                ? reduxError || COPY.challengeEnded.subtitle
                                : reduxError && String(reduxError).toLowerCase().includes("registration")
                                  ? reduxError
                                  : "Check the link or try again from the challenges page."}
                        </p>
                        <Link
                            href={MARKETING_SITE_URL}
                            className="inline-flex min-h-11 items-center justify-center rounded-xl bg-gray-900 px-8 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-gray-800"
                        >
                            {COPY.challengeNotFound.cta}
                        </Link>
                    </div>
                ) : (
                    <div className="scrollbar-hide mx-auto flex min-h-0 w-full max-w-lg flex-1 flex-col overflow-y-auto px-4 py-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:px-6 sm:py-8 md:max-w-xl md:py-8 lg:px-8">
                        <div className="mb-5 shrink-0 border-b border-gray-200 pb-4 md:hidden">
                            <div className="mb-3 flex items-center justify-center">
                                <Image
                                    src="/logos/10k_logo_black.webp"
                                    alt="10000Coders"
                                    width={160}
                                    height={48}
                                    className="h-9 w-auto"
                                    priority
                                />
                            </div>
                            <h1 className="text-center text-lg font-semibold leading-snug text-gray-900">
                                {displayChallengeTitle(challenge.title)}
                            </h1>
                            <p className="mx-auto mt-2 max-w-sm text-center text-xs leading-relaxed text-gray-600">{COPY.mobile.subtitle}</p>
                        </div>

                        {success ? (
                            <div className="flex flex-1 flex-col items-center justify-center py-8 text-center">
                                <div className="relative mb-8 h-44 w-44 sm:h-52 sm:w-52">
                                    <Image src="/helpers/registered.jpg" alt="" fill className="object-contain" priority />
                                </div>
                                <h2 className="mb-2 text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">{COPY.success.title}</h2>
                                <div className="mb-6 max-w-md space-y-3 text-sm leading-relaxed text-gray-600 sm:text-base">
                                    <p>{COPY.success.body}</p>
                                    {COPY.success.bodyFollowUp ? <p>{COPY.success.bodyFollowUp}</p> : null}
                                </div>
                                <div
                                    role="note"
                                    className="mb-8 flex w-full max-w-md gap-3 rounded-xl border-2 border-amber-400 bg-gradient-to-br from-amber-50 to-amber-100/80 p-4 text-left shadow-md ring-1 ring-amber-500/20 sm:p-4"
                                >
                                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-amber-500 text-white shadow-sm">
                                        <FaLaptop className="h-5 w-5" aria-hidden />
                                    </span>
                                    <div className="min-w-0">
                                        <p className="text-sm font-bold tracking-tight text-amber-950 sm:text-base">
                                            {COPY.success.laptopTitle}
                                        </p>
                                        <p className="mt-1.5 text-xs leading-relaxed text-amber-900/95 sm:text-sm">
                                            {COPY.success.laptopBody}
                                        </p>
                                    </div>
                                </div>
                                <div
                                    role="note"
                                    className="mb-8 flex w-full max-w-md gap-3 rounded-xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-green-50/90 p-4 text-left shadow-sm ring-1 ring-emerald-500/15 sm:p-4"
                                >
                                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[#25D366] text-white shadow-sm">
                                        <FaWhatsapp className="h-6 w-6" aria-hidden />
                                    </span>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm font-bold tracking-tight text-emerald-950 sm:text-base">
                                            {COPY.success.whatsappTitle}
                                        </p>
                                        <p className="mt-1.5 text-xs leading-relaxed text-emerald-900/95 sm:text-sm">
                                            {COPY.success.whatsappBody}
                                        </p>
                                        <a
                                            href={WHATSAPP_CHALLENGE_GROUP_URL}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="mt-3 inline-flex min-h-10 items-center justify-center rounded-lg bg-[#25D366] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#20bd5a]"
                                        >
                                            {COPY.success.whatsappCta}
                                        </a>
                                    </div>
                                </div>
                                {accessCodeValue ? (
                                    <p className="mb-6 max-w-md rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 font-mono text-sm text-gray-800">
                                        Access code: <span className="font-semibold">{accessCodeValue}</span>
                                    </p>
                                ) : null}
                                <Link
                                    href={MARKETING_SITE_URL}
                                    className="inline-flex min-h-11 items-center justify-center rounded-xl bg-gray-900 px-8 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-gray-800"
                                >
                                    {COPY.success.cta}
                                </Link>
                            </div>
                        ) : (
                            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-7 md:p-8">
                                <header className="mb-5 border-b border-gray-100 pb-4 md:mb-6 md:pb-5">
                                    <h2 className="text-xl font-bold tracking-tight text-gray-900 md:text-2xl">{COPY.form.title}</h2>
                                    <p className="mt-1 text-xs leading-relaxed text-gray-600 md:mt-1.5 md:text-sm">{COPY.form.subtitle}</p>
                                </header>

                                {error ? (
                                    <div
                                        role="alert"
                                        className="mb-5 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-3 py-3 text-sm text-red-800 sm:px-4"
                                    >
                                        <FaExclamationTriangle className="mt-0.5 shrink-0" aria-hidden />
                                        <p className="min-w-0 break-words">{error}</p>
                                    </div>
                                ) : null}

                                <form onSubmit={handleSubmit} className="space-y-8">

                                    <div className="rounded-xl border border-gray-200 bg-gray-50/90 p-4 ring-1 ring-black/3 sm:p-5">
                                        <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-gray-500">{COPY.form.sectionPersonal}</p>
                                        <div className="space-y-4">
                                            <div>
                                                <label htmlFor="name" className="mb-1.5 block text-sm font-semibold text-gray-900">
                                                    Full name <span className="text-red-600">*</span>
                                                </label>
                                                <input
                                                    type="text"
                                                    id="name"
                                                    name="name"
                                                    value={formData.name}
                                                    onChange={handleInputChange}
                                                    required
                                                    autoComplete="name"
                                                    className="block min-h-[48px] w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-base text-gray-900 outline-none transition focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10 sm:min-h-0"
                                                    placeholder="As on your ID"
                                                />
                                            </div>
                                            <div>
                                                <label htmlFor="email" className="mb-1.5 block text-sm font-semibold text-gray-900">
                                                    Email <span className="text-red-600">*</span>
                                                </label>
                                                <input
                                                    type="email"
                                                    id="email"
                                                    name="email"
                                                    value={formData.email}
                                                    onChange={handleInputChange}
                                                    required
                                                    autoComplete="email"
                                                    className="block min-h-[48px] w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-base text-gray-900 outline-none transition focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10 sm:min-h-0"
                                                    placeholder="name@example.com"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-4 border-t border-gray-100 pt-6">
                                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{COPY.form.sectionContact}</p>
                                        <div>
                                            <label htmlFor="phone" className="mb-1.5 block text-sm font-semibold text-gray-900">
                                                Mobile number <span className="text-red-600">*</span>
                                            </label>
                                            <p className="mb-2 text-xs text-gray-500">India: 10-digit number. We will send a one-time code.</p>
                                            <div className="flex min-h-[48px] overflow-hidden rounded-xl border border-gray-300 bg-white focus-within:border-gray-900 focus-within:ring-2 focus-within:ring-gray-900/10 sm:min-h-0">
                                                <span
                                                    className="inline-flex shrink-0 select-none items-center border-r border-gray-200 bg-gray-50 px-3 py-3 text-sm font-semibold tabular-nums text-gray-700"
                                                    aria-hidden
                                                >
                                                    +91
                                                </span>
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
                                                    autoComplete="tel-national"
                                                    className="min-h-[48px] w-full min-w-0 flex-1 border-0 bg-transparent px-3 py-3 text-base font-medium text-gray-900 outline-none placeholder:text-gray-400 disabled:opacity-60 sm:min-h-0 sm:px-4"
                                                    placeholder="98765 43210"
                                                />
                                            </div>
                                            {otpStep === "verified" ? (
                                                <p className="mt-2 flex items-center gap-2 text-sm font-medium text-green-700">
                                                    <FaCheckCircle className="shrink-0" aria-hidden />
                                                    Mobile verified
                                                </p>
                                            ) : null}
                                        </div>

                                        {otpStep === "otp" ? (
                                            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
                                                <h3 className="text-center text-base font-semibold text-gray-900">Verification code</h3>
                                                <p className="mt-1 text-center text-xs text-gray-600 sm:text-sm">
                                                    Sent to{" "}
                                                    <span className="font-medium text-gray-900">
                                                        {formData.phone && formData.phone.length === 10
                                                            ? `+91 ${formData.phone.slice(0, 5)} ${formData.phone.slice(5)}`
                                                            : formData.phone || "—"}
                                                    </span>
                                                </p>
                                                <div className="mx-auto mt-4 max-w-sm">
                                                    <OTPInput
                                                        value={otpCode}
                                                        onChange={(value) => {
                                                            setOtpCode(value);
                                                            setError(null);
                                                            clearOtpError();
                                                        }}
                                                        onComplete={(code) => {
                                                            setOtpCode(code);
                                                            if (code.length === 6) handleVerifyOTP(code);
                                                        }}
                                                        error={otpError}
                                                        onClearError={clearOtpError}
                                                    />
                                                </div>
                                                {otpError ? (
                                                    <p className="mt-3 text-center text-sm font-medium text-red-600">{otpError}</p>
                                                ) : null}
                                                <div className="mt-4 flex flex-col items-center justify-center gap-3 border-t border-gray-100 pt-4 text-sm sm:flex-row sm:gap-8">
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setOtpStep("phone");
                                                            resetOtp();
                                                        }}
                                                        className="font-medium text-gray-600 transition hover:text-gray-900"
                                                    >
                                                        Change number
                                                    </button>
                                                    {countdown > 0 ? (
                                                        <span className="font-mono text-gray-400">
                                                            Resend in {Math.floor(countdown / 60)}:{(countdown % 60).toString().padStart(2, "0")}
                                                        </span>
                                                    ) : (
                                                        <button
                                                            type="button"
                                                            onClick={handleResendOTP}
                                                            disabled={otpLoading}
                                                            className="font-semibold text-orange-600 hover:text-orange-700 disabled:opacity-50"
                                                        >
                                                            Resend code
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        ) : null}
                                    </div>

                                    <div className="space-y-4 border-t border-gray-100 pt-6">
                                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{COPY.form.sectionEducation}</p>
                                        <div>
                                            <label htmlFor="address" className="mb-1.5 block text-sm font-semibold text-gray-900">
                                                Address
                                            </label>
                                            <textarea
                                                id="address"
                                                name="address"
                                                value={formData.address}
                                                onChange={handleInputChange}
                                                rows={3}
                                                autoComplete="street-address"
                                                className="block min-h-[100px] w-full resize-y rounded-xl border border-gray-300 bg-white px-4 py-3 text-base text-gray-900 outline-none transition focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10"
                                                placeholder="City, state — optional if not required by your program"
                                            />
                                        </div>
                                        <div>
                                            <label htmlFor="qualification" className="mb-1.5 block text-sm font-semibold text-gray-900">
                                                Qualification
                                            </label>
                                            <input
                                                type="text"
                                                id="qualification"
                                                name="qualification"
                                                value={formData.qualification}
                                                onChange={handleInputChange}
                                                className="block min-h-[48px] w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-base text-gray-900 outline-none transition focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10 sm:min-h-0"
                                                placeholder="e.g. B.Tech, B.Sc., Diploma"
                                            />
                                        </div>
                                        <div>
                                            <label htmlFor="college_name" className="mb-1.5 block text-sm font-semibold text-gray-900">
                                                College / organization
                                            </label>
                                            <input
                                                type="text"
                                                id="college_name"
                                                name="college_name"
                                                value={formData.college_name}
                                                onChange={handleInputChange}
                                                className="block min-h-[48px] w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-base text-gray-900 outline-none transition focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10 sm:min-h-0"
                                                placeholder="Institution or employer"
                                            />
                                        </div>
                                        <div>
                                            <label htmlFor="year_of_passing" className="mb-1.5 block text-sm font-semibold text-gray-900">
                                                Year of completion
                                            </label>
                                            <input
                                                type="number"
                                                id="year_of_passing"
                                                name="year_of_passing"
                                                value={formData.year_of_passing}
                                                onChange={handleInputChange}
                                                min={1900}
                                                max={2100}
                                                className="block min-h-[48px] w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-base text-gray-900 outline-none transition focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10 sm:min-h-0"
                                                placeholder="e.g. 2024"
                                            />
                                        </div>
                                    </div>

                                    <div className="border-t border-gray-100 pt-6">
                                        <button
                                            type="submit"
                                            disabled={
                                                submitting ||
                                                otpLoading ||
                                                (otpStep === "otp" && !otpVerified && otpCode.length !== 6) ||
                                                !formData.name.trim() ||
                                                !formData.email.trim() ||
                                                !isValidEmail(formData.email)
                                            }
                                            className="flex min-h-[48px] w-full items-center justify-center rounded-xl bg-gray-900 px-6 py-3.5 text-sm font-semibold text-white shadow-md transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:bg-gray-300 sm:min-h-0 sm:text-base"
                                        >
                                            {submitting ? (
                                                <span className="flex items-center gap-2">
                                                    <FaSpinner className="animate-spin" aria-hidden />
                                                    Submitting…
                                                </span>
                                            ) : otpLoading ? (
                                                "Please wait…"
                                            ) : otpVerified ? (
                                                "Complete registration"
                                            ) : otpStep === "otp" ? (
                                                "Verify and continue"
                                            ) : (
                                                "Send verification code"
                                            )}
                                        </button>
                                        <p className="mt-3 text-center text-[11px] leading-relaxed text-gray-500 sm:text-xs">{COPY.form.footerNote}</p>
                                    </div>
                                </form>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
