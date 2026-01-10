"use client";
import React, { useState, useEffect, useRef, useCallback } from "react";
import { useDispatch } from "react-redux";
import { submitMCQ } from "@/redux/features/publicChallenge/publicChallengeSlice";
import { FaSpinner, FaCheckCircle, FaExclamationTriangle } from "react-icons/fa";
import MarkdownRenderer from "@/components/shared/MarkdownRenderer";
import { debounce } from "@/utils/debounce";

export default function MCQTab({ challengeId, questions, loading, userId, registrationId, phone, onGoToProblems }) {
  const dispatch = useDispatch();
  const [answers, setAnswers] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState(null);
  const savingInProgressRef = useRef({}); // Track which questions are currently being saved to prevent duplicates

  // Load saved answers and submission status
  useEffect(() => {
    const saved = localStorage.getItem(`mcq_answers_${challengeId}`);
    const isSubmitted = localStorage.getItem(`mcq_submitted_${challengeId}`);

    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setAnswers(parsed);
      } catch (e) {
        // Silently handle parse errors
      }
    }

    if (isSubmitted === 'true') {
      setSubmitted(true);
    }
  }, [challengeId]);


  // Auto-save answers to localStorage
  useEffect(() => {
    if (Object.keys(answers).length > 0) {
      const timeoutId = setTimeout(() => {
        localStorage.setItem(`mcq_answers_${challengeId}`, JSON.stringify(answers));
      }, 1000); // Debounce 1 second

      return () => clearTimeout(timeoutId);
    }
  }, [answers, challengeId]);

  // Function to save a single answer to backend (silent, no UI feedback)
  const saveAnswerToBackend = useCallback(async (questionId, answer) => {
    if (!userId || !registrationId) {
      return; // Silently fail if IDs not available
    }

    if (!challengeId) {
      return; // Silently fail if challengeId not available
    }

    // Prevent duplicate saves for the same question
    if (savingInProgressRef.current[questionId]) {
      return; // Already saving, skip this call
    }

    // Mark as saving in progress
    savingInProgressRef.current[questionId] = true;

    try {
      const submission = {
        question_id: parseInt(questionId),
        selected_option_id: answer?.selected_option_id || null,
        text_answer: answer?.text_answer || null,
      };

      await dispatch(
        submitMCQ({
          challengeId: parseInt(challengeId),
          userId,
          registrationId,
          submissions: [submission], // Send single submission
        })
      ).unwrap();

      // Success - remove from saving state
      delete savingInProgressRef.current[questionId];
    } catch (err) {
      // Silently handle error - remove from saving state
      delete savingInProgressRef.current[questionId];
    }
  }, [userId, registrationId, challengeId, dispatch]);

  // Debounced version of save for text inputs
  const debouncedTextSave = useCallback(
    debounce((questionId, answer) => {
      saveAnswerToBackend(questionId, answer);
    }, 1000),
    [saveAnswerToBackend]
  );

  // Track pending saves to avoid calling during render
  const pendingSavesRef = useRef([]);

  const handleAnswerChange = useCallback((questionId, optionId, textAnswer = null) => {
    setAnswers((prev) => {
      const currentAnswer = prev[questionId];

      // Allow deselection - if clicking the same option, deselect it
      if (optionId && currentAnswer?.selected_option_id === optionId) {
        const newAnswers = { ...prev };
        delete newAnswers[questionId];

        // Schedule deselection save (IMMEDIATE)
        pendingSavesRef.current.push({
          questionId,
          answer: { selected_option_id: null, text_answer: null }
        });

        return newAnswers;
      }

      // Otherwise set the new answer
      const newAnswer = {
        selected_option_id: optionId,
        text_answer: textAnswer,
      };

      const updatedAnswers = {
        ...prev,
        [questionId]: newAnswer,
      };

      // Schedule save
      if (textAnswer !== null) {
        // For text answers, use debounce manually and DON'T add to pendingSavesRef for useEffect
        // We trigger the debounced save immediately
        debouncedTextSave(questionId, newAnswer);
      } else {
        // For option selection, use existing immediate save via useEffect
        pendingSavesRef.current.push({
          questionId,
          answer: newAnswer
        });
      }

      return updatedAnswers;
    });
    setError(null);
  }, [debouncedTextSave]);

  // Process pending saves after state updates (outside of render)
  useEffect(() => {
    if (pendingSavesRef.current.length > 0) {
      const saves = [...pendingSavesRef.current];
      pendingSavesRef.current = []; // Clear the queue

      // Process each pending save
      saves.forEach(({ questionId, answer }) => {
        saveAnswerToBackend(questionId, answer);
      });
    }
  }, [answers, saveAnswerToBackend]);

  // Cleanup saving state on unmount
  useEffect(() => {
    return () => {
      // Clear saving in progress ref
      savingInProgressRef.current = {};
    };
  }, []);

  const handleSubmit = async () => {
    if (Object.keys(answers).length === 0) {
      setError("Please answer at least one question before submitting.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      // Final submission - all answers should already be saved via auto-save
      // But we'll submit all again to ensure consistency
      const submissions = Object.entries(answers).map(([questionId, answer]) => ({
        question_id: parseInt(questionId),
        selected_option_id: answer.selected_option_id || null,
        text_answer: answer.text_answer || null,
      }));

      await dispatch(
        submitMCQ({
          challengeId,
          userId,
          registrationId,
          submissions,
        })
      ).unwrap();

      setSubmitted(true);
      setIsEditing(false);
      // Persist submitted status but KEEP answers for review
      localStorage.setItem(`mcq_submitted_${challengeId}`, 'true');
      // Do NOT remove answers: localStorage.removeItem(`mcq_answers_${challengeId}`);
    } catch (err) {
      // Extract detailed error message
      const errorMessage = err?.message ||
        err?.payload?.message ||
        err?.response?.data?.message ||
        (err?.payload?.errors ? JSON.stringify(err.payload.errors) : null) ||
        "Failed to submission answers. Please try again.";
      setError(errorMessage);
      console.error('MCQ submission error:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const answeredCount = Object.keys(answers).length;
  const totalCount = questions.length;
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

  // Initialize current question index when questions load
  useEffect(() => {
    if (questions.length > 0 && currentQuestionIndex >= questions.length) {
      setCurrentQuestionIndex(0);
    }
  }, [questions, currentQuestionIndex]);

  const currentQuestion = questions[currentQuestionIndex] || null;
  const selectedQuestionId = currentQuestion?.id || null;

  const handleNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <FaSpinner className="animate-spin text-4xl text-gray-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading MCQ questions...</p>
        </div>
      </div>
    );
  }

  /* 
    Removed separate submitted view to allow review. 
    Submission state is now handled in the main render.
  */

  if (!currentQuestion) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <FaSpinner className="animate-spin text-4xl text-gray-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading question...</p>
        </div>
      </div>
    );
  }

  const questionAnswer = answers[currentQuestion.id] || {};
  const isAnswered = questionAnswer.selected_option_id || questionAnswer.text_answer;

  return (
    <div className="h-full flex overflow-hidden">
      {/* Main Content Area - Single Question */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-4xl mx-auto px-4 py-8">
            {/* Submitted Banner */}
            {submitted && !isEditing && (
              <div className="bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-100 rounded-xl p-8 mb-8 text-center shadow-sm relative overflow-hidden">
                <div className="relative z-10">
                  <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-white shadow-sm">
                    <FaCheckCircle className="text-3xl text-orange-600" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">Answers Submitted!</h3>
                  <p className="text-gray-600 mb-6 max-w-lg mx-auto">
                    Your answers have been recorded. You can review them below or modify them if needed.
                  </p>
                  <div className="flex items-center justify-center gap-4">
                    <button
                      onClick={() => setIsEditing(true)}
                      className="px-6 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 hover:border-gray-400 transition-all shadow-sm flex items-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                      Edit Answers
                    </button>
                    {onGoToProblems && (
                      <button
                        onClick={onGoToProblems}
                        className="px-6 py-2.5 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800 transition-all shadow-md hover:shadow-lg flex items-center gap-2"
                      >
                        Go to Coding Problems
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
                {/* Decorative background elements */}
                <div className="absolute top-0 right-0 -mt-8 -mr-8 w-32 h-32 bg-orange-100 rounded-full opacity-50 blur-2xl"></div>
                <div className="absolute bottom-0 left-0 -mb-8 -ml-8 w-32 h-32 bg-amber-100 rounded-full opacity-50 blur-2xl"></div>
              </div>
            )}



            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-center gap-2">
                <FaExclamationTriangle className="text-red-600" />
                <p className="text-red-800">{error}</p>
              </div>
            )}

            {/* Current Question */}
            <div className="bg-white rounded-lg p-8">
              <div className="flex items-start gap-4 mb-6">
                <div className="flex-shrink-0 w-8 h-8 rounded bg-gray-100 flex items-center justify-center text-sm font-medium text-gray-600">
                  {currentQuestionIndex + 1}
                </div>
                <div className="flex-1">
                  <div className="mb-2 prose prose-sm max-w-none">
                    <MarkdownRenderer
                      content={currentQuestion.question_text || ''}
                    />
                  </div>
                  {currentQuestion.points && (
                    <p className="text-sm text-gray-500 mt-2">Points: {currentQuestion.points}</p>
                  )}
                </div>
              </div>

              {/* Multiple Choice Options */}
              {currentQuestion.question_type === "MULTIPLE_CHOICE" && currentQuestion.options && (
                <div className="space-y-3 ml-12">
                  {currentQuestion.options.map((option, optIndex) => {
                    const isSelected = questionAnswer.selected_option_id === option.id;
                    return (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => (!submitted || isEditing) && handleAnswerChange(currentQuestion.id, option.id)}
                        disabled={submitted && !isEditing}
                        className={`w-full flex items-start gap-3 p-4 rounded-lg border-2 text-left transition-colors ${isSelected
                          ? "border-orange-500 bg-orange-50"
                          : "border-gray-200 bg-white"
                          } ${(!submitted || isEditing) ? "hover:border-gray-300" : "cursor-default opacity-80"}`}
                      >
                        <div
                          className={`flex-shrink-0 mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center ${isSelected
                            ? "border-orange-500 bg-orange-500"
                            : "border-gray-300 bg-white"
                            }`}
                        >
                          {isSelected && (
                            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                        <div className={`flex-1 prose prose-sm max-w-none ${isSelected ? "prose-gray" : ""
                          }`}>
                          <div className="[&>p]:mb-0 [&>p:last-child]:mb-0 [&>ul]:mb-0 [&>ol]:mb-0">
                            <MarkdownRenderer content={option.option_text || ''} />
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Fill in the Blank */}
              {currentQuestion.question_type === "FILL_IN_BLANK" && (
                <div className="ml-12">
                  <textarea
                    value={questionAnswer.text_answer || ""}
                    onChange={(e) =>
                      handleAnswerChange(currentQuestion.id, null, e.target.value)
                    }
                    placeholder="Enter your answer here..."
                    className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors text-gray-700 placeholder-gray-400 bg-white resize-none ${isAnswered
                      ? "border-orange-500"
                      : "border-gray-200"
                      } ${(submitted && !isEditing) ? "bg-gray-50 cursor-not-allowed" : ""}`}
                    rows={5}
                    disabled={submitted && !isEditing}
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Navigation Buttons - Fixed at bottom */}
        <div className="flex-shrink-0 bg-white border-t border-gray-200 px-4 py-4">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <button
              onClick={handlePrevious}
              disabled={currentQuestionIndex === 0}
              className="px-6 py-2.5 bg-orange-600 text-white rounded-lg font-medium hover:bg-orange-700 transition-colors disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Previous
            </button>

            <span className="text-sm font-medium text-gray-700">
              Question {currentQuestionIndex + 1} of {totalCount}
            </span>

            <button
              onClick={handleNext}
              disabled={currentQuestionIndex === questions.length - 1}
              className="px-6 py-2.5 bg-orange-600 text-white rounded-lg font-medium hover:bg-orange-700 transition-colors disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed flex items-center gap-2"
            >
              Next
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>

        {/* Submit Button - Only show on last question */}
        {submitted && !isEditing ? (
          <div className="flex gap-4">
            <button
              onClick={() => setIsEditing(true)}
              className="flex-1 px-6 py-3 bg-white border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
            >
              Edit Answers
            </button>
            {onGoToProblems && (
              <button
                onClick={onGoToProblems}
                className="flex-1 bg-gray-900 text-white px-6 py-3 rounded-lg font-medium hover:bg-gray-800 transition-colors flex items-center justify-center gap-2"
              >
                Go to Coding Problems
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </button>
            )}
          </div>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={submitting || answeredCount === 0}
            className={`w-full text-white px-6 py-3 rounded-lg font-medium transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${!submitting && answeredCount > 0
              ? 'bg-orange-600 hover:bg-orange-700'
              : ''
              }`}
          >
            {submitting ? (
              <>
                <FaSpinner className="animate-spin" />
                {isEditing ? 'Updating...' : 'Submitting...'}
              </>
            ) : (
              isEditing
                ? `Update Answers (${answeredCount} answered)`
                : `Submit All Answers (${answeredCount} answered)`
            )}
          </button>
        )}
      </div>

      {/* Right Sidebar - Non-scrollable, Fixed */}
      <div className="w-64 bg-gray-50 border-l border-gray-200 flex-shrink-0 flex flex-col">
        {/* Sidebar Header */}
        <div className="flex-shrink-0 px-4 py-4 border-b border-gray-200 bg-white">
          <h3 className="text-sm font-semibold text-gray-900">
            Questions ({totalCount})
          </h3>
        </div>

        {/* Legend */}
        <div className="flex-shrink-0 px-4 py-3 border-b border-gray-200 bg-white">
          <div className="space-y-2 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded border-2 border-orange-600 bg-orange-600 text-white flex items-center justify-center text-xs font-semibold">
                1
              </div>
              <span className="text-gray-700 text-xs">Currently viewing</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded border-2 border-orange-400 bg-orange-100 flex items-center justify-center text-xs font-semibold text-orange-700">
                2
              </div>
              <span className="text-gray-700 text-xs">Answered</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded border-2 border-gray-300 bg-white flex items-center justify-center text-xs font-semibold text-gray-500">
                3
              </div>
              <span className="text-gray-700 text-xs">Not answered</span>
            </div>
          </div>
        </div>

        {/* Questions Grid - Scrollable content */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="grid grid-cols-4 gap-2.5">
            {questions.map((question, index) => {
              const questionAnswer = answers[question.id] || {};
              const isAnswered = questionAnswer.selected_option_id || questionAnswer.text_answer;
              const isCurrent = currentQuestionIndex === index;

              return (
                <button
                  key={question.id}
                  onClick={() => setCurrentQuestionIndex(index)}
                  className={`aspect-square flex items-center justify-center rounded-lg border-2 transition-colors font-semibold text-sm ${isCurrent
                    ? "border-orange-600 bg-orange-600 text-white"
                    : isAnswered
                      ? "border-orange-400 bg-orange-100 text-orange-700 hover:bg-orange-200"
                      : "border-gray-300 bg-white text-gray-500 hover:border-gray-400 hover:bg-gray-50"
                    }`}
                  title={`Question ${index + 1}`}
                >
                  {index + 1}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

