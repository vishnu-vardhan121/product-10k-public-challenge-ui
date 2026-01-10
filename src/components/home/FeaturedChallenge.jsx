"use client";
import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import Link from "next/link";
import { fetchChallenges } from "@/redux/features/publicChallenge/publicChallengeSlice";
import {
    FaCalendarAlt,
    FaArrowRight,
    FaSpinner,
    FaClock,
    FaUsers,
    FaRocket,
    FaCheckCircle
} from "react-icons/fa";
import { motion } from "framer-motion";
import { useServerTime } from "@/hooks/useServerTime";

const FeaturedChallenge = () => {
    const dispatch = useDispatch();
    const { challenges, loading, error } = useSelector((state) => ({
        challenges: state.publicChallenge.challenges,
        loading: state.publicChallenge.loading.challenges,
        error: state.publicChallenge.error,
    }));
    const serverTime = useServerTime();

    useEffect(() => {
        dispatch(fetchChallenges());
    }, [dispatch]);

    const formatDate = (dateString) => {
        if (!dateString) return "N/A";
        const date = new Date(dateString);
        return date.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    // Logic to determine the "Featured" challenge
    // Priority: 1. Ongoing, 2. Registration Open, 3. Upcoming, 4. Ended (Active but ended)
    const getFeaturedChallenge = () => {
        if (!challenges || challenges.length === 0) return null;

        const now = serverTime || new Date(); // Fallback to local time if server time not ready

        // Helper to get status
        const getStatus = (c) => {
            const regStart = new Date(c.registration_start_at);
            const regEnd = new Date(c.registration_end_at);
            const start = c.challenge_start_at ? new Date(c.challenge_start_at) : null;
            const end = c.challenge_end_at ? new Date(c.challenge_end_at) : null;

            if (start && now >= start && end && now <= end) return 'ONGOING';

            // Fix: Check backend status for registration
            if (now >= regStart && now <= regEnd) {
                if (c.status === 'PUBLISHED') return 'UPCOMING';
                return 'REGISTRATION_OPEN';
            }

            if (now < regStart) return 'UPCOMING';
            return 'ENDED';
        };

        const classified = challenges.map(c => ({ ...c, derivedStatus: getStatus(c) }));

        const ongoing = classified.find(c => c.derivedStatus === 'ONGOING');
        if (ongoing) return ongoing;

        const regOpen = classified.find(c => c.derivedStatus === 'REGISTRATION_OPEN');
        if (regOpen) return regOpen;

        const upcoming = classified.find(c => c.derivedStatus === 'UPCOMING');
        if (upcoming) return upcoming;

        // Fallback: Just take the first one if it's public (or the most recent ended one if we want to show something)
        // For now, let's show the first public one found
        return classified.find(c => c.challenge_type === 'PUBLIC') || classified[0];
    };

    const featured = getFeaturedChallenge();

    if (loading) {
        return (
            <div className="py-20 bg-gray-900 text-white flex justify-center">
                <FaSpinner className="animate-spin text-3xl" />
            </div>
        );
    }

    if (!featured && !loading) return null; // Or show "Stay Tuned" component

    // Determine display properties based on status
    const isOngoing = featured.derivedStatus === 'ONGOING';
    const isRegOpen = featured.derivedStatus === 'REGISTRATION_OPEN';
    const isUpcoming = featured.derivedStatus === 'UPCOMING';

    let statusText = "Challenge Unavailable";
    let StatusIcon = FaClock;
    let statusColor = "text-gray-400";
    let badgeBg = "bg-gray-800";

    if (isOngoing) {
        statusText = "LIVE NOW";
        StatusIcon = FaRocket;
        statusColor = "text-green-400";
        badgeBg = "bg-green-900/30 border-green-500/50";
    } else if (isRegOpen) {
        statusText = "REGISTRATION OPEN";
        StatusIcon = FaCheckCircle;
        statusColor = "text-orange-400";
        badgeBg = "bg-orange-900/30 border-orange-500/50";
    } else if (isUpcoming) {
        statusText = "COMING SOON";
        StatusIcon = FaClock;
        statusColor = "text-blue-400";
        badgeBg = "bg-blue-900/30 border-blue-500/50";
    }

    return (
        <section className="relative py-20 bg-gray-900 overflow-hidden">
            {/* Background Effects */}
            <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10"></div>
            <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 bg-orange-600/20 rounded-full blur-3xl"></div>
            <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-96 h-96 bg-red-600/10 rounded-full blur-3xl"></div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                <motion.div
                    className="bg-gray-800/50 backdrop-blur-xl border border-gray-700/50 rounded-3xl overflow-hidden shadow-2xl"
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6 }}
                >
                    <div className="flex flex-col lg:flex-row">
                        {/* Left Content */}
                        <div className="flex-1 p-6 md:p-12 lg:p-16 flex flex-col justify-center">
                            <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border w-fit mb-6 ${badgeBg}`}>
                                <StatusIcon className={`${statusColor} animate-pulse`} />
                                <span className={`text-sm font-bold tracking-wider ${statusColor}`}>{statusText}</span>
                            </div>

                            <h2 className="text-3xl md:text-5xl font-bold text-white mb-6 leading-tight">
                                {featured.title}
                            </h2>

                            <p className="text-lg text-gray-300 mb-8 max-w-xl leading-relaxed">
                                {featured.description || "Join the elite coding challenge. Prove your skills, complete milestones, and earn your place among the top developers."}
                            </p>

                            <div className="flex flex-wrap gap-6 mb-10 text-gray-400 text-sm font-medium">
                                <div className="flex items-center gap-2 bg-gray-900/50 px-4 py-2 rounded-lg">
                                    <FaCalendarAlt className="text-orange-500" />
                                    <span>{isRegOpen || isUpcoming ? 'Registration Ends:' : 'Challenge Ends:'} <span className="text-white ml-1">{formatDate(isRegOpen ? featured.registration_end_at : featured.challenge_end_at)}</span></span>
                                </div>
                                <div className="flex items-center gap-2 bg-gray-900/50 px-4 py-2 rounded-lg">
                                    <FaUsers className="text-blue-500" />
                                    <span><span className="text-white mr-1">{featured.registration_count || 0}</span> Registered</span>
                                </div>
                            </div>

                            <div className="flex flex-col sm:flex-row gap-4">
                                {isOngoing && (
                                    <Link
                                        href={`/challenges/interface?id=${featured.id}`}
                                        className="inline-flex items-center justify-center px-8 py-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-bold rounded-xl hover:shadow-lg hover:shadow-green-500/20 transition-all transform hover:-translate-y-1 w-full sm:w-auto"
                                    >
                                        Enter Active Challenge
                                        <FaArrowRight className="ml-2" />
                                    </Link>
                                )}

                                {isRegOpen && (
                                    <Link
                                        href={featured.slug ? `/challenges/register?slug=${featured.slug}` : `/challenges/register?id=${featured.id}`}
                                        className="inline-flex items-center justify-center px-8 py-4 bg-gradient-to-r from-orange-600 to-red-600 text-white font-bold rounded-xl hover:shadow-lg hover:shadow-orange-500/20 transition-all transform hover:-translate-y-1 w-full sm:w-auto"
                                    >
                                        Register Now
                                        <FaArrowRight className="ml-2" />
                                    </Link>
                                )}

                                {isUpcoming && (
                                    <button disabled className="inline-flex items-center justify-center px-8 py-4 bg-gray-700 text-gray-400 font-bold rounded-xl cursor-not-allowed w-full sm:w-auto border border-gray-600">
                                        Coming Soon
                                        <FaClock className="ml-2" />
                                    </button>
                                )}

                                {/* Optional Secondary Action */}
                                {/* <button className="px-8 py-4 bg-white/5 border border-white/10 text-white font-semibold rounded-xl hover:bg-white/10 transition-colors">
                                View Details
                            </button> */}
                            </div>
                        </div>

                        {/* Right Visual (Dynamic or Static) */}
                        <div className="lg:w-2/5 relative bg-gray-900 overflow-hidden min-h-[300px] lg:min-h-full">
                            {/* Abstract Code/Tech visual */}
                            <div className="absolute inset-0 bg-gradient-to-br from-orange-600/20 to-purple-600/20 z-0"></div>
                            <img
                                src="/coding/DSC_5835.webp" // specific active challenge image
                                alt="Challenge Visual"
                                className="absolute inset-0 w-full h-full object-cover opacity-60 mix-blend-overlay hover:scale-105 transition-transform duration-1000"
                            />
                            <div className="absolute inset-0 bg-gradient-to-l from-transparent to-gray-800/90 lg:to-gray-800"></div> {/* Mask to blend with left card */}
                        </div>
                    </div>
                </motion.div>
            </div>
        </section>
    );
};

export default FeaturedChallenge;
