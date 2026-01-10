"use client";
import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import Link from "next/link";
import { fetchChallenges } from "@/redux/features/publicChallenge/publicChallengeSlice";
import {
  FaCalendarAlt,
  FaQuestionCircle,
  FaCode,
  FaArrowRight,
  FaSpinner,
  FaClock,
  FaUsers,
  FaCheckCircle,
} from "react-icons/fa";
import { motion } from "framer-motion";
import { useServerTime } from "@/hooks/useServerTime";

const ActiveChallenges = () => {
  const dispatch = useDispatch();
  const { challenges, loading, error } = useSelector((state) => ({
    challenges: state.publicChallenge.challenges,
    loading: state.publicChallenge.loading.challenges,
    error: state.publicChallenge.error,
  }));

  useEffect(() => {
    dispatch(fetchChallenges());
  }, [dispatch]);

  const handleRetry = () => {
    dispatch(fetchChallenges());
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  /* Use server synced time */
  const serverTime = useServerTime();

  const getChallengeStatus = (challenge) => {
    const now = serverTime;
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
        text: "Upcoming",
        color: "bg-blue-100 text-blue-800",
        icon: FaClock,
      };
    } else if (now >= regStart && now <= regEnd) {
      return {
        text: "Registration Open",
        color: "bg-green-100 text-green-800",
        icon: FaCheckCircle,
      };
    } else if (
      challengeStart &&
      now >= challengeStart &&
      challengeEnd &&
      now <= challengeEnd
    ) {
      return {
        text: "Ongoing",
        color: "bg-orange-100 text-orange-800",
        icon: FaClock,
      };
    } else if (challengeEnd && now > challengeEnd) {
      return {
        text: "Ended",
        color: "bg-gray-100 text-gray-800",
        icon: FaCheckCircle,
      };
    }
    return {
      text: "Available",
      color: "bg-purple-100 text-purple-800",
      icon: FaCheckCircle,
    };
  };

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
        duration: 0.5,
      },
    },
  };

  return (
    <section id="challenges" className="py-16 md:py-24 bg-gradient-to-b from-gray-50 to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          className="text-center mb-12"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
            <span className="bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
              Active Challenges
            </span>
          </h2>
          <p className="text-lg md:text-xl text-gray-600 max-w-2xl mx-auto">
            Join ongoing challenges or register for upcoming ones
          </p>
        </motion.div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <FaSpinner className="animate-spin text-5xl text-orange-600 mx-auto mb-4" />
              <p className="text-gray-600 text-lg">Loading challenges...</p>
            </div>
          </div>
        ) : error ? (
          <motion.div
            className="bg-red-50 border border-red-200 rounded-xl p-8 text-center"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <p className="text-red-800 font-medium text-lg mb-4">{error}</p>
            <button
              onClick={handleRetry}
              className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-semibold"
            >
              Try Again
            </button>
          </motion.div>
        ) : challenges.length === 0 ? (
          <motion.div
            className="bg-white rounded-xl shadow-lg p-12 text-center border border-gray-200"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <p className="text-gray-600 text-lg">
              No challenges available at the moment. Check back soon!
            </p>
          </motion.div>
        ) : (
          <motion.div
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8"
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
          >
            {challenges.map((challenge, index) => {
              const status = getChallengeStatus(challenge);
              const StatusIcon = status.icon;

              return (
                <motion.div
                  key={challenge.id}
                  variants={cardVariants}
                  whileHover={{ y: -8, scale: 1.02 }}
                  className="group relative"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-orange-600 to-red-600 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity blur-xl"></div>
                  <div className="relative bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all border border-gray-200 overflow-hidden h-full">
                    {/* Status Badge */}
                    <div className="absolute top-4 right-4 z-10">
                      <span
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold ${status.color} shadow-sm`}
                      >
                        <StatusIcon className="text-sm" />
                        {status.text}
                      </span>
                    </div>

                    {/* Gradient Header */}
                    <div className="h-2 bg-gradient-to-r from-orange-500 via-red-500 to-orange-600"></div>

                    <div className="p-6">
                      <h3 className="text-xl font-bold text-gray-900 mb-3 pr-24 leading-tight group-hover:text-orange-600 transition-colors">
                        {challenge.title}
                      </h3>

                      {challenge.description && (
                        <p className="text-gray-600 text-sm mb-4 line-clamp-2 leading-relaxed">
                          {challenge.description}
                        </p>
                      )}

                      {/* Stats Grid */}
                      <div className="grid grid-cols-3 gap-3 mb-4">
                        <div className="bg-orange-50 rounded-lg p-3 text-center">
                          <FaQuestionCircle className="text-orange-600 mx-auto mb-1 text-lg" />
                          <div className="text-lg font-bold text-gray-900">
                            {challenge.mcq_questions_count || 0}
                          </div>
                          <div className="text-xs text-gray-600">MCQs</div>
                        </div>
                        <div className="bg-orange-50 rounded-lg p-3 text-center">
                          <FaCode className="text-orange-600 mx-auto mb-1 text-lg" />
                          <div className="text-lg font-bold text-gray-900">
                            {challenge.problems_count || 0}
                          </div>
                          <div className="text-xs text-gray-600">Coding</div>
                        </div>
                        <div className="bg-orange-50 rounded-lg p-3 text-center">
                          <FaUsers className="text-orange-600 mx-auto mb-1 text-lg" />
                          <div className="text-lg font-bold text-gray-900">
                            {challenge.registration_count || 0}
                          </div>
                          <div className="text-xs text-gray-600">Joined</div>
                        </div>
                      </div>

                      {/* Date Info */}
                      <div className="space-y-2 text-xs text-gray-600 mb-5 bg-gray-50 rounded-lg p-3">
                        <div className="flex items-center gap-2">
                          <FaCalendarAlt className="text-gray-400 flex-shrink-0" />
                          <span className="truncate">
                            Reg: {formatDate(challenge.registration_start_at)} -{" "}
                            {formatDate(challenge.registration_end_at)}
                          </span>
                        </div>
                        {challenge.challenge_start_at && (
                          <div className="flex items-center gap-2">
                            <FaClock className="text-gray-400 flex-shrink-0" />
                            <span className="truncate">
                              {formatDate(challenge.challenge_start_at)} -{" "}
                              {formatDate(challenge.challenge_end_at)}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Action Buttons */}
                      <div className="flex gap-2">
                        {status.text === "Ongoing" && (
                          <Link
                            href={`/challenges/interface?id=${challenge.id}`}
                            className="flex-1 px-4 py-3 bg-gray-900 text-white text-center rounded-lg hover:bg-gray-800 transition-all font-semibold text-sm flex items-center justify-center gap-2 group/btn"
                          >
                            Participate
                            <FaArrowRight className="text-xs group-hover/btn:translate-x-1 transition-transform" />
                          </Link>
                        )}
                        {status.text === "Registration Open" &&
                          (challenge.challenge_type === "PUBLIC" ||
                            challenge.challenge_type === "COLLEGE_STUDENTS") &&
                          !challenge.is_registered && (
                            <Link
                              href={`/challenges/register?id=${challenge.id}`}
                              className="flex-1 px-4 py-3 bg-gradient-to-r from-orange-600 to-red-600 text-white text-center rounded-lg hover:from-orange-700 hover:to-red-700 transition-all font-semibold text-sm shadow-md hover:shadow-lg"
                            >
                              Register
                            </Link>
                          )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </div>
    </section>
  );
};

export default ActiveChallenges;
