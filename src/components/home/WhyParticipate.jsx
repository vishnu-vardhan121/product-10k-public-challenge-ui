"use client";
import React from "react";
import { FaLaptopCode, FaTrophy, FaBriefcase, FaUsers } from "react-icons/fa";

const WhyParticipate = () => {
  const benefits = [
    {
      icon: <FaLaptopCode />,
      title: "Skill Development",
      description: "Practice coding skills, learn new concepts, and improve your problem-solving abilities through real-world challenges"
    },
    {
      icon: <FaTrophy />,
      title: "Competition & Recognition",
      description: "Compete with developers worldwide, climb the leaderboard, and earn certificates that showcase your achievements"
    },
    {
      icon: <FaBriefcase />,
      title: "Career Growth",
      description: "Build your portfolio, showcase your skills to potential employers, and get noticed in the tech industry"
    },
    {
      icon: <FaUsers />,
      title: "Community",
      description: "Join a vibrant coding community, network with peers, and learn from other talented developers"
    }
  ];

  return (
    <section className="py-16 md:py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Why Participate?
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Discover the benefits of joining our coding challenges
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {benefits.map((benefit, index) => (
            <div key={index} className="bg-gray-50 p-6 rounded-lg hover:shadow-lg transition-shadow border border-gray-200">
              <div className="text-gray-700 text-4xl mb-4">{benefit.icon}</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">{benefit.title}</h3>
              <p className="text-gray-600 leading-relaxed">{benefit.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default WhyParticipate;

