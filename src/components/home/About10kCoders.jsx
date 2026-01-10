"use client";
import React from "react";
import { FaGraduationCap, FaAward, FaRocket } from "react-icons/fa";

const About10kCoders = () => {
  return (
    <section id="about" className="py-16 md:py-24 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            About 10kCoders
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Empowering aspiring developers to achieve their dreams through quality education and real-world experience
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* What is 10kCoders */}
          <div className="bg-white p-8 rounded-lg shadow-md hover:shadow-xl transition-shadow">
            <div className="flex items-center mb-4">
              <div className="bg-gray-100 p-3 rounded-lg mr-4">
                <FaGraduationCap className="text-gray-700 text-2xl" />
              </div>
              <h3 className="text-xl font-bold text-gray-900">What is 10000Coders?</h3>
            </div>
            <p className="text-gray-600 leading-relaxed">
              10000Coders is a leading coding bootcamp dedicated to transforming careers through comprehensive full-stack development training. We provide hands-on learning experiences that prepare students for real-world challenges.
            </p>
          </div>

          {/* Why 10kCoders */}
          <div className="bg-white p-8 rounded-lg shadow-md hover:shadow-xl transition-shadow">
            <div className="flex items-center mb-4">
              <div className="bg-gray-100 p-3 rounded-lg mr-4">
                <FaAward className="text-gray-700 text-2xl" />
              </div>
              <h3 className="text-xl font-bold text-gray-900">Why 10000Coders?</h3>
            </div>
            <p className="text-gray-600 leading-relaxed">
              With thousands of successful placements and a proven track record, we offer industry-relevant curriculum, expert mentors, and placement support that helps students land their dream jobs in tech.
            </p>
          </div>

          {/* Our Mission */}
          <div className="bg-white p-8 rounded-lg shadow-md hover:shadow-xl transition-shadow">
            <div className="flex items-center mb-4">
              <div className="bg-gray-100 p-3 rounded-lg mr-4">
                <FaRocket className="text-gray-700 text-2xl" />
              </div>
              <h3 className="text-xl font-bold text-gray-900">Our Mission</h3>
            </div>
            <p className="text-gray-600 leading-relaxed">
              To bridge the gap between education and employment by providing world-class coding education that empowers individuals to build successful careers in technology.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default About10kCoders;

