"use client";
import React, { useState, useEffect, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchMCQQuestions,
  fetchCodingProblems,
} from "@/redux/features/publicChallenge/publicChallengeSlice";
import ChallengeTimer from "./ChallengeTimer";
import { getNowMs, initTimeSync, syncServerTime } from '@/utils/timeSync';

// Inline timer component for compact display
const CompactTimer = ({ timeLeft }) => {
  const formatUnit = (value) => String(Math.max(0, Number.isFinite(value) ? value : 0)).padStart(2, '0');
  const showTimer = timeLeft && (timeLeft.hours > 0 || timeLeft.minutes > 0 || timeLeft.seconds > 0);

  if (!showTimer) return null;

  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border ${timeLeft.hours === 0 && timeLeft.minutes < 5
      ? 'bg-red-50 border-red-200 text-red-600'
      : 'bg-orange-50 border-orange-200 text-orange-600'
      }`}>
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <span className="font-mono font-semibold text-sm">
        {formatUnit(timeLeft.hours)}:{formatUnit(timeLeft.minutes)}:{formatUnit(timeLeft.seconds)}
      </span>
    </div>
  );
};
import MCQTab from "./tabs/MCQTab";
import CodingProblemsTab from "./tabs/CodingProblemsTab";
import { FaSpinner, FaExclamationTriangle } from "react-icons/fa";

export default function ChallengeInterface({ challengeId }) {
  const dispatch = useDispatch();
  const [activeTab, setActiveTab] = useState("mcq"); // 'mcq' | 'coding'
  const [selectedProblemId, setSelectedProblemId] = useState(null);

  const {
    currentChallenge: challenge,
    mcqQuestions,
    codingProblems,
    phone,
    accessCode,
    userId,
    registrationId,
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
      mcqQuestions: mcqFromChallenge.length > 0 ? mcqFromChallenge : state.publicChallenge.mcqQuestions,
      codingProblems: problemsFromChallenge.length > 0 ? problemsFromChallenge : state.publicChallenge.codingProblems,
      phone: state.publicChallenge.phone,
      accessCode: state.publicChallenge.accessCode,
      userId: state.publicChallenge.userId,
      registrationId: state.publicChallenge.registrationId,
      loading: state.publicChallenge.loading,
      error: state.publicChallenge.error,
    };
  });

  // Timer logic
  const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0 });
  const [isChallengeEnded, setIsChallengeEnded] = useState(false);

  useEffect(() => {
    // Initialize time sync
    initTimeSync();

    // Re-sync every 5 minutes
    const resyncInterval = setInterval(() => syncServerTime(), 5 * 60 * 1000);
    return () => clearInterval(resyncInterval);
  }, []);

  useEffect(() => {
    if (!challenge?.challenge_end_at) return;

    const updateTimer = () => {
      const now = getNowMs();
      const endTime = new Date(challenge.challenge_end_at).getTime();
      const diff = Math.max(0, endTime - now);

      if (diff <= 0) {
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

    // Update immediately
    updateTimer();

    // Update every second
    const timer = setInterval(updateTimer, 1000);
    return () => clearInterval(timer);
  }, [challenge?.challenge_end_at]);

  // Use problems and MCQ questions from challenge details (already included in API response)
  // Only fetch separately as fallback if challenge details didn't include them
  useEffect(() => {
    if (!challengeId || !userId || !registrationId) return;

    // Check if we have data from challenge details
    const hasMCQFromChallenge = challenge?.mcq_questions && Array.isArray(challenge.mcq_questions) && challenge.mcq_questions.length > 0;
    const hasProblemsFromChallenge = challenge?.problems && Array.isArray(challenge.problems) && challenge.problems.length > 0;

    // Only fetch separately if not available from challenge details
    if (activeTab === "mcq" && mcqQuestions.length === 0 && !hasMCQFromChallenge) {
      dispatch(fetchMCQQuestions({
        challengeId: parseInt(challengeId),
        userId,
        registrationId
      }));
    }

    if (activeTab === "coding" && codingProblems.length === 0 && !hasProblemsFromChallenge) {
      dispatch(fetchCodingProblems({
        challengeId: parseInt(challengeId),
        userId,
        registrationId
      }));
    }

  }, [challengeId, userId, registrationId, activeTab, dispatch, mcqQuestions.length, codingProblems.length, challenge]);

  // Set first problem as selected when problems are loaded
  useEffect(() => {
    if (codingProblems.length > 0 && !selectedProblemId) {
      setSelectedProblemId(codingProblems[0].id);
    }
  }, [codingProblems, selectedProblemId]);

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

  // Get counts from challenge or current state
  const mcqCount = challenge?.mcq_questions_count || challenge?.mcq_questions?.length || mcqQuestions.length || 0;
  const problemsCount = challenge?.problems_count || challenge?.problems?.length || codingProblems.length || 0;

  const tabs = [
    { id: "mcq", label: "MCQ Questions", count: mcqCount },
    { id: "coding", label: "Coding Problems", count: problemsCount },
  ];

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
            phone={phone}
            onGoToProblems={() => setActiveTab("coding")}
          />
        );
      case "coding":
        return (
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
        );
      default:
        return null;
    }
  };

  return (
    <div className="h-screen bg-gray-50 flex flex-col overflow-hidden relative">
      {/* Challenge Ended Overlay */}
      {isChallengeEnded && (
        <div
          className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-gray-50"
        >
          <div className="bg-white rounded-3xl shadow-2xl max-w-3xl w-full p-16 text-center">
            {/* Success Icon */}
            <div className="mb-10">
              <div className="w-28 h-28 bg-orange-500 rounded-full mx-auto flex items-center justify-center mb-8 animate-pulse">
                <svg className="w-16 h-16 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>

            {/* Main Heading */}
            <h1 className="text-6xl font-bold text-gray-900 mb-6">
              Thank You!
            </h1>

            <p className="text-2xl text-gray-600 mb-12 leading-relaxed">
              Your challenge has been completed successfully.<br />
              Our team will review your submissions and contact you soon.
            </p>

            {/* Divider */}
            <div className="w-24 h-1 bg-orange-500 mx-auto mb-12"></div>

            {/* Info Box */}
            <div className="bg-orange-50 rounded-2xl p-8 mb-12 border-2 border-orange-200">
              <div className="flex items-center justify-center gap-4">
                <svg className="w-7 h-7 text-orange-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span className="text-xl font-semibold text-orange-900">All your answers have been saved</span>
              </div>
            </div>

            {/* Logo */}
            <div className="mb-10">
              <img
                src="/logos/10k_logo_black.webp"
                alt="10000 Coders"
                className="h-14 mx-auto object-contain opacity-80"
              />
            </div>

            {/* Home Button */}
            <a
              href="/"
              className="inline-flex items-center gap-3 px-10 py-5 bg-orange-500 hover:bg-orange-600 text-white font-bold text-xl rounded-2xl transition-all shadow-xl hover:shadow-2xl transform hover:-translate-y-1"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              Back to Home
            </a>
          </div>
        </div>
      )}

      {/* Tabs Navigation - Fixed at top */}
      <div className="flex-shrink-0 bg-white border-b border-gray-200 shadow-sm">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-8">
            {/* Logo */}
            <img src="/logos/10k_logo_black.webp" alt="10000 Coders" className="h-12 object-contain" />
            {/* Tabs */}
            <div className="flex items-center gap-1">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`relative px-5 py-2.5 text-sm font-bold transition-all rounded-t-lg ${activeTab === tab.id
                    ? "text-orange-600"
                    : "text-gray-600 hover:text-gray-900"
                    }`}
                >
                  <span className="flex items-center gap-2">
                    {tab.label}
                    {tab.count !== undefined && (
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${activeTab === tab.id
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
          {/* Right Section: Time & User */}
          <div className="flex items-center gap-4">
            <CompactTimer timeLeft={timeLeft} />

            {/* User Profile */}
            {useSelector(state => state.publicChallenge.userName) && (
              <div className="flex items-center gap-2 pl-4 border-l border-gray-200">
                <div className="flex flex-col items-end">
                  <span className="text-sm font-bold text-gray-900">{useSelector(state => state.publicChallenge.userName)}</span>
                </div>
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center text-white shadow-sm border-2 border-white">
                  <span className="text-sm font-bold uppercase">
                    {useSelector(state => state.publicChallenge.userName).charAt(0)}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tab Content - Takes remaining space, no scrolling */}
      <div className="flex-1 overflow-hidden">
        {renderTabContent()}
      </div>
    </div>
  );
}
