"use client";
import React from "react";
import Link from "next/link";
import { FaArrowRight } from "react-icons/fa";

const CTASection = () => {
  return (
    <section className="py-16 md:py-24 bg-gray-900 text-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="text-3xl md:text-4xl font-bold mb-4">
          Ready to Start?
        </h2>
        <p className="text-xl text-gray-300 mb-8">
          Join our coding challenges today and take your programming skills to the next level
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="#challenges"
            className="bg-orange-600 text-white px-8 py-4 rounded-lg font-semibold text-lg hover:bg-orange-700 transition-colors flex items-center justify-center gap-2"
          >
            View All Challenges
            <FaArrowRight />
          </Link>
          <Link
            href="/settings"
            className="bg-transparent border-2 border-white text-white px-8 py-4 rounded-lg font-semibold text-lg hover:bg-white hover:text-gray-900 transition-colors"
          >
            Settings
          </Link>
        </div>
      </div>
    </section>
  );
};

export default CTASection;

