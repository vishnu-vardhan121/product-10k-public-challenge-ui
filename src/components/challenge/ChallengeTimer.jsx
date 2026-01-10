"use client";
import React, { useState, useEffect } from "react";
import { FaClock } from "react-icons/fa";

export default function ChallengeTimer({ timeLeft }) {
  // Simple display component - parent handles the ticking logic via timeLeft prop
  const displayTime = timeLeft;

  const formatTime = (value) => String(Math.max(0, value)).padStart(2, "0");
  const isUrgent = displayTime.hours === 0 && displayTime.minutes < 5;

  return (
    <div
      className={`flex items-center gap-3 px-4 py-2 rounded-lg border ${isUrgent
          ? "bg-red-50 border-red-200 text-red-700"
          : "bg-orange-50 border-orange-200 text-orange-700"
        }`}
    >
      <FaClock className="text-lg" />
      <span className="font-mono font-bold text-lg">
        {formatTime(displayTime.hours)}:{formatTime(displayTime.minutes)}:
        {formatTime(displayTime.seconds)}
      </span>
      <span className="text-sm font-medium">Time Remaining</span>
    </div>
  );
}

