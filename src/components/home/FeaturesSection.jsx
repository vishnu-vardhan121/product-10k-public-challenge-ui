"use client";
import React from 'react';
import { motion } from 'framer-motion';
import { FaCode, FaCheckDouble, FaTrophy } from 'react-icons/fa';

const features = [
    {
        title: "Master Algorithms",
        description: "Dive deep into complex coding problems designed to test your logic and efficiency. Solve real-world scenarios and optimize your solutions.",
        icon: FaCode,
        image: "/coding/971.jpg",
        color: "from-blue-600 to-indigo-600",
        reverse: false
    },
    {
        title: "Test Your Knowledge",
        description: "Challenge yourself with curated Multiple Choice Questions (MCQs) covering a wide range of topics from Data Structures to System Design.",
        icon: FaCheckDouble,
        image: "/coding/MCQs.webp",
        color: "from-orange-500 to-red-500",
        reverse: true
    },
    {
        title: "Earn Recognition",
        description: "Top performers earn exclusive certificates and rewards. Build your portfolio and showcase your achievements to the world.",
        icon: FaTrophy,
        image: "/coding/person-front.jpg",
        color: "from-amber-400 to-orange-500",
        reverse: false
    }
];

const FeaturesSection = () => {
    return (
        <section className="py-16 md:py-24 bg-white overflow-hidden">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <motion.div
                    className="text-center mb-20"
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6 }}
                >
                    <span className="text-orange-600 font-semibold tracking-wide uppercase text-sm">Why Join Us?</span>
                    <h2 className="mt-3 text-4xl md:text-5xl font-bold text-gray-900 leading-tight">
                        More Than Just a <span className="bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">Coding Platform</span>
                    </h2>
                    <p className="mt-4 text-xl text-gray-600 max-w-2xl mx-auto">
                        Experience a complete ecosystem designed to elevate your programming career.
                    </p>
                </motion.div>

                <div className="space-y-16 md:space-y-32">
                    {features.map((feature, index) => (
                        <div
                            key={index}
                            className={`flex flex-col md:flex-row items-center gap-12 lg:gap-20 ${feature.reverse ? 'md:flex-row-reverse' : ''}`}
                        >
                            {/* Image Side */}
                            <motion.div
                                className="flex-1 w-full"
                                initial={{ opacity: 0, x: feature.reverse ? 50 : -50 }}
                                whileInView={{ opacity: 1, x: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.8 }}
                            >
                                <div className="relative group">
                                    <div className={`absolute -inset-4 bg-gradient-to-r ${feature.color} rounded-2xl opacity-20 blur-xl group-hover:opacity-40 transition-opacity duration-500`}></div>
                                    <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-gray-100 aspect-[4/3]">
                                        <img
                                            src={feature.image}
                                            alt={feature.title}
                                            className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-700"
                                        />
                                        {/* Overlay gradient */}
                                        <div className="absolute inset-0 bg-gradient-to-t from-gray-900/60 to-transparent"></div>
                                    </div>

                                    {/* Floating Icon Badge */}
                                    <div className={`absolute -bottom-6 ${feature.reverse ? '-left-6' : '-right-6'} w-20 h-20 bg-white rounded-2xl shadow-xl flex items-center justify-center border border-gray-100 z-10`}>
                                        <feature.icon className={`text-4xl bg-gradient-to-br ${feature.color} bg-clip-text text-transparent`} />
                                    </div>
                                </div>
                            </motion.div>

                            {/* Text Side */}
                            <motion.div
                                className="flex-1"
                                initial={{ opacity: 0, x: feature.reverse ? -50 : 50 }}
                                whileInView={{ opacity: 1, x: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.8, delay: 0.2 }}
                            >
                                <h3 className="text-3xl font-bold text-gray-900 mb-6 flex items-center gap-3">
                                    {feature.title}
                                </h3>
                                <p className="text-lg text-gray-600 leading-relaxed mb-8">
                                    {feature.description}
                                </p>
                                <div className="h-1 w-20 bg-gradient-to-r from-orange-500 to-amber-500 rounded-full"></div>
                            </motion.div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default FeaturesSection;
