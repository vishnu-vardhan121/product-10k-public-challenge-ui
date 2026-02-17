"use client";
import React from "react";
import Link from "next/link";
import { FaCode, FaListUl, FaTrophy, FaArrowRight, FaRocket } from "react-icons/fa";
import { motion } from "framer-motion";

const HeroSection = () => {
  return (
    <section className="relative min-h-svh flex items-center justify-center overflow-hidden bg-gray-900">
      {/* Background image – visible with lighter overlay */}
      <div className="absolute inset-0 z-0">
        <img
          src="/coding/representation-user-experience-interface-design.webp"
          alt=""
          className="w-full h-full object-cover object-center opacity-70 sm:opacity-75"
        />
        <div
          className="absolute inset-0 bg-gray-900/50 sm:bg-gray-900/45"
          aria-hidden
        />
        <div
          className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/40 to-transparent"
          aria-hidden
        />
      </div>

      <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-20 md:py-24 lg:py-32">
        <div className="text-center">
          {/* Headline */}
          <motion.h1
            className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold text-white mb-5 sm:mb-6 leading-[1.2] tracking-tight"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            Test your skills in{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-amber-500">
              live coding challenges
            </span>
          </motion.h1>

          {/* Subtitle – what you get */}
          <motion.p
            className="text-base sm:text-lg md:text-xl text-gray-200 max-w-2xl mx-auto mb-8 sm:mb-10 leading-relaxed"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.25 }}
          >
            Solve real coding problems, answer MCQs, and compete on the leaderboard. Brought to you by 10000Coders — free and open to all.
          </motion.p>

          {/* Benefit pills */}
          <motion.div
            className="flex flex-wrap justify-center gap-3 sm:gap-4 mb-10 sm:mb-12"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <span className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 text-white px-4 py-2 rounded-full text-sm font-medium">
              <FaCode className="text-orange-400" aria-hidden /> Coding problems
            </span>
            <span className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 text-white px-4 py-2 rounded-full text-sm font-medium">
              <FaListUl className="text-orange-400" aria-hidden /> MCQs
            </span>
            <span className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 text-white px-4 py-2 rounded-full text-sm font-medium">
              <FaTrophy className="text-orange-400" aria-hidden /> Leaderboard & rewards
            </span>
          </motion.div>

          {/* CTAs */}
          <motion.div
            className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-center"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
          >
            <Link
              href="/challenges"
              className="group w-full sm:w-auto min-h-[48px] sm:min-h-[52px] inline-flex items-center justify-center bg-gradient-to-r from-orange-600 to-red-600 text-white px-6 sm:px-8 py-3.5 sm:py-4 rounded-xl font-bold text-base sm:text-lg shadow-lg shadow-orange-500/30 hover:shadow-orange-500/50 transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0"
            >
              <FaRocket className="mr-2 shrink-0 group-hover:animate-pulse" aria-hidden />
              Browse challenges
            </Link>
            <Link
              href="#features"
              className="w-full sm:w-auto min-h-[48px] sm:min-h-[52px] inline-flex items-center justify-center bg-white/15 backdrop-blur-md border border-white/25 text-white px-6 sm:px-8 py-3.5 sm:py-4 rounded-xl font-bold text-base sm:text-lg hover:bg-white/25 transition-all duration-200"
            >
              How it works
              <FaArrowRight className="ml-2 shrink-0" aria-hidden />
            </Link>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
