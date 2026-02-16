"use client";
import React, { useState, useEffect, useRef, useCallback } from "react";
import { useDispatch } from "react-redux";
import { submitMCQ } from "@/redux/features/publicChallenge/publicChallengeSlice";
import { FaSpinner, FaExclamationTriangle } from "react-icons/fa";
import MarkdownRenderer from "@/components/shared/MarkdownRenderer";
import { debounce } from "@/utils/debounce";

export default function MCQTab({ challengeId, questions, loading, userId, registrationId, onGoToProblems, hasProblems }) {
  const dispatch = useDispatch();
  const [answers, setAnswers] = useState({});
  const [mobileQuestionPickerOpen, setMobileQuestionPickerOpen] = useState(false);
  const savingInProgressRef = useRef({}); // Track which questions are currently being saved to prevent duplicates

  // Hydrate answers from localStorage (quick fallback) and backend (authoritative).
  // Backend comes via questions[].user_submission from the MCQ questions API.
  useEffect(() => {
    const storageKey = `mcq_answers_${challengeId}`;
    let localAnswers = {};

    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        localAnswers = JSON.parse(saved) || {};
      } catch (e) {
        localAnswers = {};
      }
    }

    // While loading, keep local answers so UI doesn't flash empty selections.
    if (loading) {
      setAnswers(localAnswers);
      return;
    }

    const backendAnswers = {};
    if (Array.isArray(questions)) {
      questions.forEach((q) => {
        const sub = q?.user_submission;
        if (!sub) return;
        const selected_option_id = sub?.selected_option_id ?? null;
        const text_answer = sub?.text_answer ?? null;
        if (!selected_option_id && !(typeof text_answer === 'string' && text_answer.trim())) {
          return;
        }
        backendAnswers[q.id] = { selected_option_id, text_answer };
      });
    }

    const hasBackend = Object.keys(backendAnswers).length > 0;
    const nextAnswers = hasBackend ? backendAnswers : localAnswers;
    setAnswers(nextAnswers);

    // Keep localStorage in sync with backend when backend provides answers.
    // Otherwise preserve local fallback (useful if backend fetch fails/transient).
    if (hasBackend) {
      localStorage.setItem(storageKey, JSON.stringify(backendAnswers));
    }
  }, [challengeId, questions, loading]);


  // Auto-save answers to localStorage
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      const storageKey = `mcq_answers_${challengeId}`;
      if (Object.keys(answers).length > 0) {
        localStorage.setItem(storageKey, JSON.stringify(answers));
      } else {
        localStorage.removeItem(storageKey);
      }
    }, 1000); // Debounce 1 second

    return () => clearTimeout(timeoutId);
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
  const totalCount = questions.length;
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

  // Initialize current question index when questions load
  useEffect(() => {
    if (questions.length > 0 && currentQuestionIndex >= questions.length) {
      setCurrentQuestionIndex(0);
    }
  }, [questions, currentQuestionIndex]);

  const currentQuestion = questions[currentQuestionIndex] || null;

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

  // Don't block UI with loader if we already have questions; backend fetch may be running to prefill answers.
  if (loading && (!questions || questions.length === 0)) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <FaSpinner className="animate-spin text-4xl text-gray-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading MCQ questions...</p>
        </div>
      </div>
    );
  }

  if (!questions || questions.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center max-w-md px-6">
          <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
            <FaExclamationTriangle className="text-2xl text-gray-500" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">MCQs are not available</h3>
          <p className="text-sm text-gray-600">
            This challenge doesn't have MCQ questions right now.
          </p>
          {hasProblems && onGoToProblems && (
            <button
              onClick={onGoToProblems}
              className="mt-6 inline-flex items-center justify-center px-5 py-2.5 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800 transition-colors"
            >
              Go to Coding Problems
              <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </button>
          )}
        </div>
      </div>
    );
  }

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
    <div className="flex-1 min-h-0 flex flex-col md:flex-row overflow-hidden">
      {/* Main Content Area - Single Question */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden min-w-0">
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
          <div className="max-w-4xl mx-auto px-3 sm:px-4 py-4 sm:py-6 md:py-8 pb-24 md:pb-8">
            {/* Current Question */}
            <div className="bg-white rounded-lg p-4 sm:p-6 md:p-8">
              <div className="flex items-start gap-4 mb-6">
                <div className="shrink-0 w-8 h-8 rounded bg-gray-100 flex items-center justify-center text-sm font-medium text-gray-600">
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
                <div className="space-y-3 ml-0 sm:ml-4 md:ml-12">
                  {currentQuestion.options.map((option) => {
                    const isSelected = questionAnswer.selected_option_id === option.id;
                    return (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => handleAnswerChange(currentQuestion.id, option.id)}
                        className={`w-full flex items-start gap-3 p-4 rounded-lg border-2 text-left transition-colors ${isSelected
                          ? "border-orange-500 bg-orange-50"
                          : "border-gray-200 bg-white"
                          } hover:border-gray-300`}
                      >
                        <div
                          className={`shrink-0 mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center ${isSelected
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
                <div className="ml-0 sm:ml-4 md:ml-12">
                  <textarea
                    value={questionAnswer.text_answer || ""}
                    onChange={(e) =>
                      handleAnswerChange(currentQuestion.id, null, e.target.value)
                    }
                    placeholder="Enter your answer here..."
                    className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors text-gray-700 placeholder-gray-400 bg-white resize-none ${isAnswered
                      ? "border-orange-500"
                      : "border-gray-200"
                      }`}
                    rows={5}
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Navigation: fixed at bottom on mobile so always visible; normal flow on desktop */}
        <div className="shrink-0 fixed bottom-0 left-0 right-0 md:relative md:left-auto md:right-auto bg-white border-t border-gray-200 px-3 sm:px-4 py-3 sm:py-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] md:shadow-none pb-[env(safe-area-inset-bottom)] z-30">
          <div className="max-w-4xl mx-auto flex items-center justify-between gap-2">
            <button
              onClick={handlePrevious}
              disabled={currentQuestionIndex === 0}
              className="min-h-[44px] min-w-[44px] px-4 sm:px-6 py-2.5 bg-orange-600 text-white rounded-lg font-medium hover:bg-orange-700 transition-colors disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span className="hidden sm:inline">Previous</span>
            </button>

            <button
              type="button"
              onClick={() => setMobileQuestionPickerOpen(true)}
              className="md:hidden min-h-[44px] px-3 py-2 rounded-lg border-2 border-gray-300 bg-white text-gray-700 font-medium text-sm"
            >
              {currentQuestionIndex + 1} / {totalCount}
            </button>

            <span className="hidden md:inline text-sm font-medium text-gray-700">
              Question {currentQuestionIndex + 1} of {totalCount}
            </span>

            {currentQuestionIndex === questions.length - 1 && hasProblems && onGoToProblems ? (
              <button
                onClick={onGoToProblems}
                className="min-h-[44px] px-4 sm:px-6 py-2.5 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800 transition-colors flex items-center justify-center gap-2"
              >
                <span className="hidden sm:inline">Go to Coding</span>
                <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </button>
            ) : (
              <button
                onClick={handleNext}
                disabled={currentQuestionIndex === questions.length - 1}
                className="min-h-[44px] min-w-[44px] px-4 sm:px-6 py-2.5 bg-orange-600 text-white rounded-lg font-medium hover:bg-orange-700 transition-colors disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <span className="hidden sm:inline">Next</span>
                <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Mobile question picker sheet */}
      {mobileQuestionPickerOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-40 md:hidden"
            onClick={() => setMobileQuestionPickerOpen(false)}
            aria-hidden
          />
          <div className="fixed inset-x-0 bottom-0 z-50 max-h-[70vh] rounded-t-2xl bg-white shadow-xl md:hidden flex flex-col">
            <div className="shrink-0 px-4 py-3 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900">Jump to question</h3>
              <button
                type="button"
                onClick={() => setMobileQuestionPickerOpen(false)}
                className="p-2 rounded-lg hover:bg-gray-100 text-gray-600"
                aria-label="Close"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <div className="grid grid-cols-5 gap-2.5">
                {questions.map((question, index) => {
                  const qAnswer = answers[question.id] || {};
                  const answered = qAnswer.selected_option_id || qAnswer.text_answer;
                  const isCurrent = currentQuestionIndex === index;
                  return (
                    <button
                      key={question.id}
                      type="button"
                      onClick={() => {
                        setCurrentQuestionIndex(index);
                        setMobileQuestionPickerOpen(false);
                      }}
                      className={`aspect-square flex items-center justify-center rounded-lg border-2 transition-colors font-semibold text-sm min-h-[44px] ${isCurrent
                        ? "border-orange-600 bg-orange-600 text-white"
                        : answered
                          ? "border-orange-400 bg-orange-100 text-orange-700"
                          : "border-gray-300 bg-white text-gray-500"
                        }`}
                    >
                      {index + 1}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Right Sidebar - Desktop only */}
      <div className="hidden md:flex w-64 bg-gray-50 border-l border-gray-200 shrink-0 flex-col">
        {/* Sidebar Header */}
        <div className="shrink-0 px-4 py-4 border-b border-gray-200 bg-white">
          <h3 className="text-sm font-semibold text-gray-900">
            Questions ({totalCount})
          </h3>
        </div>

        {/* Legend */}
        <div className="shrink-0 px-4 py-3 border-b border-gray-200 bg-white">
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

