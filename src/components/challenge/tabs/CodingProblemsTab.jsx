"use client";
import React, { useState, useEffect, useMemo, useCallback, useRef, useReducer } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import {
  runSample,
  submitProblem,
  savePublicChallengeDraft,
  fetchPublicChallengeDraft,
  updateProblemCode,
  updateCodingWorkspace,
} from "@/redux/features/publicChallenge/publicChallengeSlice";
import MonacoEditor from "@/components/problemsComponents/MonacoEditor";
import ChallengeWorkspaceLayout from "@/components/challenge/workspace/ChallengeWorkspaceLayout";
import ProblemDescription from "@/components/challenge/editor/ProblemDescription";
import TestResults from "@/components/challenge/editor/TestResults";
import {
  FaSpinner,
  FaCheckCircle,
  FaCode,
  FaSyncAlt,
} from "react-icons/fa";
import { generateCodeTemplate, getSupportedLanguages } from "@/utils/codeTemplates";
import { debounce } from "@/utils/debounce";
import { toast } from "react-toastify";
import { getStoredLayout, storeLayout } from "@/utils/panelLayoutStorage";

const normalizeDraftText = (value = "") => String(value).replace(/\r\n/g, "\n").trim();

/**
 * All executed sample tests passed (same idea as TestResults for a sample run).
 * When the problem has no reference sample cases, any successful run payload counts as the pre-check.
 */
function isSampleRunAllTestsPassed(sampleRunResult, referenceCaseCount) {
  if (!sampleRunResult?.status || !sampleRunResult?.data) return false;
  const data = sampleRunResult.data;
  const tests = data.tests || [];
  if (referenceCaseCount === 0) {
    if (tests.length === 0) return true;
    return tests.every((t) => t.status === "AC");
  }
  const summary = data.summary || {};
  const testsExecuted = summary.tests_executed ?? summary.total_tests ?? tests.length ?? 0;
  const passedCount =
    summary.passed ??
    summary.passed_tests ??
    (tests.length ? tests.filter((t) => t.status === "AC").length : 0);
  if (tests.length > 0) return tests.every((t) => t.status === "AC");
  return testsExecuted > 0 && passedCount === testsExecuted;
}

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

/** Local UI only — run/submit outcomes & language live in Redux (`codingWorkspace`) so MCQ ↔ Coding tab switches do not wipe them. */
const initialCodingTabUi = {
  code: "",
  submitting: false,
  submitted: false,
  saveStatus: "",
  isLoadingCode: false,
  isSidebarExpanded: false,
  selectedTestCase: 0,
  sampleRunLoading: false,
  isEditMode: false,
  openResultsTrigger: 0,
  showTemplateResetModal: false,
  horizontalLayout: null,
  verticalLayout: null,
  isResizing: false,
};

function codingTabUiReducer(state, action) {
  switch (action.type) {
    case "PATCH":
      return { ...state, ...action.patch };
    case "BUMP_OPEN_RESULTS":
      return { ...state, openResultsTrigger: state.openResultsTrigger + 1 };
    default:
      return state;
  }
}

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
  const codingWorkspace = useSelector((state) => state.publicChallenge.codingWorkspace);

  const patchWorkspace = useCallback(
    (patch) => {
      dispatch(updateCodingWorkspace({ challengeId: Number(challengeId), ...patch }));
    },
    [challengeId, dispatch]
  );

  const [ui, dispatchUi] = useReducer(codingTabUiReducer, initialCodingTabUi);
  const patchUi = useCallback((patch) => {
    dispatchUi({ type: "PATCH", patch });
  }, []);
  const bumpOpenResults = useCallback(() => {
    dispatchUi({ type: "BUMP_OPEN_RESULTS" });
  }, []);

  const {
    selectedLanguage,
    sampleRunResult,
    sampleRunError,
    submissionResult,
    submitRunGateFingerprint,
    tabError,
  } = codingWorkspace;

  const {
    code,
    submitting,
    submitted,
    saveStatus,
    isLoadingCode,
    isSidebarExpanded,
    selectedTestCase,
    sampleRunLoading,
    isEditMode,
    openResultsTrigger,
    showTemplateResetModal,
    horizontalLayout,
    verticalLayout,
    isResizing,
  } = ui;

  const setSelectedTestCase = useCallback((value) => {
    dispatchUi({ type: "PATCH", patch: { selectedTestCase: value } });
  }, []);

  /** Latest problem+language load key — compared after async draft fetch to avoid applying stale code. */
  const latestDraftFetchTargetRef = useRef("");
  /** Always latest `problems` list so async draft handlers resolve templates for the correct id (not a stale closure). */
  const problemsRef = useRef(problems);
  const lastSavedByKeyRef = useRef({});
  const saveTimeoutRef = useRef(null);
  const pendingSaveArgsRef = useRef(null);
  const savingKeyRef = useRef(null);

  const [isLg, setIsLg] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    const update = () => setIsLg(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  const selectedProblem = useMemo(
    () => problems?.find((p) => p.id === selectedProblemId),
    [problems, selectedProblemId]
  );

  problemsRef.current = problems;

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
    patchUi({ saveStatus: "saving" });

    try {
      await dispatch(savePublicChallengeDraft({
        challengeId,
        problemId,
        userId,
        language: lang,
        sourceCode: codeToSave,
        registrationId,
      })).unwrap();

      lastSavedByKeyRef.current[saveKey] = normalizedCode;
      dispatch(updateProblemCode({ problemId, language: lang, sourceCode: codeToSave }));

      patchUi({ saveStatus: "saved" });
      setTimeout(() => patchUi({ saveStatus: "" }), 2000);
    } catch {
      patchUi({ saveStatus: "" });
    } finally {
      if (savingKeyRef.current === saveKey) {
        savingKeyRef.current = null;
      }
    }
  }, [challengeId, userId, registrationId, dispatch, shouldPersistDraft, selectedProblemId, isSolvedReadOnly, patchUi]);

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

  const submitGateFingerprint = useMemo(() => {
    if (!selectedProblemId || !selectedLanguage) return "";
    return `${selectedProblemId}:${selectedLanguage}:${normalizeDraftText(code)}`;
  }, [selectedProblemId, selectedLanguage, code]);

  const sampleRunPassedForCurrentCode =
    Boolean(submitGateFingerprint) &&
    submitRunGateFingerprint != null &&
    submitRunGateFingerprint === submitGateFingerprint;

  // Load saved layouts on mount
  useEffect(() => {
    const storedHorizontal = getStoredLayout(`coding-problems-horizontal-${challengeId}`);
    const storedVertical = getStoredLayout(`coding-problems-vertical-${challengeId}`);
    if (storedHorizontal) patchUi({ horizontalLayout: storedHorizontal });
    if (storedVertical) patchUi({ verticalLayout: storedVertical });
  }, [challengeId, patchUi]);

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
    patchUi({ horizontalLayout: layout });
    debouncedSaveHorizontal(layout);
  }, [debouncedSaveHorizontal, patchUi]);

  const handleVerticalLayoutChange = useCallback((layout) => {
    patchUi({ verticalLayout: layout });
    debouncedSaveVertical(layout);
  }, [debouncedSaveVertical, patchUi]);

  const handlePanelDrag = useCallback((isDragging) => {
    patchUi({ isResizing: isDragging });
  }, [patchUi]);

  // Load code template or draft when problem or language changes
  useEffect(() => {
    if (!selectedProblemId || !selectedLanguage || !userId) return;

    const fetchKey = `${challengeId}:${userId}:${selectedProblemId}:${selectedLanguage}`;
    latestDraftFetchTargetRef.current = fetchKey;
    const capturedFetchKey = fetchKey;
    const capturedProblemId = selectedProblemId;
    const capturedLanguage = selectedLanguage;

    // If problem already solved and not in edit mode, load latest AC submission and lock editor.
    if (isSolvedReadOnly && solvedSubmission) {
      const solvedLang = solvedSubmission.language || selectedLanguage;
      const solvedCode = solvedSubmission.source_code || "";
      if (solvedLang && solvedLang !== selectedLanguage) {
        patchWorkspace({ selectedLanguage: solvedLang });
      }
      patchUi({ code: solvedCode, isLoadingCode: false });
      return;
    }

    const cached = problemSubmissions?.[selectedProblemId];
    if (cached && cached.language === selectedLanguage && typeof cached.source_code === 'string') {
      patchUi({ isLoadingCode: true });
      if (shouldPersistDraft(cached.source_code)) {
        patchUi({ code: cached.source_code, isLoadingCode: false });
      } else if (currentTemplate) {
        patchUi({ code: currentTemplate, isLoadingCode: false });
      } else {
        patchUi({ code: "", isLoadingCode: false });
      }
      return;
    }

    patchUi({ isLoadingCode: true });

    // Fetch draft from backend (registrationId required for AUTO problem selection mode)
    dispatch(fetchPublicChallengeDraft({
      challengeId,
      problemId: selectedProblemId,
      userId,
      language: selectedLanguage,
      registrationId
    }))
      .unwrap()
      .then((draft) => {
        if (latestDraftFetchTargetRef.current !== capturedFetchKey) return;
        const problemForLoad = problemsRef.current?.find((p) => p.id === capturedProblemId) || null;

        const applyTemplateOrEmpty = () => {
          if (problemForLoad?.interface_spec) {
            patchUi({
              code: generateCodeTemplate(
                capturedLanguage,
                problemForLoad.interface_spec,
                problemForLoad.function_templates
              ),
            });
          } else {
            patchUi({ code: "" });
          }
        };

        if (draft && draft.source_code && draft.language === capturedLanguage) {
          const draftNorm = normalizeDraftText(draft.source_code);
          if (!draftNorm) {
            applyTemplateOrEmpty();
            return;
          }
          if (problemForLoad?.interface_spec) {
            const tplNorm = normalizeDraftText(
              generateCodeTemplate(
                capturedLanguage,
                problemForLoad.interface_spec,
                problemForLoad.function_templates
              )
            );
            if (tplNorm && draftNorm === tplNorm) {
              applyTemplateOrEmpty();
              return;
            }
          }
          patchUi({ code: draft.source_code });
        } else {
          applyTemplateOrEmpty();
        }
      })
      .catch(() => {
        if (latestDraftFetchTargetRef.current !== capturedFetchKey) return;
        const problemForLoad = problemsRef.current?.find((p) => p.id === capturedProblemId) || null;
        if (problemForLoad?.interface_spec) {
          patchUi({
            code: generateCodeTemplate(
              capturedLanguage,
              problemForLoad.interface_spec,
              problemForLoad.function_templates
            ),
          });
        }
      })
      .finally(() => {
        if (latestDraftFetchTargetRef.current === capturedFetchKey) {
          patchUi({ isLoadingCode: false });
        }
      });

  }, [
    selectedProblemId,
    selectedLanguage,
    userId,
    registrationId,
    challengeId,
    dispatch,
    selectedProblem,
    shouldPersistDraft,
    problemSubmissions,
    currentTemplate,
    isSolvedReadOnly,
    solvedSubmission,
    patchUi,
    patchWorkspace,
  ]);

  // Auto-save code draft when code changes
  const handleCodeChange = useCallback((newCode) => {
    if (isSolvedReadOnly) {
      return;
    }
    patchWorkspace({ submitRunGateFingerprint: null });
    patchUi({ code: newCode });
    if (selectedProblemId && selectedLanguage) {
      scheduleSaveDraft(newCode, selectedProblemId, selectedLanguage);
    }
  }, [selectedProblemId, selectedLanguage, scheduleSaveDraft, isSolvedReadOnly, patchUi, patchWorkspace]);

  // Handle language change
  const handleLanguageChange = useCallback(
    async (newLanguage) => {
      if (isSolvedReadOnly) return;
      if (selectedLanguage === newLanguage) return;
      await flushPendingSave();
      await doSaveDraft(code, selectedProblemId, selectedLanguage);
      patchWorkspace({
        submitRunGateFingerprint: null,
        selectedLanguage: newLanguage,
      });
      patchUi({ isLoadingCode: true, code: "" });
    },
    [selectedLanguage, code, selectedProblemId, flushPendingSave, doSaveDraft, isSolvedReadOnly, patchUi, patchWorkspace]
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

      patchWorkspace({
        submitRunGateFingerprint: null,
        sampleRunResult: null,
        submissionResult: null,
        sampleRunError: null,
        tabError: null,
      });
      patchUi({ isLoadingCode: true, code: "", isEditMode: false });
      onSelectProblem(problem.id);
    },
    [code, selectedProblemId, selectedLanguage, onSelectProblem, flushPendingSave, doSaveDraft, isSolvedReadOnly, patchUi, patchWorkspace]
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
      patchWorkspace({ tabError: "Please write some code before running" });
      return;
    }

    patchWorkspace({
      sampleRunError: null,
      submitRunGateFingerprint: null,
      sampleRunResult: null,
      submissionResult: null,
      tabError: null,
    });
    patchUi({ sampleRunLoading: true });
    bumpOpenResults();

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
          const wrapped = { status: runnerResult.status !== false, data: runnerResult.data };
          const fp = `${selectedProblemId}:${selectedLanguage}:${normalizeDraftText(code)}`;
          patchWorkspace({
            sampleRunResult: wrapped,
            submitRunGateFingerprint: isSampleRunAllTestsPassed(wrapped, referenceTestCases.length)
              ? fp
              : null,
          });
          bumpOpenResults();
        } else {
          patchWorkspace({
            submitRunGateFingerprint: null,
            sampleRunError: runnerResult?.message || "Sample run failed",
          });
          bumpOpenResults();
        }
      } else {
        patchWorkspace({
          submitRunGateFingerprint: null,
          sampleRunError: result.message || "Sample run failed",
        });
        bumpOpenResults();
      }
    } catch (err) {
      patchWorkspace({
        submitRunGateFingerprint: null,
        sampleRunError:
          typeof err === "string" ? err : err?.message || "Failed to run code. Please try again.",
      });
      bumpOpenResults();
    } finally {
      patchUi({ sampleRunLoading: false });
    }
  }, [
    selectedProblem,
    selectedProblemId,
    code,
    selectedLanguage,
    userId,
    registrationId,
    challengeId,
    dispatch,
    isSolvedReadOnly,
    referenceTestCases.length,
    patchUi,
    patchWorkspace,
    bumpOpenResults,
  ]);

  const handleSubmit = useCallback(async () => {
    if (isSolvedReadOnly) {
      return;
    }
    if (!code.trim()) {
      patchWorkspace({ tabError: "Please write some code before submitting." });
      return;
    }
    if (!sampleRunPassedForCurrentCode) {
      const msg =
        "Run all sample tests successfully (Run) before submitting. That keeps unnecessary load off the judging server.";
      patchWorkspace({ tabError: msg });
      toast.warning(msg, { position: "top-center", autoClose: 9000 });
      bumpOpenResults();
      return;
    }

    patchWorkspace({ tabError: null, submissionResult: null });
    patchUi({ submitting: true });
    bumpOpenResults();

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
        patchWorkspace({ submissionResult: result.data });
        patchUi({ submitted: true });
        bumpOpenResults();
        // If AC, exit edit mode (lock again on solved)
        const submitVerdict =
          result.data?.submission?.verdict ?? result.data?.execution_result?.verdict;
        const submitAc =
          submitVerdict != null &&
          ["AC", "ACCEPTED"].includes(String(submitVerdict).trim().toUpperCase());
        if (submitAc) {
          patchUi({ isEditMode: false });
          toast.success("All test cases passed.", { position: "top-center", autoClose: 7800 });
        }
        // Reset after 3 seconds
        setTimeout(() => {
          patchUi({ submitted: false });
        }, 3000);
      } else {
        patchWorkspace({ tabError: result.message || "Submission failed" });
        bumpOpenResults();
      }
    } catch (err) {
      patchWorkspace({ tabError: err?.message || "Failed to submit solution. Please try again." });
      bumpOpenResults();
    } finally {
      patchUi({ submitting: false });
    }
  }, [
    isSolvedReadOnly,
    code,
    sampleRunPassedForCurrentCode,
    dispatch,
    challengeId,
    selectedProblemId,
    userId,
    registrationId,
    accessCode,
    selectedLanguage,
    patchUi,
    patchWorkspace,
    bumpOpenResults,
  ]);

  const handleClearSampleRun = useCallback(() => {
    patchWorkspace({
      sampleRunResult: null,
      submitRunGateFingerprint: null,
      submissionResult: null,
      sampleRunError: null,
      tabError: null,
    });
  }, [patchWorkspace]);

  const confirmRefreshTemplate = useCallback(() => {
    if (!selectedProblem) {
      patchUi({ showTemplateResetModal: false });
      return;
    }
    const template = generateCodeTemplate(
      selectedLanguage,
      selectedProblem.interface_spec,
      selectedProblem.function_templates
    );
    patchWorkspace({
      submitRunGateFingerprint: null,
      sampleRunResult: null,
      sampleRunError: null,
      submissionResult: null,
      tabError: null,
    });
    patchUi({ code: template, showTemplateResetModal: false });
    bumpOpenResults();
  }, [selectedProblem, selectedLanguage, patchUi, patchWorkspace, bumpOpenResults]);

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

  // Render left panel content - Description with always-visible sidebar (responsive)
  const renderLeftPanelContent = () => {
    const sidebarWidth = isSidebarExpanded ? 450 : 220;

    return (
      <div className="h-full relative overflow-hidden flex flex-col lg:block">
        {/* Mobile: problem list as top bar / collapsible; desktop: sidebar */}
        {/* Problems Sidebar - on mobile full-width when expanded */}
        <div
          className={`lg:absolute top-0 left-0 h-full bg-white border-r border-gray-200 transition-all duration-300 ease-in-out z-10 shadow-lg shrink-0
            ${isSidebarExpanded ? 'w-full lg:w-[450px] max-h-[70vh] lg:max-h-none' : 'w-full lg:w-[220px] max-h-[52px] lg:max-h-none'}`}
          style={{ minHeight: '52px' }}
        >
          <div className="h-full flex flex-col min-h-0">
            {/* Sidebar Header */}
            <div
              className="shrink-0 px-4 py-3 border-b border-gray-200 bg-white cursor-pointer hover:bg-gray-50 transition-colors"
              onClick={() => patchUi({ isSidebarExpanded: !isSidebarExpanded })}
            >
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-900">
                  Problems ({problems.length})
                </h3>
                <button
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    patchUi({ isSidebarExpanded: !isSidebarExpanded });
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
                            className={`shrink-0 flex h-8 w-8 items-center justify-center rounded-md text-sm font-bold ${isCurrent
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

                        {/* Expanded View - Full Problem Details (desktop only; no description on mobile) */}
                        {isSidebarExpanded && (
                          <div className="hidden lg:block mt-3 pl-11 border-t border-gray-200 pt-3">
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

        {/* Description - below sidebar on mobile, beside sidebar on desktop */}
        <div
          className="flex-1 min-h-0 overflow-y-auto lg:absolute lg:top-0 lg:right-0 lg:bottom-0 transition-all duration-300 ease-in-out"
          style={isLg ? { left: `${sidebarWidth}px` } : undefined}
        >
          <div className="p-4 lg:p-5 xl:p-6 2xl:p-7">
            <ProblemDescription
              problem={selectedProblem}
              loading={false}
              onBack={undefined}
            />
          </div>
        </div>
      </div>
    );
  };

  // Right panel content - Editor (responsive: compact toolbar and guaranteed min-height on mobile)
  const rightPanelContent = (
    <div className="h-full min-h-0 flex flex-col bg-gray-900">
      <div className="shrink-0 bg-gray-800 border-b border-gray-700 px-2 sm:px-3 lg:px-4 py-2 sm:py-2.5">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 sm:gap-3">
          <div className="flex items-center min-w-0">
            <select
              value={selectedLanguage}
              onChange={(e) => handleLanguageChange(e.target.value)}
              disabled={isLoadingCode || isSolvedReadOnly}
              className="w-full max-w-[120px] sm:max-w-none min-h-[40px] sm:min-h-0 px-2 sm:px-3 py-2 sm:py-1.5 text-xs sm:text-sm bg-gray-700 text-white rounded border border-gray-600 focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:opacity-50"
            >
              {languages.map((lang) => (
                <option key={lang.value} value={lang.value}>
                  {lang.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-center shrink-0">
            <img src="/logos/10k_logo_white.webp" alt="10000Coders" className="h-6 sm:h-7 lg:h-8 object-contain" />
          </div>

          <div className="flex items-center justify-end gap-1.5 sm:gap-2 min-w-0">
            {Boolean(selectedProblem?.is_solved && solvedSubmission) && isSolvedReadOnly && (
              <button
                type="button"
                onClick={() => {
                  patchWorkspace({ submitRunGateFingerprint: null });
                  patchUi({ isEditMode: true });
                }}
                className="shrink-0 min-h-[40px] sm:min-h-0 inline-flex items-center justify-center px-2.5 sm:px-4 py-2 sm:py-1.5 text-xs sm:text-sm font-medium text-white bg-gray-600 hover:bg-gray-500 rounded transition-colors"
                title="Edit solved submission"
              >
                Edit
              </button>
            )}
            <button
              type="button"
              onClick={() => patchUi({ showTemplateResetModal: true })}
              disabled={isSolvedReadOnly || isLoadingCode || !selectedProblem}
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded text-gray-300 transition-colors hover:bg-gray-700 hover:text-white disabled:cursor-not-allowed disabled:opacity-40 sm:h-8 sm:w-8"
              title="Refresh starter template"
              aria-label="Refresh starter template"
            >
              <FaSyncAlt className="h-3.5 w-3.5 sm:h-4 sm:w-4" aria-hidden />
            </button>
            <button
              onClick={handleRun}
              disabled={isSolvedReadOnly || sampleRunLoading || submitting || !code.trim()}
              className="shrink-0 min-h-[40px] sm:min-h-0 min-w-[72px] sm:min-w-[92px] inline-flex items-center justify-center px-2.5 sm:px-4 py-2 sm:py-1.5 text-xs sm:text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 disabled:bg-orange-600/50 disabled:cursor-not-allowed rounded transition-colors"
              title="Run code with sample test cases"
            >
              <ButtonContent loading={sampleRunLoading} label="Run" />
            </button>
            <button
              onClick={handleSubmit}
              disabled={
                isSolvedReadOnly ||
                submitting ||
                sampleRunLoading ||
                !code.trim() ||
                !selectedProblem ||
                !sampleRunPassedForCurrentCode
              }
              className="shrink-0 min-h-[40px] sm:min-h-0 min-w-[76px] sm:min-w-[96px] inline-flex items-center justify-center px-2.5 sm:px-4 py-2 sm:py-1.5 text-xs sm:text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:bg-red-600/50 disabled:cursor-not-allowed rounded transition-colors"
              title={
                !sampleRunPassedForCurrentCode && !isSolvedReadOnly
                  ? "Run all sample tests successfully first, then submit"
                  : "Submit solution for evaluation"
              }
            >
              <ButtonContent loading={submitting} label="Submit" />
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-[180px] sm:min-h-[260px] overflow-hidden relative">
        {isLoadingCode ? (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
              <p className="text-sm text-gray-400">Loading code...</p>
            </div>
          </div>
        ) : (
          <MonacoEditor
            key={`${challengeId}-${selectedProblemId}-${selectedLanguage}`}
            language={selectedLanguage}
            value={code ?? ""}
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
      error={sampleRunError || tabError}
      onClearSampleRun={handleClearSampleRun}
      selectedTestCase={selectedTestCase}
      setSelectedTestCase={setSelectedTestCase}
      referenceTestCases={referenceTestCases}
    />
  );

  const openResultsOnMobile = !!(
    sampleRunResult ||
    submissionResult ||
    sampleRunLoading ||
    submitting ||
    sampleRunError ||
    tabError
  );

  return (
    <>
      <ChallengeWorkspaceLayout
        challengeId={challengeId}
        timeLeft={timeLeft}
        leftPanelContent={renderLeftPanelContent()}
        rightPanelContent={rightPanelContent}
        resultsPanelContent={resultsPanelContent}
        onHorizontalDrag={handlePanelDrag}
        onVerticalDrag={handlePanelDrag}
        openResultsOnMobile={openResultsOnMobile}
        openResultsTrigger={openResultsTrigger}
      />
      {showTemplateResetModal ? (
        <div className="fixed inset-0 z-[10060] flex items-center justify-center bg-black/50 px-4">
          <div
            className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-5 shadow-xl sm:p-6"
            role="dialog"
            aria-modal="true"
            aria-labelledby="template-reset-title"
          >
            <h3 id="template-reset-title" className="text-lg font-semibold text-gray-900">
              Refresh starter template?
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-gray-600">
              Your current code in the editor will be replaced by the default template for this problem and language.
              Run sample tests again before submitting.
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => patchUi({ showTemplateResetModal: false })}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmRefreshTemplate}
                className="inline-flex items-center gap-2 rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white shadow transition-colors hover:bg-orange-700"
              >
                <FaSyncAlt className="h-4 w-4" aria-hidden />
                Refresh template
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
