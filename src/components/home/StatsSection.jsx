"use client";
import React from "react";
import { FaUsers, FaTrophy, FaCode, FaCheckCircle } from "react-icons/fa";

const StatsSection = () => {
  const stats = [
    {
      icon: <FaUsers />,
      number: "10K+",
      label: "Active Participants",
      color: "text-blue-600"
    },
    {
      icon: <FaTrophy />,
      number: "100+",
      label: "Challenges Completed",
      color: "text-orange-600"
    },
    {
      icon: <FaCode />,
      number: "50K+",
      label: "Code Submissions",
      color: "text-green-600"
    },
    {
      icon: <FaCheckCircle />,
      number: "95%",
      label: "Success Rate",
      color: "text-purple-600"
    }
  ];

  return (
    <section className="py-16 md:py-24 bg-gradient-to-br from-orange-500 to-orange-600 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Our Impact
          </h2>
          <p className="text-xl text-orange-100 max-w-2xl mx-auto">
            Join thousands of developers who are improving their skills through our challenges
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map((stat, index) => (
            <div key={index} className="text-center">
              <div className={`text-5xl mb-4 flex justify-center ${stat.color}`}>
                {stat.icon}
              </div>
              <div className="text-4xl md:text-5xl font-bold mb-2">{stat.number}</div>
              <div className="text-orange-100 text-sm md:text-base">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default StatsSection;

