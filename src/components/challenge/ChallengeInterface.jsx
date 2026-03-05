"use client";
import React, { useState, useEffect, useMemo, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchMCQQuestions,
  fetchCodingProblems,
} from "@/redux/features/publicChallenge/publicChallengeSlice";
import ChallengeTimer from "./ChallengeTimer";
import { getNowMs, initTimeSync, syncServerTime } from '@/utils/timeSync';
import { useRouter } from "next/navigation";

// On mobile, use visual viewport height so layout fits above the keyboard and content can scroll.
function useVisualViewportHeight() {
  const [height, setHeight] = useState(typeof window !== 'undefined' ? window.innerHeight : null);
  useEffect(() => {
    if (typeof window === 'undefined' || !window.visualViewport) return;
    const update = () => setHeight(window.visualViewport.height);
    update();
    window.visualViewport.addEventListener('resize', update);
    window.visualViewport.addEventListener('scroll', update);
    return () => {
      window.visualViewport.removeEventListener('resize', update);
      window.visualViewport.removeEventListener('scroll', update);
    };
  }, []);
  return height;
}


// Inline timer component for compact display (smaller on mobile)
const CompactTimer = ({ timeLeft }) => {
  const formatUnit = (value) => String(Math.max(0, Number.isFinite(value) ? value : 0)).padStart(2, '0');
  const showTimer = timeLeft && (timeLeft.hours > 0 || timeLeft.minutes > 0 || timeLeft.seconds > 0);

  if (!showTimer) return null;

  return (
    <div className={`flex items-center gap-1 sm:gap-2 px-2 py-1 sm:px-3 sm:py-1.5 rounded-lg border shrink-0 ${timeLeft.hours === 0 && timeLeft.minutes < 5
      ? 'bg-red-50 border-red-200 text-red-600'
      : 'bg-orange-50 border-orange-200 text-orange-600'
      }`}>
      <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <span className="font-mono font-semibold text-xs sm:text-sm whitespace-nowrap">
        {formatUnit(timeLeft.hours)}:{formatUnit(timeLeft.minutes)}:{formatUnit(timeLeft.seconds)}
      </span>
    </div>
  );
};
import MCQTab from "./tabs/MCQTab";
import CodingProblemsTab from "./tabs/CodingProblemsTab";
import { FaSpinner, FaExclamationTriangle } from "react-icons/fa";
import { clearError } from "@/redux/features/publicChallenge/publicChallengeSlice";
import { appendUtmToPath } from "@/utils/utmParams";
import { addSubmittedChallenge, isChallengeSubmitted } from "@/utils/submittedChallenges";

export default function ChallengeInterface({ challengeId, onSessionInvalid, utmQuery }) {
  const dispatch = useDispatch();
  const [activeTab, setActiveTab] = useState("coding"); // 'coding' (problems first) | 'mcq'
  const [selectedProblemId, setSelectedProblemId] = useState(null);
  const router = useRouter();
  const lastMCQFetchKeyRef = useRef(null);
  const lastProblemsFetchKeyRef = useRef(null);
  const visualViewportHeight = useVisualViewportHeight();

  const {
    currentChallenge: challenge,
    mcqQuestions,
    codingProblems,
    phone,
    accessCode,
    userId,
    registrationId,
    userName,
    loading,
    error,
  } = useSelector((state) => {
    // Prefer data from challenge details, fallback to separate state
    const challenge = state.publicChallenge.currentChallenge;
    const mcqFromChallenge = challenge?.mcq_questions || [];
    const problemsFromChallenge = challenge?.problems || [];

    return {
      currentChallenge: challenge,
      // Use challenge details data if available, otherwise use separate state
      mcqQuestions: state.publicChallenge.mcqQuestions.length > 0 ? state.publicChallenge.mcqQuestions : mcqFromChallenge,
      codingProblems: state.publicChallenge.codingProblems.length > 0 ? state.publicChallenge.codingProblems : problemsFromChallenge,
      phone: state.publicChallenge.phone,
      accessCode: state.publicChallenge.accessCode,
      userId: state.publicChallenge.userId,
      registrationId: state.publicChallenge.registrationId,
      userName: state.publicChallenge.userName,
      loading: state.publicChallenge.loading,
      error: state.publicChallenge.error,
    };
  });

  // Timer logic
  const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0 });
  const [isChallengeEnded, setIsChallengeEnded] = useState(false);
  const challengeEndedRef = useRef(false); // once true (submit or timer), never show MCQs again

  // If this challenge was already submitted (localStorage), show thank-you only (works after refresh or new tab)
  useEffect(() => {
    if (!challengeId) return;
    if (isChallengeSubmitted({ id: challengeId, slug: challenge?.slug })) {
      challengeEndedRef.current = true;
      setIsChallengeEnded(true);
    }
  }, [challengeId, challenge?.slug]);

  useEffect(() => {
    // Initialize time sync
    initTimeSync();

    // Re-sync every 5 minutes
    const resyncInterval = setInterval(() => syncServerTime(), 5 * 60 * 1000);
    return () => clearInterval(resyncInterval);
  }, []);

  useEffect(() => {
    if (!challenge?.challenge_end_at) return;
    if (challengeEndedRef.current) return; // already ended (e.g. user submitted), don't update timer

    const updateTimer = () => {
      if (challengeEndedRef.current) return;
      const now = getNowMs();
      const endTime = new Date(challenge.challenge_end_at).getTime();
      const diff = Math.max(0, endTime - now);

      if (diff <= 0) {
        challengeEndedRef.current = true;
        setTimeLeft({ hours: 0, minutes: 0, seconds: 0 });
        setIsChallengeEnded(true);
      } else {
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        setTimeLeft({ hours, minutes, seconds });
        setIsChallengeEnded(false);
      }
    };

    updateTimer();
    const timer = setInterval(updateTimer, 1000);
    return () => clearInterval(timer);
  }, [challenge?.challenge_end_at]);

  // Mark challenge as submitted when timer ends (so "Submitted" shows on challenges/landing when they return)
  useEffect(() => {
    if (isChallengeEnded && challengeId) {
      addSubmittedChallenge(challengeId, challenge?.slug);
    }
  }, [isChallengeEnded, challengeId, challenge?.slug]);

  // Use problems and MCQ questions from challenge details (already included in API response)
  // Only fetch separately as fallback if challenge details didn't include them
  useEffect(() => {
    if (!challengeId || !userId || !registrationId) return;

    // Check if we have data from challenge details
    const hasMCQFromChallenge = challenge?.mcq_questions && Array.isArray(challenge.mcq_questions) && challenge.mcq_questions.length > 0;
    const hasProblemsFromChallenge = challenge?.problems && Array.isArray(challenge.problems) && challenge.problems.length > 0;

    // Always fetch MCQ questions once per user session when MCQ tab is active.
    // This ensures we receive user_submission data (prefill answers) from the backend.
    if (activeTab === "mcq") {
      const fetchKey = `${challengeId}:${userId}:${registrationId}`;
      if (lastMCQFetchKeyRef.current !== fetchKey) {
        lastMCQFetchKeyRef.current = fetchKey;
        dispatch(fetchMCQQuestions({
          challengeId: parseInt(challengeId),
          userId,
          registrationId
        }));
      }
    }

    if (activeTab === "coding" && codingProblems.length === 0 && !hasProblemsFromChallenge) {
      // no-op: handled below
    }

    // Always fetch coding problems once per user session when Coding tab is active.
    // This ensures we receive is_solved + user_submission (latest AC) from backend.
    if (activeTab === "coding") {
      const fetchKey = `${challengeId}:${userId}:${registrationId}`;
      if (lastProblemsFetchKeyRef.current !== fetchKey) {
        lastProblemsFetchKeyRef.current = fetchKey;
        dispatch(fetchCodingProblems({
          challengeId: parseInt(challengeId),
          userId,
          registrationId
        }));
      }
    }

  }, [challengeId, userId, registrationId, activeTab, dispatch, mcqQuestions.length, codingProblems.length, challenge]);

  // When API returns registration/session invalid, send user back to phone/register flow
  useEffect(() => {
    const msg = typeof error === "string" ? error : error?.message;
    if (!msg) return;
    const lower = String(msg).toLowerCase();
    if (
      lower.includes("must be registered") ||
      lower.includes("invalid user_id or registration_id") ||
      lower.includes("user_id and registration_id are required")
    ) {
      dispatch(clearError());
      onSessionInvalid?.();
    }
  }, [error, dispatch, onSessionInvalid]);

  // Set first problem as selected when problems are loaded
  useEffect(() => {
    if (codingProblems.length > 0 && !selectedProblemId) {
      setSelectedProblemId(codingProblems[0].id);
    }
  }, [codingProblems, selectedProblemId]);

  // Get counts from challenge or current state (before any early return so hook below always runs)
  const mcqCount = challenge?.mcq_questions_count || challenge?.mcq_questions?.length || mcqQuestions.length || 0;
  const problemsCount = challenge?.problems_count || challenge?.problems?.length || codingProblems.length || 0;

  // Auto-select tab based on availability (must run before any early return to satisfy rules of hooks)
  useEffect(() => {
    if (mcqCount === 0 && problemsCount > 0 && activeTab !== "coding") {
      setActiveTab("coding");
    } else if (problemsCount === 0 && mcqCount > 0 && activeTab !== "mcq") {
      setActiveTab("mcq");
    }
  }, [mcqCount, problemsCount, activeTab]);

  // Problems-only challenge: when student has solved all problems, show thank-you (same as MCQs submit)
  useEffect(() => {
    if (challengeEndedRef.current) return;
    if (mcqCount > 0 || problemsCount === 0) return;
    if (!codingProblems.length || codingProblems.length !== problemsCount) return;
    const allSolved = codingProblems.every((p) => Boolean(p.is_solved));
    if (!allSolved) return;
    challengeEndedRef.current = true;
    addSubmittedChallenge(challengeId, challenge?.slug);
    setIsChallengeEnded(true);
  }, [mcqCount, problemsCount, codingProblems, challengeId, challenge?.slug]);

  if (!challenge) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <FaSpinner className="animate-spin text-4xl text-gray-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading challenge...</p>
        </div>
      </div>
    );
  }

  // Problems first, then MCQs (mcqCount/problemsCount already set above before early return)
  const tabs = [
    ...(problemsCount > 0 ? [{ id: "coding", label: "Coding Problems", count: problemsCount }] : []),
    ...(mcqCount > 0 ? [{ id: "mcq", label: "MCQ Questions", count: mcqCount }] : []),
  ];

  const allProblemsSolved =
    problemsCount > 0 &&
    codingProblems.length === problemsCount &&
    codingProblems.every((p) => Boolean(p.is_solved));
  const showGoToMcqButton = activeTab === "coding" && allProblemsSolved && mcqCount > 0;

  const renderTabContent = () => {
    switch (activeTab) {
      case "mcq":
        return (
          <MCQTab
            challengeId={parseInt(challengeId)}
            questions={mcqQuestions}
            loading={loading.mcqQuestions}
            userId={userId}
            registrationId={registrationId}
            hasProblems={problemsCount > 0}
            allProblemsSolved={allProblemsSolved}
            onGoToProblems={() => setActiveTab("coding")}
            onSubmitChallenge={() => {
              challengeEndedRef.current = true;
              addSubmittedChallenge(challengeId, challenge?.slug);
              setIsChallengeEnded(true);
            }}
          />
        );
      case "coding":
        return (
          <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
            {showGoToMcqButton && (
              <div className="flex-shrink-0 bg-orange-50 border-b border-orange-200 px-3 py-2.5 sm:px-4 sm:py-3 flex items-center justify-center gap-3">
                <span className="text-sm sm:text-base font-semibold text-orange-900">
                  All problems submitted successfully.
                </span>
                <button
                  type="button"
                  onClick={() => setActiveTab("mcq")}
                  className="inline-flex items-center gap-2 px-4 py-2 sm:px-5 sm:py-2.5 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl shadow-md hover:shadow-lg transition-all"
                >
                  Go to MCQs
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </button>
              </div>
            )}
            <div className="flex-1 min-h-0 overflow-hidden">
            <CodingProblemsTab
              challengeId={parseInt(challengeId)}
              problems={codingProblems}
              selectedProblemId={selectedProblemId}
              onSelectProblem={setSelectedProblemId}
              loading={loading.codingProblems}
              userId={userId}
              registrationId={registrationId}
              phone={phone}
              accessCode={accessCode}
              timeLeft={timeLeft}
            />
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  const handleRegistrationSubmit = async (formData) => {
    // No-op: registration is handled by the interface page
  };

  // Use visual viewport height when available so on mobile when keyboard opens the layout shrinks and editor stays above keyboard; code scrolls inside editor.
  const rootStyle = visualViewportHeight != null
    ? { height: visualViewportHeight, maxHeight: visualViewportHeight }
    : undefined;

  // When challenge ended (submitted or timer), show only thank-you screen — no navbar, no MCQ/coding content
  if (isChallengeEnded) {
    return (
      <div
        className="h-dvh sm:h-screen bg-gray-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto"
        style={rootStyle}
      >
        <div className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl max-w-3xl w-full p-6 sm:p-10 md:p-16 text-center">
          <div className="mb-6 sm:mb-10">
            <div className="w-20 h-20 sm:w-28 sm:h-28 bg-orange-500 rounded-full mx-auto flex items-center justify-center mb-6 sm:mb-8 animate-pulse">
              <svg className="w-10 h-10 sm:w-16 sm:h-16 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-gray-900 mb-4 sm:mb-6">
            Thank You!
          </h1>
          <p className="text-lg sm:text-xl md:text-2xl text-gray-600 mb-8 sm:mb-12 leading-relaxed px-1">
            Your challenge has been completed successfully.<br />
            Our team will review your submissions and contact you soon.
          </p>
          <div className="w-24 h-1 bg-orange-500 mx-auto mb-8 sm:mb-12"></div>
          <div className="bg-orange-50 rounded-xl sm:rounded-2xl p-4 sm:p-6 md:p-8 border-2 border-orange-200">
            <div className="flex items-center justify-center gap-3 sm:gap-4 flex-wrap">
              <svg className="w-6 h-6 sm:w-7 sm:h-7 text-orange-600 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span className="text-base sm:text-lg md:text-xl font-semibold text-orange-900">Submitted. All your answers have been saved.</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="h-dvh sm:h-screen bg-gray-50 flex flex-col overflow-hidden relative"
      style={rootStyle}
    >
      {/* Navbar: row 1 = logo + timer + user; row 2 = MCQ / Problems tabs */}
      <div className="flex-shrink-0 bg-white border-b border-gray-200 shadow-sm">
        {/* Row 1: Logo (left) | Timer + User (right) */}
        <div className="flex items-center justify-between gap-2 px-2 sm:px-4 md:px-6 py-1.5 sm:py-2 min-h-[40px] sm:min-h-[44px]">
          <img src="/logos/10k_logo_black.webp" alt="10000Coders" className="h-6 sm:h-8 md:h-10 object-contain shrink-0" />
          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
            <CompactTimer timeLeft={timeLeft} />
            {userName && (
              <div className="flex items-center gap-1.5 sm:gap-2 pl-1.5 sm:pl-3 border-l border-gray-200">
                <div className="hidden sm:flex flex-col items-end">
                  <span className="text-xs font-bold text-gray-900 truncate max-w-[80px]">{userName}</span>
                </div>
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center text-white shadow-sm border-2 border-white shrink-0">
                  <span className="text-[10px] sm:text-xs font-bold uppercase">
                    {userName.charAt(0)}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
        {/* Row 2: MCQ Questions | Coding Problems */}
        <div className="border-t border-gray-100 px-1 sm:px-2">
          <div className="flex items-center gap-0.5 overflow-x-auto scrollbar-hide min-h-[40px]">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative px-3 py-2 sm:px-4 sm:py-2.5 text-xs sm:text-sm font-bold transition-all rounded-t-lg whitespace-nowrap shrink-0 flex items-center ${activeTab === tab.id
                  ? "text-orange-600"
                  : "text-gray-600 hover:text-gray-900"
                  }`}
              >
                <span className="flex items-center gap-1.5 sm:gap-2">
                  {tab.label}
                  {tab.count !== undefined && (
                    <span className={`px-1.5 py-0.5 rounded-full text-[10px] sm:text-xs font-semibold ${activeTab === tab.id
                      ? "bg-orange-100 text-orange-700"
                      : "bg-gray-100 text-gray-600"
                      }`}>
                      {tab.count}
                    </span>
                  )}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
        {renderTabContent()}
      </div>
    </div>
  );
}
