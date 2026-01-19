"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { FaTrophy, FaUsers, FaCode, FaArrowRight, FaRocket, FaMedal } from "react-icons/fa";
import { motion } from "framer-motion";
import CountUp from "react-countup";

const HeroSection = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gray-900">
      {/* Immersive Background */}
      <div className="absolute inset-0 z-0">
        <img
          src="/coding/representation-user-experience-interface-design.webp"
          alt="Coding World Background"
          className="w-full h-full object-cover opacity-40"
        />
        <div className="absolute inset-0 bg-gradient-to-bx from-gray-900/90 via-gray-900/80 to-gray-900"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-transparent to-gray-900/50"></div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-32">
        <div className="text-center">
          {/* Main Heading */}
          <motion.h1
            className="text-4xl md:text-6xl lg:text-7xl font-bold text-white mb-6 leading-tight tracking-tight"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            Code Your Future with{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-amber-500">
              10000Coders
            </span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            className="text-base md:text-xl text-gray-300 max-w-3xl mx-auto mb-10 leading-relaxed font-light"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
          >
            Join the ultimate platform for aspiring developers. Master <span className="text-white font-medium">Coding Problems</span>,
            ace <span className="text-white font-medium">MCQs</span>, and earn <span className="text-white font-medium">Premium Rewards</span> through real-time challenges.
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            className="flex flex-col sm:flex-row gap-4 justify-center mb-12 md:mb-20"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
          >
            <Link
              href="#challenges"
              className="group inline-flex items-center justify-center bg-gradient-to-r from-orange-600 to-red-600 text-white px-8 py-4 rounded-xl font-bold text-lg hover:shadow-lg hover:shadow-orange-500/40 transition-all transform hover:-translate-y-1"
            >
              <FaRocket className="mr-2 group-hover:animate-pulse" />
              Explore Challenges
            </Link>
            <Link
              href="#active-challenges"
              className="inline-flex items-center justify-center bg-white/10 backdrop-blur-md border border-white/20 text-white px-8 py-4 rounded-xl font-bold text-lg hover:bg-white/20 transition-all"
            >
              Start Coding
              <FaArrowRight className="ml-2" />
            </Link>
          </motion.div>

          <motion.div
            className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-5xl mx-auto"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.8 }}
          >
            {[
              { icon: FaTrophy, end: 100, label: "Daily Challenges", suffix: "+" },
              { icon: FaUsers, end: 10, label: "Active Coders", suffix: "K+" },
              { icon: FaMedal, end: 500, label: "Rewards Won", suffix: "+" },
            ].map((stat, index) => (
              <div
                key={index}
                className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-colors group"
              >
                <div className="text-4xl font-bold text-white mb-1">
                  {isVisible && (
                    <CountUp end={stat.end} duration={2.5} suffix={stat.suffix} />
                  )}
                </div>
                <div className="text-gray-400 font-medium tracking-wide uppercase text-sm">{stat.label}</div>
              </div>
            ))}
          </motion.div>
        </div>
      </div>

      {/* Scroll Indicator */}
      <motion.div
        className="absolute bottom-8 left-1/2 transform -translate-x-1/2 cursor-pointer"
        animate={{ y: [0, 10, 0] }}
        transition={{ duration: 1.5, repeat: Infinity }}
      >
        <div className="w-6 h-10 rounded-full border-2 border-white/30 flex items-start justify-center p-2 bg-black/20 backdrop-blur-sm">
          <div className="w-1.5 h-1.5 bg-white rounded-full animate-bounce" />
        </div>
      </motion.div>
    </section>
  );
};

export default HeroSection;
