"use client";
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaTimes, FaUser, FaPhone, FaEnvelope, FaUniversity, FaGraduationCap, FaSpinner } from 'react-icons/fa';

const InputField = ({ icon: Icon, label, ...props }) => (
    <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
        <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Icon className="text-gray-400" />
            </div>
            <input
                className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all outline-none text-gray-900 placeholder-gray-400 bg-white"
                {...props}
            />
        </div>
    </div>
);

const RegistrationModal = ({ isOpen, onClose, onSubmit, loading, challengeTitle }) => {
    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        email: '',
        college_name: '',
        qualification: '',
        year_of_passing: ''
    });

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSubmit(formData);
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                />

                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]"
                >
                    {/* Header */}
                    <div className="bg-gradient-to-r from-orange-600 to-red-600 p-6 text-white text-center shrink-0">
                        <button
                            onClick={onClose}
                            className="absolute top-4 right-4 text-white/80 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-full"
                        >
                            <FaTimes />
                        </button>
                        <h3 className="text-2xl font-bold mb-2">Join Challenge</h3>
                        <p className="text-white/90 text-sm px-4">
                            {challengeTitle ? `Register for "${challengeTitle}"` : "Enter your details to start"}
                        </p>
                    </div>

                    {/* Form */}
                    <div className="p-6 overflow-y-auto custom-scrollbar">
                        <form onSubmit={handleSubmit} className="space-y-2">
                            <div className="grid grid-cols-1 gap-1">
                                <InputField
                                    icon={FaUser}
                                    label="Full Name"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleChange}
                                    placeholder="Enter your full name"
                                    required
                                />

                                <InputField
                                    icon={FaPhone}
                                    label="Phone Number"
                                    name="phone"
                                    value={formData.phone}
                                    onChange={handleChange}
                                    placeholder="Enter 10-digit number"
                                    pattern="[0-9]{10}"
                                    maxLength="10"
                                    required
                                />

                                <InputField
                                    icon={FaEnvelope}
                                    label="Email (Optional)"
                                    name="email"
                                    type="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    placeholder="Enter your email"
                                />

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <InputField
                                        icon={FaUniversity}
                                        label="College Name (Optional)"
                                        name="college_name"
                                        value={formData.college_name}
                                        onChange={handleChange}
                                        placeholder="College/University"
                                    />

                                    <InputField
                                        icon={FaGraduationCap}
                                        label="Qualification (Optional)"
                                        name="qualification"
                                        value={formData.qualification}
                                        onChange={handleChange}
                                        placeholder="B.Tech, MCA, etc."
                                    />
                                </div>
                            </div>

                            <div className="pt-4">
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full bg-gradient-to-r from-orange-600 to-red-600 text-white font-bold py-3.5 px-6 rounded-xl shadow-lg hover:shadow-xl hover:from-orange-700 hover:to-red-700 transition-all transform hover:-translate-y-0.5 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-3"
                                >
                                    {loading ? (
                                        <>
                                            <FaSpinner className="animate-spin text-xl" />
                                            <span>Registering...</span>
                                        </>
                                    ) : (
                                        <span>Start Challenge Now</span>
                                    )}
                                </button>
                                <p className="text-xs text-gray-500 text-center mt-3">
                                    By registering, you agree to our Terms and Conditions.
                                </p>
                            </div>
                        </form>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default RegistrationModal;
