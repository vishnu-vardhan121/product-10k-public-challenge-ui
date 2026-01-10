"use client";
import React from "react";
import { FaQuestionCircle, FaCode, FaTrophy, FaChartLine, FaUserCheck, FaKey, FaClock, FaCheckCircle } from "react-icons/fa";

const AboutChallenge = () => {
  const features = [
    {
      icon: <FaQuestionCircle />,
      title: "MCQ Questions",
      description: "Test your theoretical knowledge with multiple-choice and fill-in-the-blank questions"
    },
    {
      icon: <FaCode />,
      title: "Coding Problems",
      description: "Solve real-world coding challenges with our online code editor and compiler"
    },
    {
      icon: <FaChartLine />,
      title: "Real-time Leaderboard",
      description: "Compete with others and see your ranking update in real-time"
    },
    {
      icon: <FaTrophy />,
      title: "Results & Certificates",
      description: "Get detailed results and earn certificates upon completion"
    }
  ];

  const steps = [
    {
      number: "1",
      title: "Register for Challenge",
      description: "Sign up with your details and get your unique access code",
      icon: <FaUserCheck />
    },
    {
      number: "2",
      title: "Get Access Code",
      description: "Receive your access code (for public challenges) or use provided password",
      icon: <FaKey />
    },
    {
      number: "3",
      title: "Take Challenge",
      description: "Answer MCQ questions and solve coding problems within the time limit",
      icon: <FaClock />
    },
    {
      number: "4",
      title: "View Results",
      description: "Check your score, rank on leaderboard, and download your certificate",
      icon: <FaCheckCircle />
    }
  ];


  return (
    <section className="py-16 md:py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* What are Public Challenges */}
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            About This Coding Challenge
          </h2>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            Test your coding skills, solve real-world problems, and compete with developers worldwide. Participate in challenges that include coding problems and MCQ questions to improve your programming abilities.
          </p>
        </div>

        {/* Challenge Features */}
        <div className="mb-16">
          <h3 className="text-2xl font-bold text-gray-900 mb-8 text-center">Challenge Features</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <div key={index} className="bg-gray-50 p-6 rounded-lg hover:shadow-lg transition-shadow">
                <div className="text-gray-700 text-3xl mb-4">{feature.icon}</div>
                <h4 className="text-lg font-semibold text-gray-900 mb-2">{feature.title}</h4>
                <p className="text-gray-600 text-sm">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* How It Works */}
        <div className="mb-16">
          <h3 className="text-2xl font-bold text-gray-900 mb-8 text-center">How It Works</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {steps.map((step, index) => (
              <div key={index} className="relative">
                <div className="bg-white border-2 border-gray-200 p-6 rounded-lg hover:border-gray-400 transition-colors">
                  <div className="flex items-start mb-4">
                    <div className="bg-gray-700 text-white rounded-full w-10 h-10 flex items-center justify-center font-bold text-lg mr-4 flex-shrink-0">
                      {step.number}
                    </div>
                    <div className="text-gray-700 text-2xl">{step.icon}</div>
                  </div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-2">{step.title}</h4>
                  <p className="text-gray-600 text-sm">{step.description}</p>
                </div>
                {index < steps.length - 1 && (
                  <div className="hidden lg:block absolute top-1/2 -right-3 transform -translate-y-1/2 text-orange-400 text-2xl">
                    →
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

      </div>
    </section>
  );
};

export default AboutChallenge;

