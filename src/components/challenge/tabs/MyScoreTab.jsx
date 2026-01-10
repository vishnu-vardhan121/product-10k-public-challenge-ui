"use client";
import React from "react";
import { FaSpinner, FaTrophy, FaQuestionCircle, FaCode } from "react-icons/fa";

export default function MyScoreTab({ challengeId, score, loading, phone }) {
  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <FaSpinner className="animate-spin text-4xl text-gray-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading your score...</p>
        </div>
      </div>
    );
  }

  if (!score) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12">
        <div className="bg-white rounded-lg shadow-sm p-8 text-center">
          <FaTrophy className="text-5xl text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">No Score Available</h2>
          <p className="text-gray-600">
            Your score will be available after you submit solutions for problems and MCQs.
          </p>
        </div>
      </div>
    );
  }

  const totalPoints = (score.mcq_points || 0) + (score.coding_points || 0);
  const maxMCQPoints = score.total_mcq_points || 0;
  const maxCodingPoints = score.total_coding_points || 0;
  const maxTotalPoints = maxMCQPoints + maxCodingPoints;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="bg-white rounded-lg shadow-lg p-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-6 flex items-center gap-3">
          <FaTrophy className="text-orange-600" />
          My Score
        </h2>

        {/* Overall Score Card */}
        <div className="bg-gradient-to-r from-orange-50 to-orange-100 rounded-lg p-6 mb-6 border-2 border-orange-200">
          <div className="text-center">
            <p className="text-sm font-medium text-gray-600 mb-2">Total Points</p>
            <p className="text-5xl font-bold text-orange-600 mb-1">
              {totalPoints} / {maxTotalPoints}
            </p>
            <div className="w-full bg-gray-200 rounded-full h-3 mt-4">
              <div
                className="bg-orange-600 h-3 rounded-full transition-all"
                style={{
                  width: `${maxTotalPoints > 0 ? (totalPoints / maxTotalPoints) * 100 : 0}%`,
                }}
              />
            </div>
          </div>
        </div>

        {/* Score Breakdown */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* MCQ Score */}
          <div className="bg-white border-2 border-gray-200 rounded-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                <FaQuestionCircle className="text-blue-600 text-xl" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">MCQ Questions</h3>
                <p className="text-sm text-gray-500">Multiple Choice & Fill-in-blank</p>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Your Score:</span>
                <span className="text-2xl font-bold text-gray-900">
                  {score.mcq_points || 0}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Total Possible:</span>
                <span className="text-lg font-semibold text-gray-700">
                  {maxMCQPoints}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-3">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all"
                  style={{
                    width: `${
                      maxMCQPoints > 0 ? ((score.mcq_points || 0) / maxMCQPoints) * 100 : 0
                    }%`,
                  }}
                />
              </div>
            </div>
          </div>

          {/* Coding Score */}
          <div className="bg-white border-2 border-gray-200 rounded-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                <FaCode className="text-green-600 text-xl" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Coding Problems</h3>
                <p className="text-sm text-gray-500">Algorithm & Programming</p>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Your Score:</span>
                <span className="text-2xl font-bold text-gray-900">
                  {score.coding_points || 0}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Total Possible:</span>
                <span className="text-lg font-semibold text-gray-700">
                  {maxCodingPoints}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-3">
                <div
                  className="bg-green-600 h-2 rounded-full transition-all"
                  style={{
                    width: `${
                      maxCodingPoints > 0
                        ? ((score.coding_points || 0) / maxCodingPoints) * 100
                        : 0
                    }%`,
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Rank Display */}
        {score.rank && (
          <div className="mt-6 bg-gray-50 rounded-lg p-6 border border-gray-200">
            <div className="text-center">
              <p className="text-sm font-medium text-gray-600 mb-1">Your Current Rank</p>
              <p className="text-3xl font-bold text-gray-900">#{score.rank}</p>
            </div>
          </div>
        )}

        {/* Note */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800">
            <strong>Note:</strong> Results will be finalized after the challenge ends. Keep
            submitting your solutions to improve your score!
          </p>
        </div>
      </div>
    </div>
  );
}

