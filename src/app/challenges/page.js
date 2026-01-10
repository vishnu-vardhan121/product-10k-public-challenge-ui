"use client";
import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import Link from "next/link";
import { fetchChallenges } from "@/redux/features/publicChallenge/publicChallengeSlice";
import {
  FaSearch,
  FaFilter,
  FaCode,
  FaCalendarAlt,
  FaClock,
  FaUsers,
  FaArrowRight,
  FaTrophy,
  FaCheckCircle,
  FaRocket,
  FaHourglassStart,
  FaHistory,
  FaQuestionCircle
} from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";
import { useServerTime } from "@/hooks/useServerTime";

export default function ChallengesPage() {
  const dispatch = useDispatch();
  const { challenges, loading, error } = useSelector((state) => ({
    challenges: state.publicChallenge.challenges,
    loading: state.publicChallenge.loading.challenges,
    error: state.publicChallenge.error,
  }));
  const serverTime = useServerTime();

  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");

  useEffect(() => {
    dispatch(fetchChallenges());
  }, [dispatch]);

  const handleRetry = () => {
    dispatch(fetchChallenges());
  };

  const formatDate = (dateString) => {
    if (!dateString) return "TBA";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // --- Helper: Get Status for Logic & UI ---
  const getChallengeStatus = (challenge) => {
    const now = serverTime || new Date();
    const regStart = new Date(challenge.registration_start_at);
    const regEnd = new Date(challenge.registration_end_at);
    const challengeStart = challenge.challenge_start_at
      ? new Date(challenge.challenge_start_at)
      : null;
    const challengeEnd = challenge.challenge_end_at
      ? new Date(challenge.challenge_end_at)
      : null;

    if (now < regStart) {
      return {
        key: "UPCOMING",
        text: "Upcoming",
        color: "bg-blue-50 text-blue-700 border-blue-200",
        icon: FaClock,
      };
    } else if (now >= regStart && now <= regEnd) {
      // Logic fix: specific backend status check
      if (challenge.status === "PUBLISHED") {
        return {
          key: "UPCOMING",
          text: "Coming Soon",
          color: "bg-orange-50 text-orange-700 border-orange-200",
          icon: FaClock,
        };
      }
      return {
        key: "REGISTRATION_OPEN",
        text: "Registration Open",
        color: "bg-green-50 text-green-700 border-green-200",
        icon: FaCheckCircle,
      };
    } else if (
      challengeStart &&
      now >= challengeStart &&
      challengeEnd &&
      now <= challengeEnd
    ) {
      return {
        key: "ONGOING",
        text: "Ongoing",
        color: "bg-orange-50 text-orange-700 border-orange-200",
        icon: FaClock,
      };
    } else if (challengeEnd && now > challengeEnd) {
      return {
        key: "ENDED",
        text: "Ended",
        color: "bg-gray-100 text-gray-600 border-gray-200",
        icon: FaCheckCircle,
      };
    }
    return {
      key: "AVAILABLE",
      text: "Available",
      color: "bg-purple-50 text-purple-700 border-purple-200",
      icon: FaCheckCircle,
    };
  };

  // Filter challenges - Show only PUBLIC, NON-ARCHIVED challenges
  const filteredChallenges = challenges.filter((challenge) => {
    // Basic search filtering
    const matchesSearch =
      challenge.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      challenge.description?.toLowerCase().includes(searchQuery.toLowerCase());

    // Strict filtering: Only PUBLIC and (Registration Open OR Ongoing)
    const now = new Date();
    const regStart = new Date(challenge.registration_start_at);
    const regEnd = new Date(challenge.registration_end_at);
    const challengeEnd = challenge.challenge_end_at ? new Date(challenge.challenge_end_at) : null;

    // Check if registration is currently open
    const isRegistrationOpen = now >= regStart && now <= regEnd;

    // Check if challenge is active (ongoing) - allowing late joins or just visibility
    const isOngoing = challengeEnd ? now <= challengeEnd : false;

    // Check type is PUBLIC (not PLACEMENT/COLLEGE)
    const isPublic = challenge.challenge_type === "PUBLIC";

    // Optional: Also allow if it's explicitly status=REGISTRATION from backend
    const isBackendActive = challenge.status === "REGISTRATION" || challenge.status === "ACTIVE";

    return matchesSearch && isPublic && (isRegistrationOpen || isOngoing || isBackendActive);
  });


  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.4,
      },
    },
  };

  return (
    <main className="min-h-screen bg-gray-50 pt-24 pb-16 relative overflow-hidden">
      {/* Background Ambience (Light Mode) */}
      <div className="absolute top-0 right-0 -mr-40 -mt-40 w-96 h-96 bg-orange-100 rounded-full blur-3xl pointer-events-none opacity-50"></div>
      <div className="absolute bottom-0 left-0 -ml-40 -mb-40 w-96 h-96 bg-blue-100 rounded-full blur-3xl pointer-events-none opacity-50"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Header */}
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <span className="text-orange-600 font-semibold tracking-wider uppercase text-sm mb-2 block">
            Arena
          </span>
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4 leading-tight">
            Explore All <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-600 to-amber-600">Challenges</span>
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto font-light">
            Push your limits with our curated coding competitions and win exciting rewards.
          </p>
        </motion.div>

        {/* Search Bar (Light) */}
        <motion.div
          className="mb-12 max-w-2xl mx-auto"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <div className="relative group">
            <div className="absolute inset-0 bg-gradient-to-r from-orange-500/10 to-blue-500/10 rounded-xl blur-md group-hover:blur-lg transition-all opacity-50"></div>
            <div className="relative flex items-center bg-white border border-gray-200 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-orange-500/20 focus-within:border-orange-500 transition-all shadow-sm">
              <FaSearch className="ml-4 text-gray-400 text-lg group-focus-within:text-orange-500 transition-colors" />
              <input
                type="text"
                placeholder="Search by title or technology..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-4 pr-4 py-4 bg-transparent text-gray-900 placeholder-gray-400 focus:outline-none text-base"
              />
            </div>
          </div>
        </motion.div>

        {/* Challenges Grid */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="relative w-16 h-16">
              <div className="absolute inset-0 border-4 border-gray-200 rounded-full"></div>
              <div className="absolute inset-0 border-4 border-orange-500 rounded-full border-t-transparent animate-spin"></div>
            </div>
            <p className="text-gray-500 mt-4 text-sm tracking-widest uppercase">Loading Challenges...</p>
          </div>
        ) : error ? (
          <motion.div
            className="bg-red-50 border border-red-200 rounded-2xl p-8 text-center max-w-md mx-auto"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <p className="text-red-600 mb-6">{error}</p>
            <button
              onClick={handleRetry}
              className="px-8 py-3 bg-white hover:bg-red-50 text-red-600 border border-red-200 rounded-lg transition-all font-medium shadow-sm"
            >
              Try Again
            </button>
          </motion.div>
        ) : filteredChallenges.length === 0 ? (
          <motion.div
            className="bg-white border border-gray-200 rounded-2xl p-16 text-center max-w-2xl mx-auto shadow-sm"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <FaClock className="text-gray-400 text-3xl" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">No Challenges Active</h3>
            <p className="text-gray-500">
              Challenge timings will be announced soon. Stay tuned!
            </p>
          </motion.div>
        ) : (
          <motion.div
            className="grid grid-cols-1 gap-6"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            {filteredChallenges.map((challenge) => {
              const status = getChallengeStatus(challenge);
              const StatusIcon = status.icon;

              return (
                <motion.div
                  key={challenge.id}
                  variants={cardVariants}
                  className="group relative bg-white border border-gray-200 rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1"
                >
                  <div className="p-6 md:p-8 flex flex-col md:flex-row gap-8">
                    {/* Left: Icon/Image Placeholder */}
                    <div className="hidden md:flex flex-shrink-0 w-24 h-24 bg-gray-50 rounded-2xl items-center justify-center border border-gray-100">
                      <FaCode className="text-3xl text-gray-400 group-hover:text-orange-500 transition-colors" />
                    </div>

                    {/* Middle: Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-4">
                        <div>
                          <h3 className="text-2xl font-bold text-gray-900 mb-2 group-hover:text-orange-600 transition-colors truncate">
                            {challenge.title}
                          </h3>
                          <div className="flex items-center gap-3">
                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold tracking-wide uppercase border ${status.color}`}>
                              <StatusIcon className="text-xs" />
                              {status.text}
                            </span>
                          </div>
                        </div>
                      </div>

                      {challenge.description && (
                        <p className="text-gray-600 text-sm leading-relaxed mb-6 line-clamp-2">
                          {challenge.description}
                        </p>
                      )}

                      {/* Stats Grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
                        <div className="flex items-center gap-3 bg-gray-50 rounded-lg p-3 border border-gray-100">
                          <FaQuestionCircle className="text-orange-500" />
                          <div>
                            <div className="text-gray-900 font-bold">{challenge.mcq_questions_count || 0}</div>
                            <div className="text-[10px] text-gray-500 uppercase tracking-wider">MCQs</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 bg-gray-50 rounded-lg p-3 border border-gray-100">
                          <FaCode className="text-blue-500" />
                          <div>
                            <div className="text-gray-900 font-bold">{challenge.problems_count || 0}</div>
                            <div className="text-[10px] text-gray-500 uppercase tracking-wider">Problems</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 bg-gray-50 rounded-lg p-3 border border-gray-100">
                          <FaUsers className="text-green-500" />
                          <div>
                            <div className="text-gray-900 font-bold">{challenge.registration_count || 0}</div>
                            <div className="text-[10px] text-gray-500 uppercase tracking-wider">Joiners</div>
                          </div>
                        </div>
                      </div>

                      {/* Dates / Messaging */}
                      <div className="flex flex-wrap items-center gap-6 text-sm text-gray-500 font-medium">
                        {/* If Upcoming, show Starts On */}
                        {status.text === "Upcoming" ? (
                          <div className="flex items-center gap-2 text-blue-600 bg-blue-50 px-3 py-1 rounded-md">
                            <FaClock />
                            <span>Challenge starts on: <span className="font-bold">{formatDate(challenge.challenge_start_at)}</span></span>
                          </div>
                        ) : (
                          <>
                            <div className="flex items-center gap-2">
                              <FaCalendarAlt className="text-gray-400" />
                              <span>Reg: <span className="text-gray-700">{formatDate(challenge.registration_start_at)} - {formatDate(challenge.registration_end_at)}</span></span>
                            </div>
                            {challenge.challenge_start_at && (
                              <div className="flex items-center gap-2">
                                <FaClock className="text-gray-400" />
                                <span>Event: <span className="text-gray-700">{formatDate(challenge.challenge_start_at)} - {formatDate(challenge.challenge_end_at)}</span></span>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </div>

                    {/* Right: Action */}
                    <div className="flex flex-col gap-3 justify-center min-w-[140px]">
                      {status.key === "ONGOING" && (
                        <Link
                          href={`/challenges/interface?id=${challenge.id}`}
                          className="w-full px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white text-center rounded-xl hover:shadow-lg hover:shadow-green-500/20 transition-all font-bold text-sm flex items-center justify-center gap-2"
                        >
                          Participate
                          <FaArrowRight className="text-xs" />
                        </Link>
                      )}

                      {status.key === "REGISTRATION_OPEN" && (
                        <Link
                          href={challenge.slug ? `/challenges/register?slug=${challenge.slug}` : `/challenges/register?id=${challenge.id}`}
                          className="w-full px-6 py-3 bg-gradient-to-r from-orange-600 to-red-600 text-white text-center rounded-xl hover:shadow-lg hover:shadow-orange-500/20 transition-all font-bold text-sm flex items-center justify-center gap-2 group/btn"
                        >
                          <span>Register</span>
                          <FaArrowRight className="w-3 h-3 group-hover/btn:translate-x-1 transition-transform" />
                        </Link>
                      )}

                      {status.key === "UPCOMING" && (
                        <button disabled className="w-full px-6 py-3 bg-blue-50 text-blue-500 border border-blue-100 rounded-xl font-bold text-sm cursor-not-allowed">
                          Coming Soon
                        </button>
                      )}

                      {status.key === "ENDED" && (
                        <button disabled className="w-full px-6 py-3 bg-gray-100 text-gray-400 rounded-xl font-medium text-sm cursor-not-allowed border border-gray-200">
                          Ended
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </div>
    </main>
  );
}
