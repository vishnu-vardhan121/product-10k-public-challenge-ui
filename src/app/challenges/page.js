"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { fetchChallenges } from "@/redux/features/publicChallenge/publicChallengeSlice";
import { debounce } from "@/utils/debounce";
import { getUtmQueryString, appendUtmToPath } from "@/utils/utmParams";
import {
  FaSearch,
  FaCode,
  FaCalendarAlt,
  FaClock,
  FaUsers,
  FaArrowRight,
  FaCheckCircle,
} from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";
import { useServerTime } from "@/hooks/useServerTime";
import CountdownTimer from "@/components/CountdownTimer";
import { getDisplayParticipantCount, getParticipantLabel } from "@/shared/config";

export default function ChallengesPage() {
  const dispatch = useDispatch();
  const searchParams = useSearchParams();
  const utmQ = getUtmQueryString(searchParams);
  const { challenges, loading, error } = useSelector((state) => ({
    challenges: state.publicChallenge.challenges,
    loading: state.publicChallenge.loading.challenges,
    error: state.publicChallenge.error,
  }));
  const serverTime = useServerTime();

  const [searchQuery, setSearchQuery] = useState("");
  const isInitialMount = useRef(true);

  // Initial load
  useEffect(() => {
    dispatch(fetchChallenges());
  }, [dispatch]);

  // Debounced search: fetch from API when user stops typing
  const debouncedFetch = useMemo(
    () =>
      debounce((q) => {
        const search = (q || "").trim();
        dispatch(fetchChallenges({ search: search || undefined }));
      }, 400),
    [dispatch]
  );

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    debouncedFetch(searchQuery);
  }, [searchQuery, debouncedFetch]);

  const handleRetry = () => {
    dispatch(fetchChallenges({ search: searchQuery.trim() || undefined }));
  };

  const handleClearSearch = () => {
    setSearchQuery("");
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
        target_time: regStart,
        timer_label: "Registration opens in"
      };
    } else if (now >= regStart && now <= regEnd) {
      // Logic fix: specific backend status check
      if (challenge.status === "PUBLISHED") {
        return {
          key: "UPCOMING",
          text: "Coming Soon",
          color: "bg-orange-50 text-orange-700 border-orange-200",
          icon: FaClock,
          target_time: challengeStart,
          timer_label: "Challenge starts in"
        };
      }
      return {
        key: "REGISTRATION_OPEN",
        text: "Registration Open",
        color: "bg-green-50 text-green-700 border-green-200",
        icon: FaCheckCircle,
        target_time: regEnd,
        timer_label: "Registration closes in"
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
        target_time: challengeEnd,
        timer_label: "Challenge ends in"
      };
    } else if (challengeEnd && now > challengeEnd) {
      return {
        key: "ENDED",
        text: "Ended",
        color: "bg-gray-100 text-gray-600 border-gray-200",
        icon: FaCheckCircle,
        target_time: null,
        timer_label: null
      };
    }
    return {
      key: "AVAILABLE",
      text: "Available",
      color: "bg-purple-50 text-purple-700 border-purple-200",
      icon: FaCheckCircle,
      target_time: null,
      timer_label: null
    };
  };

  // API returns filtered results; backend handles search. Display challenges as-is.
  const displayChallenges = Array.isArray(challenges) ? challenges : [];


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
    <main className="min-h-screen bg-gray-50 pt-20 sm:pt-24 pb-12 sm:pb-16 relative overflow-hidden">
      {/* Background Ambience */}
      <div className="absolute top-0 right-0 w-64 h-64 sm:w-96 sm:h-96 -mr-20 sm:-mr-40 -mt-20 sm:-mt-40 bg-orange-100 rounded-full blur-3xl pointer-events-none opacity-40 sm:opacity-50" aria-hidden />
      <div className="absolute bottom-0 left-0 w-64 h-64 sm:w-96 sm:h-96 -ml-20 sm:-ml-40 -mb-20 sm:-mb-40 bg-blue-100 rounded-full blur-3xl pointer-events-none opacity-40 sm:opacity-50" aria-hidden />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Top Section: Header + Search */}
        <motion.div
          className="mb-10 sm:mb-12 md:mb-14"
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between lg:gap-8">
            {/* Header */}
            <div className="mb-6 lg:mb-0 lg:flex-1">
              <span className="inline-block text-orange-600 font-semibold tracking-wider uppercase text-xs sm:text-sm mb-2">
                Arena
              </span>
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 leading-tight">
                Explore All{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-600 to-amber-600">
                  Challenges
                </span>
              </h1>
              <p className="mt-2 sm:mt-3 text-sm sm:text-base lg:text-lg text-gray-600 max-w-xl font-light">
                Push your limits with our curated coding competitions and win exciting rewards.
              </p>
            </div>

            {/* Search Bar */}
            <div className="w-full lg:max-w-md lg:shrink-0">
              <div className="relative">
                <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-base sm:text-lg shrink-0 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search challenges..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-11 sm:pl-12 pr-4 py-3 sm:py-3.5 bg-white border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 text-sm sm:text-base transition-all shadow-sm"
                />
              </div>
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
        ) : displayChallenges.length === 0 ? (
          <motion.div
            className="bg-white border border-gray-200 rounded-2xl p-12 sm:p-16 text-center max-w-2xl mx-auto shadow-sm"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            {searchQuery.trim() ? (
              <>
                <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <FaSearch className="text-gray-400 text-2xl sm:text-3xl" />
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-2">No challenges match your search</h3>
                <p className="text-gray-500 mb-6">
                  Try different keywords or clear the search to see all challenges.
                </p>
                <button
                  type="button"
                  onClick={handleClearSearch}
                  className="px-6 py-2.5 bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-xl transition-colors"
                >
                  Clear search
                </button>
              </>
            ) : (
              <>
                <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <FaClock className="text-gray-400 text-2xl sm:text-3xl" />
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-2">No Challenges Active</h3>
                <p className="text-gray-500">
                  Challenge timings will be announced soon. Stay tuned!
                </p>
              </>
            )}
          </motion.div>
        ) : (
          <motion.div
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            {displayChallenges.map((challenge) => {
              const status = getChallengeStatus(challenge);
              const StatusIcon = status.icon;

              return (
                <motion.div
                  key={challenge.id}
                  variants={cardVariants}
                  className="group relative bg-white border border-gray-200 rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1 hover:border-orange-200"
                >
                  <div className="p-6 flex flex-col h-full">
                    {/* Status badge + Countdown */}
                    <div className="flex flex-wrap items-center gap-2 mb-4">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold tracking-wide uppercase border ${status.color}`}>
                        <StatusIcon className="text-xs" />
                        {status.text}
                      </span>
                      {status.target_time && status.timer_label && (
                        <div className="text-xs font-medium text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                          <CountdownTimer targetDate={status.target_time} />
                        </div>
                      )}
                    </div>

                    {/* Title */}
                    <h3 className="text-xl font-bold text-gray-900 mb-3 group-hover:text-orange-600 transition-colors line-clamp-2">
                      {challenge.title}
                    </h3>

                    {/* Description */}
                    {challenge.description && (
                      <p className="text-gray-600 text-sm leading-relaxed mb-4 line-clamp-3 flex-1">
                        {challenge.description}
                      </p>
                    )}

                    {/* Dates */}
                    <div className="space-y-2 mb-6 text-sm text-gray-500">
                      {status.text === "Upcoming" ? (
                        <div className="flex items-center gap-2 text-blue-600">
                          <FaClock className="shrink-0" />
                          <span>Starts {formatDate(challenge.challenge_start_at)}</span>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center gap-2">
                            <FaCalendarAlt className="shrink-0 text-gray-400" />
                            <span>Reg: {formatDate(challenge.registration_start_at)} – {formatDate(challenge.registration_end_at)}</span>
                          </div>
                          {challenge.challenge_start_at && (
                            <div className="flex items-center gap-2">
                              <FaClock className="shrink-0 text-gray-400" />
                              <span>{formatDate(challenge.challenge_start_at)} – {formatDate(challenge.challenge_end_at)}</span>
                            </div>
                          )}
                        </>
                      )}
                    </div>

                    {/* Joiners pill (social proof only) */}
                    <div className="flex items-center gap-2 text-sm text-gray-500 mb-5">
                      <FaUsers className="text-orange-500" />
                      <span><span className="font-semibold text-gray-700">{getDisplayParticipantCount(challenge.registration_count)}</span> {getParticipantLabel(status.key)}</span>
                    </div>

                    {/* CTA */}
                    <div className="mt-auto">
                      {status.key === "ONGOING" && (
                        <Link
                          href={appendUtmToPath(`/challenges/interface?id=${challenge.id}`, utmQ)}
                          className="flex w-full px-4 py-3 bg-green-600 hover:bg-green-700 text-white text-center rounded-xl transition-all font-bold text-sm items-center justify-center gap-2"
                        >
                          Participate
                          <FaArrowRight className="text-xs" />
                        </Link>
                      )}

                      {status.key === "REGISTRATION_OPEN" && (
                        <Link
                          href={appendUtmToPath(challenge.slug ? `/challenges/register?slug=${challenge.slug}` : `/challenges/register?id=${challenge.id}`, utmQ)}
                          className="flex w-full px-4 py-3 bg-orange-600 hover:bg-orange-700 text-white text-center rounded-xl transition-all font-bold text-sm items-center justify-center gap-2 group/btn"
                        >
                          Register
                          <FaArrowRight className="w-3 group-hover/btn:translate-x-1 transition-transform" />
                        </Link>
                      )}

                      {status.key === "UPCOMING" && (
                        <div className="w-full px-4 py-3 bg-gray-100 text-gray-500 text-center rounded-xl font-bold text-sm cursor-not-allowed">
                          Coming Soon
                        </div>
                      )}

                      {status.key === "ENDED" && (
                        <div className="w-full px-4 py-3 bg-gray-100 text-gray-400 text-center rounded-xl font-medium text-sm cursor-not-allowed">
                          Ended
                        </div>
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
