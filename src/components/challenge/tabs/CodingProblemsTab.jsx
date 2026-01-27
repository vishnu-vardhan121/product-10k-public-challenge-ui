"use client";
import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import { runSample, submitProblem, savePublicChallengeDraft, fetchPublicChallengeDraft, updateProblemCode } from "@/redux/features/publicChallenge/publicChallengeSlice";
import MonacoEditor from "@/components/problemsComponents/MonacoEditor";
import ChallengeWorkspaceLayout from "@/components/challenge/workspace/ChallengeWorkspaceLayout";
import ProblemDescription from "@/components/challenge/editor/ProblemDescription";
import TestResults from "@/components/challenge/editor/TestResults";
import {
  FaSpinner,
  FaCheckCircle,
  FaCode,
  FaSave,
} from "react-icons/fa";
import { generateCodeTemplate, getSupportedLanguages } from "@/utils/codeTemplates";
import { debounce } from "@/utils/debounce";
import { getStoredLayout, storeLayout } from "@/utils/panelLayoutStorage";

const normalizeDraftText = (value = "") => String(value).replace(/\r\n/g, "\n").trim();

const InlineButtonSpinner = ({ className = '' }) => (
  <svg
    className={`h-4 w-4 animate-spin text-white ${className}`}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <circle
      className="opacity-25"
      cx="12"
      cy="12"
      r="10"
      stroke="currentColor"
      strokeWidth="4"
    />
    <path
      className="opacity-75"
      d="M4 12a8 8 0 018-8"
      stroke="currentColor"
      strokeWidth="4"
      strokeLinecap="round"
    />
  </svg>
);

const ButtonContent = ({ loading, label }) => (
  <span className="relative flex h-5 items-center justify-center">
    <span className={loading ? 'opacity-0' : 'opacity-100 transition-opacity'}>{label}</span>
    {loading && <InlineButtonSpinner className="absolute" />}
  </span>
);

export default function CodingProblemsTab({
  challengeId,
  problems,
  selectedProblemId,
  onSelectProblem,
  loading,
  userId,
  registrationId,
  phone,
  accessCode,
  timeLeft = { hours: 0, minutes: 0, seconds: 0 },
}) {
  const dispatch = useDispatch();
  const problemSubmissions = useSelector((state) => state.publicChallenge.problemSubmissions);

  const [code, setCode] = useState("");
  const [selectedLanguage, setSelectedLanguage] = useState("javascript");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState(null);
  const [saveStatus, setSaveStatus] = useState(""); // "saving", "saved", ""
  const [isLoadingCode, setIsLoadingCode] = useState(false);
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false); // Default to collapsed
  const [selectedTestCase, setSelectedTestCase] = useState(0);
  const [sampleRunResult, setSampleRunResult] = useState(null);
  const [sampleRunLoading, setSampleRunLoading] = useState(false);
  const [sampleRunError, setSampleRunError] = useState(null);
  const [submissionResult, setSubmissionResult] = useState(null);
  const [isEditMode, setIsEditMode] = useState(false);

  const lastDraftFetchKeyRef = useRef(null);
  const lastSavedByKeyRef = useRef({});
  const saveTimeoutRef = useRef(null);
  const pendingSaveArgsRef = useRef(null);
  const savingKeyRef = useRef(null);

  // Panel layout state - must be declared before any early returns
  const [horizontalLayout, setHorizontalLayout] = useState(null);
  const [verticalLayout, setVerticalLayout] = useState(null);
  const [isResizing, setIsResizing] = useState(false);

  const selectedProblem = useMemo(
    () => problems?.find((p) => p.id === selectedProblemId),
    [problems, selectedProblemId]
  );

  const solvedSubmission = selectedProblem?.user_submission || null;
  const isSolvedReadOnly = Boolean(selectedProblem?.is_solved && solvedSubmission && !isEditMode);

  const currentTemplate = useMemo(() => {
    if (!selectedProblem || !selectedLanguage) return "";
    if (!selectedProblem?.interface_spec) return "";
    return generateCodeTemplate(
      selectedLanguage,
      selectedProblem.interface_spec,
      selectedProblem.function_templates
    );
  }, [selectedProblem, selectedLanguage]);

  const shouldPersistDraft = useCallback((codeToSave) => {
    const normalizedCode = normalizeDraftText(codeToSave);
    if (!normalizedCode) return false;

    const normalizedTemplate = normalizeDraftText(currentTemplate);
    if (normalizedTemplate && normalizedCode === normalizedTemplate) return false;

    return true;
  }, [currentTemplate]);

  const doSaveDraft = useCallback(async (codeToSave, problemId, lang) => {
    if (!problemId || !lang || !userId) return;

    // If this is the currently selected problem and it is solved (read-only), don't save drafts.
    if (problemId === selectedProblemId && isSolvedReadOnly) return;

    const saveKey = `${challengeId}:${userId}:${problemId}:${lang}`;
    const normalizedCode = normalizeDraftText(codeToSave);

    if (!shouldPersistDraft(codeToSave)) return;

    if (lastSavedByKeyRef.current[saveKey] === normalizedCode) {
      return;
    }

    if (savingKeyRef.current === saveKey) {
      return;
    }

    savingKeyRef.current = saveKey;
    setSaveStatus("saving");

    try {
      await dispatch(savePublicChallengeDraft({
        challengeId,
        problemId,
        userId,
        language: lang,
        sourceCode: codeToSave,
      })).unwrap();

      lastSavedByKeyRef.current[saveKey] = normalizedCode;
      dispatch(updateProblemCode({ problemId, language: lang, sourceCode: codeToSave }));

      setSaveStatus("saved");
      setTimeout(() => setSaveStatus(""), 2000);
    } catch {
      setSaveStatus("");
    } finally {
      if (savingKeyRef.current === saveKey) {
        savingKeyRef.current = null;
      }
    }
  }, [challengeId, userId, dispatch, shouldPersistDraft, selectedProblemId, isSolvedReadOnly]);

  const scheduleSaveDraft = useCallback((codeToSave, problemId, lang) => {
    pendingSaveArgsRef.current = { codeToSave, problemId, lang };
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      const args = pendingSaveArgsRef.current;
      pendingSaveArgsRef.current = null;
      if (args) {
        doSaveDraft(args.codeToSave, args.problemId, args.lang);
      }
    }, 3000);
  }, [doSaveDraft]);

  const flushPendingSave = useCallback(async () => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }
    const args = pendingSaveArgsRef.current;
    pendingSaveArgsRef.current = null;
    if (args) {
      await doSaveDraft(args.codeToSave, args.problemId, args.lang);
    }
  }, [doSaveDraft]);

  const languages = useMemo(
    () => getSupportedLanguages(selectedProblem?.interface_spec),
    [selectedProblem?.interface_spec]
  );

  // Reference test cases from problem
  const referenceTestCases = useMemo(() => {
    if (!selectedProblem) return [];
    const sampleTests = selectedProblem.sample_test_cases;
    if (Array.isArray(sampleTests) && sampleTests.length > 0) {
      return sampleTests.map((test) => ({
        id: test.id,
        input: test.input_text || '',
        output: test.expected_output || '',
        points: test.points ?? null
      }));
    }
    return [];
  }, [selectedProblem]);

  // Load saved layouts on mount
  useEffect(() => {
    const storedHorizontal = getStoredLayout(`coding-problems-horizontal-${challengeId}`);
    const storedVertical = getStoredLayout(`coding-problems-vertical-${challengeId}`);
    if (storedHorizontal) setHorizontalLayout(storedHorizontal);
    if (storedVertical) setVerticalLayout(storedVertical);
  }, [challengeId]);

  // Handle layout changes - debounced to avoid too many writes
  const debouncedSaveHorizontal = useCallback(
    debounce((layout) => {
      storeLayout(`coding-problems-horizontal-${challengeId}`, layout);
    }, 500),
    [challengeId]
  );

  const debouncedSaveVertical = useCallback(
    debounce((layout) => {
      storeLayout(`coding-problems-vertical-${challengeId}`, layout);
    }, 500),
    [challengeId]
  );

  const handleHorizontalLayoutChange = useCallback((layout) => {
    setHorizontalLayout(layout);
    debouncedSaveHorizontal(layout);
  }, [debouncedSaveHorizontal]);

  const handleVerticalLayoutChange = useCallback((layout) => {
    setVerticalLayout(layout);
    debouncedSaveVertical(layout);
  }, [debouncedSaveVertical]);

  const handlePanelDrag = useCallback((isDragging) => {
    setIsResizing(isDragging);
  }, []);

  // Load code template or draft when problem or language changes
  useEffect(() => {
    if (!selectedProblemId || !selectedLanguage || !userId) return;

    // If problem already solved and not in edit mode, load latest AC submission and lock editor.
    if (isSolvedReadOnly && solvedSubmission) {
      setIsLoadingCode(true);
      const solvedLang = solvedSubmission.language || selectedLanguage;
      const solvedCode = solvedSubmission.source_code || '';
      if (solvedLang && solvedLang !== selectedLanguage) {
        setSelectedLanguage(solvedLang);
      }
      setCode(solvedCode);
      setIsLoadingCode(false);
      return;
    }

    const fetchKey = `${challengeId}:${userId}:${selectedProblemId}:${selectedLanguage}`;
    if (lastDraftFetchKeyRef.current === fetchKey) {
      return;
    }
    lastDraftFetchKeyRef.current = fetchKey;

    const cached = problemSubmissions?.[selectedProblemId];
    if (cached && cached.language === selectedLanguage && typeof cached.source_code === 'string') {
      setIsLoadingCode(true);
      if (shouldPersistDraft(cached.source_code)) {
        setCode(cached.source_code);
      } else if (currentTemplate) {
        setCode(currentTemplate);
      } else {
        setCode("");
      }
      setIsLoadingCode(false);
      return;
    }

    setIsLoadingCode(true);

    // Fetch draft from backend
    dispatch(fetchPublicChallengeDraft({
      challengeId,
      problemId: selectedProblemId,
      userId,
      language: selectedLanguage
    }))
      .unwrap()
      .then((draft) => {
        if (draft && draft.source_code && draft.language === selectedLanguage && shouldPersistDraft(draft.source_code)) {
          setCode(draft.source_code);
        } else {
          // Fallback to template if no draft
          if (selectedProblem?.interface_spec) {
            const template = generateCodeTemplate(
              selectedLanguage,
              selectedProblem.interface_spec,
              selectedProblem.function_templates
            );
            setCode(template);
          } else {
            setCode("");
          }
        }
      })
      .catch(() => {
        // Fallback on error
        if (selectedProblem?.interface_spec) {
          const template = generateCodeTemplate(
            selectedLanguage,
            selectedProblem.interface_spec,
            selectedProblem.function_templates
          );
          setCode(template);
        }
      })
      .finally(() => {
        setIsLoadingCode(false);
      });

  }, [selectedProblemId, selectedLanguage, userId, challengeId, dispatch, selectedProblem, shouldPersistDraft, problemSubmissions, currentTemplate]);

  // Auto-save code draft when code changes
  const handleCodeChange = useCallback((newCode) => {
    if (isSolvedReadOnly) {
      return;
    }
    setCode(newCode);
    if (selectedProblemId && selectedLanguage) {
      scheduleSaveDraft(newCode, selectedProblemId, selectedLanguage);
    }
  }, [selectedProblemId, selectedLanguage, scheduleSaveDraft, isSolvedReadOnly]);

  // Handle language change
  const handleLanguageChange = useCallback(
    async (newLanguage) => {
      if (isSolvedReadOnly) return;
      if (selectedLanguage === newLanguage) return;
      await flushPendingSave();
      await doSaveDraft(code, selectedProblemId, selectedLanguage);
      setIsLoadingCode(true);
      setCode('');
      setSelectedLanguage(newLanguage);
    },
    [selectedLanguage, code, selectedProblemId, flushPendingSave, doSaveDraft, isSolvedReadOnly]
  );

  // Handle problem selection
  const handleSelectProblem = useCallback(
    async (problem) => {
      if (!problem?.id) return;

      // Save current draft before switching
      if (!isSolvedReadOnly) {
        await flushPendingSave();
        await doSaveDraft(code, selectedProblemId, selectedLanguage);
      }

      onSelectProblem(problem.id);
      setIsEditMode(false);
      setSampleRunResult(null);
      setSubmissionResult(null);
      setSampleRunError(null);
    },
    [code, selectedProblemId, selectedLanguage, onSelectProblem, flushPendingSave, doSaveDraft, isSolvedReadOnly]
  );

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  // Handle Run (sample run)
  const handleRun = useCallback(async () => {
    if (isSolvedReadOnly) {
      return;
    }
    if (!selectedProblem?.id || !code.trim()) {
      setError("Please write some code before running");
      return;
    }

    setSampleRunLoading(true);
    setSampleRunError(null);
    setSampleRunResult(null);
    setSubmissionResult(null);
    setError(null);

    try {
      const result = await dispatch(
        runSample({
          challengeId,
          problemId: selectedProblemId,
          userId,
          registrationId,
          language: selectedLanguage,
          sourceCode: code,
        })
      ).unwrap();

      if (result.success && result.data) {
        // Backend returns: { success: true, data: { status: true, data: { tests, summary } } }
        // TestResults expects: { status: true, data: { tests, summary } }
        const runnerResult = result.data;
        if (runnerResult?.status && runnerResult?.data) {
          setSampleRunResult({
            status: runnerResult.status !== false,
            data: runnerResult.data
          });
        } else {
          setSampleRunError(runnerResult?.message || "Sample run failed");
        }
      } else {
        setSampleRunError(result.message || "Sample run failed");
      }
    } catch (err) {
      setSampleRunError(typeof err === 'string' ? err : (err?.message || "Failed to run code. Please try again."));
    } finally {
      setSampleRunLoading(false);
    }
  }, [selectedProblem, selectedProblemId, code, selectedLanguage, userId, registrationId, challengeId, dispatch, isSolvedReadOnly]);

  const handleSubmit = async () => {
    if (isSolvedReadOnly) {
      return;
    }
    if (!code.trim()) {
      setError("Please write some code before submitting.");
      return;
    }

    setSubmitting(true);
    setError(null);
    setSampleRunResult(null);
    setSubmissionResult(null);

    try {
      const result = await dispatch(
        submitProblem({
          challengeId,
          problemId: selectedProblemId,
          userId,
          registrationId,
          accessCode,
          language: selectedLanguage,
          sourceCode: code,
        })
      ).unwrap();

      if (result.success && result.data) {
        setSubmissionResult(result.data);
        setSubmitted(true);
        // If AC, exit edit mode (lock again on solved)
        if (result.data?.execution_result?.verdict === 'AC' || result.data?.submission?.verdict === 'AC') {
          setIsEditMode(false);
        }
        // Reset after 3 seconds
        setTimeout(() => {
          setSubmitted(false);
        }, 3000);
      } else {
        setError(result.message || "Submission failed");
      }
    } catch (err) {
      setError(err?.message || "Failed to submit solution. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleClearSampleRun = useCallback(() => {
    setSampleRunResult(null);
    setSubmissionResult(null);
    setSampleRunError(null);
  }, []);

  // Get current problem index - MUST be before any early returns
  const currentProblemIndex = useMemo(() => {
    if (!selectedProblemId || !problems) return -1;
    return problems.findIndex(p => p.id === selectedProblemId);
  }, [selectedProblemId, problems]);

  // Early returns AFTER all hooks
  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <FaSpinner className="animate-spin text-4xl text-gray-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading coding problems...</p>
        </div>
      </div>
    );
  }

  if (!problems || problems.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <FaCode className="text-4xl text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">No coding problems available for this challenge.</p>
        </div>
      </div>
    );
  }

  // Render left panel content - Description with always-visible sidebar
  const renderLeftPanelContent = () => {
    const sidebarWidth = isSidebarExpanded ? 450 : 220;

    return (
      <div className="h-full relative overflow-hidden">
        {/* Description Content - Starts after sidebar, always visible */}
        <div
          className="h-full overflow-y-auto absolute top-0 right-0 bottom-0 transition-all duration-300 ease-in-out"
          style={{ left: `${sidebarWidth}px` }}
        >
          <div className="p-4 lg:p-5 xl:p-6 2xl:p-7">
            <ProblemDescription
              problem={selectedProblem}
              loading={false}
              onBack={undefined}
            />
          </div>
        </div>

        {/* Problems Sidebar - Fixed position, toggle with click */}
        <div
          className={`absolute top-0 left-0 h-full bg-white border-r border-gray-200 transition-all duration-300 ease-in-out z-10 shadow-lg ${isSidebarExpanded ? 'w-[450px]' : 'w-[220px]'
            }`}
        >
          <div className="h-full flex flex-col">
            {/* Sidebar Header */}
            <div
              className="flex-shrink-0 px-4 py-3 border-b border-gray-200 bg-white cursor-pointer hover:bg-gray-50 transition-colors"
              onClick={() => setIsSidebarExpanded(!isSidebarExpanded)}
            >
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-900">
                  {isSidebarExpanded ? `Problems (${problems.length})` : 'Problems'}
                </h3>
                <button
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsSidebarExpanded(!isSidebarExpanded);
                  }}
                >
                  <svg
                    className={`w-5 h-5 transform transition-transform ${isSidebarExpanded ? '' : 'rotate-180'}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Problems List - Always visible */}
            <div className="flex-1 overflow-y-auto">
              <div className="py-2">
                {problems.map((problem, index) => {
                  const isCurrent = problem.id === selectedProblemId;
                  const problemNumber = index + 1;
                  const isSolved = Boolean(problem?.is_solved);

                  return (
                    <div
                      key={problem.id}
                      onClick={() => handleSelectProblem(problem)}
                      className={`cursor-pointer border-l-4 transition-all ${isCurrent
                        ? 'border-orange-500 bg-orange-50 shadow-sm'
                        : 'border-transparent hover:border-gray-300 hover:bg-gray-50'
                        }`}
                    >
                      <div className="px-4 py-3">
                        {/* Collapsed View - Number and Title */}
                        <div className="flex items-start gap-3">
                          {/* Problem Number */}
                          <div
                            className={`flex-shrink-0 flex h-8 w-8 items-center justify-center rounded-md text-sm font-bold ${isCurrent
                              ? 'bg-orange-500 text-white'
                              : 'bg-gray-200 text-gray-600'
                              }`}
                          >
                            {problemNumber}
                          </div>

                          {/* Problem Title */}
                          <div className="flex-1 min-w-0">
                            <h3
                              className={`text-sm font-semibold leading-tight mb-1 ${isCurrent ? 'text-gray-900' : 'text-gray-700'
                                }`}
                            >
                              {problem.title || `Problem ${problemNumber}`}
                            </h3>
                            {isSolved && (
                              <div className="flex items-center gap-1 text-xs text-emerald-600 font-medium">
                                <FaCheckCircle className="text-emerald-600" /> Solved
                              </div>
                            )}
                            <div className="flex items-center gap-2 text-xs text-gray-500 flex-wrap">
                              {problem.difficulty && (
                                <span className={`${problem.difficulty?.toLowerCase().includes('easy') ? 'text-teal-600' :
                                  problem.difficulty?.toLowerCase().includes('medium') ? 'text-yellow-600' :
                                    problem.difficulty?.toLowerCase().includes('hard') ? 'text-red-600' :
                                      'text-gray-600'
                                  }`}>
                                  {problem.difficulty}
                                </span>
                              )}
                              {problem.points && (
                                <span className="text-gray-500">
                                  • {problem.points} pts
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Expanded View - Full Problem Details */}
                        {isSidebarExpanded && (
                          <div className="mt-3 pl-11 border-t border-gray-200 pt-3">
                            {/* Problem Description Preview */}
                            <div className="text-xs text-gray-600 line-clamp-4 leading-relaxed">
                              {(() => {
                                // Use description_md if available, otherwise description
                                const descText = problem.description_md || problem.description || '';
                                if (!descText) {
                                  return <span className="text-gray-400 italic">No description available</span>;
                                }
                                // Strip markdown and get plain text preview (max 300 chars)
                                const plainText = descText
                                  .replace(/#{1,6}\s+/g, '') // Remove markdown headers
                                  .replace(/\*\*([^*]+)\*\*/g, '$1') // Remove bold
                                  .replace(/\*([^*]+)\*/g, '$1') // Remove italic
                                  .replace(/`([^`]+)`/g, '$1') // Remove inline code
                                  .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1') // Remove links
                                  .replace(/\n+/g, ' ') // Replace newlines with spaces
                                  .trim();
                                const preview = plainText.substring(0, 300);
                                return (
                                  <span>
                                    {preview}
                                    {plainText.length > 300 && <span className="text-gray-400">...</span>}
                                  </span>
                                );
                              })()}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Right panel content - Editor
  const rightPanelContent = (
    <div className="h-full flex flex-col bg-gray-900">
      <div className="bg-gray-800 border-b border-gray-700 px-3 lg:px-4 xl:px-4 2xl:px-5 py-2 lg:py-2 xl:py-2.5 2xl:py-2.5">
        <div className="grid grid-cols-3 items-center gap-3 lg:gap-3 xl:gap-4 2xl:gap-4">
          <div className="flex items-center">
            <select
              value={selectedLanguage}
              onChange={(e) => handleLanguageChange(e.target.value)}
              disabled={isLoadingCode || isSolvedReadOnly}
              className="px-2.5 lg:px-3 xl:px-3 2xl:px-4 py-1.5 lg:py-1.5 xl:py-2 2xl:py-2 text-xs lg:text-sm xl:text-sm 2xl:text-base bg-gray-700 text-white rounded border border-gray-600 focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:opacity-50"
            >
              {languages.map((lang) => (
                <option key={lang.value} value={lang.value}>
                  {lang.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-center">
            <img src="/logos/10k_logo_white.webp" alt="10000Coders" className="h-7 lg:h-8 xl:h-9 2xl:h-10 object-contain" />
          </div>

          <div className="flex items-center justify-end gap-1.5 lg:gap-2 xl:gap-2 2xl:gap-2">
            {saveStatus === "saving" && (
              <span className="text-gray-400 flex items-center gap-2 text-xs">
                <FaSpinner className="animate-spin" /> Saving...
              </span>
            )}
            {saveStatus === "saved" && (
              <span className="text-green-500 flex items-center gap-2 text-xs">
                <FaSave /> Saved!
              </span>
            )}

            {Boolean(selectedProblem?.is_solved && solvedSubmission) && isSolvedReadOnly && (
              <button
                type="button"
                onClick={() => setIsEditMode(true)}
                className="inline-flex items-center justify-center px-3 lg:px-4 xl:px-4 2xl:px-5 py-1.5 lg:py-1.5 xl:py-2 2xl:py-2 text-xs lg:text-sm xl:text-sm 2xl:text-base font-medium text-white bg-gray-600 hover:bg-gray-500 rounded transition-colors"
                title="Edit solved submission"
              >
                Edit
              </button>
            )}
            <button
              onClick={handleRun}
              disabled={isSolvedReadOnly || sampleRunLoading || submitting || !code.trim()}
              className="inline-flex min-w-[92px] items-center justify-center px-3 lg:px-4 xl:px-4 2xl:px-5 py-1.5 lg:py-1.5 xl:py-2 2xl:py-2 text-xs lg:text-sm xl:text-sm 2xl:text-base font-medium text-white bg-orange-600 hover:bg-orange-700 disabled:bg-orange-600/50 disabled:cursor-not-allowed rounded transition-colors"
              title="Run code with sample test cases"
            >
              <ButtonContent loading={sampleRunLoading} label="Run" />
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSolvedReadOnly || submitting || sampleRunLoading || !code.trim() || !selectedProblem}
              className="inline-flex min-w-[96px] items-center justify-center px-3 lg:px-4 xl:px-4 2xl:px-5 py-1.5 lg:py-1.5 xl:py-2 2xl:py-2 text-xs lg:text-sm xl:text-sm 2xl:text-base font-medium text-white bg-red-600 hover:bg-red-700 disabled:bg-red-600/50 disabled:cursor-not-allowed rounded transition-colors"
              title="Submit solution for evaluation"
            >
              <ButtonContent loading={submitting} label="Submit" />
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden relative">
        {isLoadingCode ? (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
              <p className="text-sm text-gray-400">Loading code...</p>
            </div>
          </div>
        ) : (
          <MonacoEditor
            key={`${selectedProblemId}-${selectedLanguage}`}
            language={selectedLanguage}
            defaultValue={code}
            onChange={handleCodeChange}
            challengeMode={true}
            readOnly={isSolvedReadOnly}
          />
        )}
      </div>
    </div>
  );

  // Results panel content - Test Results
  const resultsPanelContent = (
    <TestResults
      sampleRunResult={sampleRunResult}
      submissionResult={submissionResult}
      loading={{ sampleRun: sampleRunLoading, submit: submitting }}
      error={sampleRunError || error}
      onClearSampleRun={handleClearSampleRun}
      selectedTestCase={selectedTestCase}
      setSelectedTestCase={setSelectedTestCase}
      referenceTestCases={referenceTestCases}
    />
  );

  return (
    <ChallengeWorkspaceLayout
      challengeId={challengeId}
      timeLeft={timeLeft}
      leftPanelContent={renderLeftPanelContent()}
      rightPanelContent={rightPanelContent}
      resultsPanelContent={resultsPanelContent}
      onHorizontalDrag={handlePanelDrag}
      onVerticalDrag={handlePanelDrag}
    />
  );
}
