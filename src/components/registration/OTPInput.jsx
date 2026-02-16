"use client";
import React, { useRef, useEffect, useState } from "react";

const OTPInput = ({ value, onChange, onComplete, disabled = false, error = null, onClearError = null }) => {
  const [otp, setOtp] = useState(Array(6).fill(""));
  const inputRefs = useRef([]);

  useEffect(() => {
    // Initialize with value if provided
    if (value && value.length === 6) {
      setOtp(value.split(""));
    } else if (!value) {
      setOtp(Array(6).fill(""));
    }
  }, [value]);

  const handleChange = (index, newValue) => {
    // Only allow digits
    if (newValue && !/^\d$/.test(newValue)) {
      return;
    }

    // Clear error when user starts typing
    if (error && onClearError) {
      onClearError();
    }

    const newOtp = [...otp];
    newOtp[index] = newValue;
    setOtp(newOtp);

    // Call onChange with complete OTP string
    const otpString = newOtp.join("");
    onChange(otpString);

    // Auto-focus next input
    if (newValue && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Call onComplete when all 6 digits are entered
    if (otpString.length === 6) {
      onComplete?.(otpString);
    }
  };

  const handleKeyDown = (index, e) => {
    // Handle backspace
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").trim();
    
    // Only allow digits
    const digits = pastedData.replace(/\D/g, "").slice(0, 6);
    
    if (digits.length > 0) {
      // Clear error when user pastes content
      if (error && onClearError) {
        onClearError();
      }

      const newOtp = [...otp];
      digits.split("").forEach((digit, i) => {
        if (i < 6) {
          newOtp[i] = digit;
        }
      });
      setOtp(newOtp);
      
      const otpString = newOtp.join("");
      onChange(otpString);
      
      if (otpString.length === 6) {
        onComplete?.(otpString);
        inputRefs.current[5]?.focus();
      } else {
        inputRefs.current[digits.length]?.focus();
      }
    }
  };

  return (
    <div className="w-full">
      <div className="flex justify-center gap-1.5 sm:gap-2 md:gap-3 mb-4 flex-wrap">
        {otp.map((digit, index) => (
          <input
            key={index}
            ref={(el) => (inputRefs.current[index] = el)}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={digit}
            onChange={(e) => handleChange(index, e.target.value)}
            onKeyDown={(e) => handleKeyDown(index, e)}
            onPaste={handlePaste}
            disabled={disabled}
            className={`min-w-[40px] w-10 h-12 sm:w-12 sm:h-14 md:w-14 md:h-14 text-center text-lg sm:text-xl md:text-2xl font-bold border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-1 transition-all touch-manipulation ${
              error
                ? "border-red-500 bg-red-50"
                : digit
                ? "border-orange-500 bg-orange-50"
                : "border-gray-300 bg-white"
            } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-text"}`}
          />
        ))}
      </div>
    </div>
  );
};

export default OTPInput;

