'use client';
import React, { useState, useEffect, Fragment } from 'react';
import { FaSpinner } from 'react-icons/fa';

// Helper function to format JSON with compact arrays
const formatJSON = (jsonString) => {
  try {
    const obj = typeof jsonString === 'string' ? JSON.parse(jsonString) : jsonString;

    // First stringify with formatting
    let formatted = JSON.stringify(obj, null, 2);

    // Replace multi-line arrays with single-line arrays
    formatted = formatted.replace(/\[\s*\n\s*(.*?)\n\s*\]/gs, (match) => {
      // Extract array content and put on one line
      const content = match
        .replace(/\[\s*\n\s*/, '[')
        .replace(/\n\s*\]/, ']')
        .replace(/,\s*\n\s*/g, ', ');
      return content;
    });

    return formatted;
  } catch {
    return String(jsonString);
  }
};

/** Normalize error payload to a single string (API may return string, array, or object). */
const errorToDisplayString = (value) => {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value.map(errorToDisplayString).filter(Boolean).join('\n');
  if (typeof value === 'object') {
    if (value.detail) return errorToDisplayString(value.detail);
    if (value.message) return errorToDisplayString(value.message);
    if (value.error) return errorToDisplayString(value.error);
    return JSON.stringify(value);
  }
  return String(value);
};

/** Backend may send AC / Accepted / mixed case. */
const verdictIsAccepted = (verdict) => {
  if (verdict == null || verdict === "") return false;
  const s = String(verdict).trim().toUpperCase();
  return s === "AC" || s === "ACCEPTED";
};

const formatErrorMessage = (error) => {
  const str = errorToDisplayString(error);
  if (!str) return 'Unknown error';
  let formatted = str
    .replace(/^Error:\s*/i, '')
    .replace(/^RuntimeError:\s*/i, '')
    .replace(/^Exception:\s*/i, '')
    .replace(/File "<string>", line \d+/g, '')
    .replace(/^\s+at\s+/gm, 'at ');
  return formatted.trim() || str;
};

function formatSubmissionValue(value) {
  if (value === undefined || value === null || value === "") return "—";
  if (typeof value === "object") {
    try {
      return formatJSON(JSON.stringify(value));
    } catch {
      return String(value);
    }
  }
  if (typeof value === "string") {
    try {
      return formatJSON(value);
    } catch {
      return value;
    }
  }
  return String(value);
}

function submissionCaseStatusLabel(fc) {
  if (fc.reason && String(fc.reason).trim()) return String(fc.reason).trim();
  const s = String(fc.status || '').toUpperCase();
  if (s === 'WA') return 'Wrong Answer';
  if (s === 'TLE') return 'Time Limit Exceeded';
  if (s === 'MLE') return 'Memory Limit Exceeded';
  if (s === 'RE') return 'Runtime Error';
  if (s === 'CE') return 'Compilation Error';
  return fc.status ? String(fc.status) : 'Failed';
}

/** Per-case detail from sync_runner / public submit — matches test-center submission card (rose panel, INPUT, Expected vs Your output). */
function SubmissionFailedCasesList({ failedCases }) {
  if (!Array.isArray(failedCases) || failedCases.length === 0) return null;

  return (
    <div className="rounded-lg border border-red-200/90 bg-rose-50/95 p-3 text-left shadow-sm sm:p-4">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-red-900">What failed</p>
      <div className="space-y-3">
        {failedCases.map((fc, index) => (
          <div
            key={`${fc.group}-${fc.seq_no}-${index}`}
            className="rounded-lg border border-red-200 bg-white p-3 sm:p-4"
          >
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-red-100 pb-2">
              <span className="rounded-md bg-red-100 px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide text-red-900">
                {String(fc.group || 'case').toUpperCase()} #{fc.seq_no ?? index + 1}
              </span>
              <span className="text-sm font-medium text-red-600">{submissionCaseStatusLabel(fc)}</span>
            </div>

            {fc.inputs_json && typeof fc.inputs_json === 'object' && !Array.isArray(fc.inputs_json) ? (
              <div className="mb-3">
                <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-gray-500">Input</p>
                <div className="space-y-1 rounded-md border border-gray-200 bg-gray-50 p-2.5">
                  {Object.entries(fc.inputs_json).map(([key, value]) => (
                    <div key={key} className="flex items-start gap-2 text-xs">
                      <span className="shrink-0 font-mono font-semibold text-gray-700">{key} =</span>
                      <pre className="min-w-0 flex-1 whitespace-pre-wrap break-words font-mono text-gray-900">
                        {formatSubmissionValue(value)}
                      </pre>
                    </div>
                  ))}
                </div>
              </div>
            ) : fc.input_text || fc.input_preview ? (
              <div className="mb-3">
                <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-gray-500">Input</p>
                <pre className="rounded-md border border-gray-200 bg-gray-50 p-2.5 text-xs font-mono text-gray-900 whitespace-pre-wrap break-words">
                  {fc.input_text || fc.input_preview}
                </pre>
              </div>
            ) : null}

            {fc.status === 'WA' ? (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
                <div>
                  <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-gray-600">Expected</p>
                  <pre className="max-h-48 min-h-[2.5rem] overflow-y-auto rounded-md border border-gray-200 bg-white p-2.5 text-xs font-mono text-gray-900 whitespace-pre-wrap break-words sm:max-h-52">
                    {formatSubmissionValue(fc.expected_preview ?? fc.expected_output)}
                  </pre>
                </div>
                <div>
                  <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-gray-600">Your output</p>
                  <pre className="max-h-48 min-h-[2.5rem] overflow-y-auto rounded-md border border-red-300 bg-red-50 p-2.5 text-xs font-mono text-red-900 whitespace-pre-wrap break-words sm:max-h-52">
                    {formatSubmissionValue(fc.actual_preview ?? fc.actual_output)}
                  </pre>
                </div>
              </div>
            ) : (
              <div className="rounded-md border border-red-200 bg-red-50/80 p-2.5">
                <pre className="text-xs font-mono text-red-800 whitespace-pre-wrap break-words">
                  {formatErrorMessage(fc.error_message || fc.stderr || 'No further detail')}
                </pre>
              </div>
            )}

            {fc.user_logs?.trim() ? (
              <div className="mt-3 rounded-md border border-blue-200 bg-blue-50/90 p-2.5">
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-blue-900">Console output</p>
                <pre className="text-xs font-mono text-blue-900 whitespace-pre-wrap break-words">{fc.user_logs.trim()}</pre>
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}

const TestResults = ({
  sampleRunResult,
  submissionResult,
  loading,
  error,
  onClearSampleRun,
  selectedTestCase,
  setSelectedTestCase,
  referenceTestCases = []
}) => {
  // Submission Analysis
  const submissionData = submissionResult?.submission || {};
  const executionResult = submissionResult?.execution_result || {};
  const isSubmission = !!submissionResult;

  // Extract test data if available
  const tests = isSubmission
    ? [] // Submissions usually don't return per-test details in the same format, or we might need to parse them if available
    : (sampleRunResult?.data?.tests || []);

  const summary = isSubmission
    ? executionResult
    : (sampleRunResult?.data?.summary || {});

  // Unified status checks
  const hasValidResults = (sampleRunResult?.status && tests.length > 0) || (isSubmission && submissionData);

  const testsLength = tests.length;
  // Backend: summary.passed = passed count, summary.tests_executed = number run; execution_result has total_tests, passed_tests
  const testsExecuted = summary.tests_executed ?? summary.total_tests ?? tests.length ?? 0;
  const passedCount = summary.passed ?? summary.passed_tests ?? (tests.filter(t => t.status === 'AC').length) ?? 0;
  const totalTests = summary.total_tests ?? summary.total_tests_available ?? testsExecuted ?? tests.length ?? 0;
  const failedCount = Math.max(0, testsExecuted - passedCount);
  const remainingCount = Math.max(0, totalTests - testsExecuted);

  const allPassed = isSubmission
    ? verdictIsAccepted(submissionData.verdict ?? executionResult.verdict)
    : (testsExecuted > 0 && passedCount === testsExecuted);

  const hasReferenceTests = Array.isArray(referenceTestCases) && referenceTestCases.length > 0;
  const hasRunAttempt = Boolean(sampleRunResult) || Boolean(submissionResult) || Boolean(error) || Boolean(loading?.sampleRun) || Boolean(loading?.submit);
  const showReferenceTests = hasReferenceTests && !hasRunAttempt;

  // Determine header title
  const headerTitle = isSubmission ? "Submission Results" : "Sample Run Results";

  const formatReferenceValue = (value) => {
    if (value === null || value === undefined || value === '') {
      return 'No data';
    }

    if (typeof value === 'string') {
      return formatJSON(value);
    }

    try {
      return formatJSON(JSON.stringify(value));
    } catch {
      return String(value);
    }
  };

  const parseReferencePayload = (value) => {
    if (typeof value !== 'string') return value;
    const trimmed = value.trim();
    if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
      try {
        return JSON.parse(trimmed);
      } catch {
        return value;
      }
    }
    return value;
  };

  const renderReferenceValue = (value) => {
    const parsed = parseReferencePayload(value);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return (
        <div className="space-y-1">
          {Object.entries(parsed).map(([key, val]) => (
            <div key={key} className="flex items-start gap-2">
              <span className="font-mono text-xs font-semibold text-gray-700">{key} =</span>
              <pre className="font-mono text-xs text-gray-900 flex-1 whitespace-pre-wrap break-words">
                {formatReferenceValue(val)}
              </pre>
            </div>
          ))}
        </div>
      );
    }

    return (
      <pre className="text-xs font-mono bg-gray-50 border border-gray-200 rounded-md p-3 whitespace-pre-wrap break-words">
        {formatReferenceValue(parsed)}
      </pre>
    );
  };


  useEffect(() => {
    if (showReferenceTests) {
      const totalRefs = referenceTestCases.length;
      if (totalRefs === 0) {
        if (selectedTestCase !== 0) setSelectedTestCase(0);
        return;
      }
      if (selectedTestCase < 0 || selectedTestCase >= totalRefs) {
        setSelectedTestCase(0);
      }
      return;
    }

    if (!hasValidResults) {
      if (selectedTestCase !== 0) setSelectedTestCase(0);
      return;
    }

    if (testsLength > 0 && (selectedTestCase < 0 || selectedTestCase >= testsLength)) {
      setSelectedTestCase(0);
    }
  }, [
    showReferenceTests,
    referenceTestCases.length,
    hasValidResults,
    testsLength,
    selectedTestCase,
    setSelectedTestCase
  ]);

  return (
    <div className="h-full min-h-0 bg-white border-t border-gray-200 flex flex-col overflow-hidden">
      {/* Header - sticky so content below can scroll to bottom */}
      <div className="shrink-0 px-3 sm:px-4 py-2.5 sm:py-3 border-b border-gray-200 bg-white">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <svg className={`w-5 h-5 shrink-0 ${isSubmission ? 'text-blue-600' : 'text-orange-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="text-sm font-medium text-gray-900 truncate">{headerTitle}</h3>
          </div>
          {showReferenceTests && (
            <p className="text-xs text-gray-500 italic hidden sm:block">See reference test cases below for expected format</p>
          )}
          {(sampleRunResult || submissionResult) && (
            <button
              onClick={onClearSampleRun}
              className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 transition-colors min-h-[36px] sm:min-h-0 touch-manipulation"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Clear
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-3 sm:p-4">
        {showReferenceTests && (
          <div className="mb-6 space-y-4">
            <div className="flex items-center justify-between mb-1">
              <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Reference Test Cases</h4>
            </div>
            <div className="flex flex-wrap gap-2">
              {referenceTestCases.map((_, index) => (
                <button
                  key={`reference-tab-${index}`}
                  onClick={() => setSelectedTestCase(index)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${selectedTestCase === index
                    ? 'bg-orange-600 text-white shadow-md'
                    : 'bg-orange-50 text-orange-700 border border-orange-200 hover:bg-orange-100'
                    }`}
                >
                  Test Case {index + 1}
                </button>
              ))}
            </div>

            {referenceTestCases[selectedTestCase] && (
              <div className="space-y-4">
                <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-semibold text-gray-800">Input</p>
                  </div>
                  {renderReferenceValue(referenceTestCases[selectedTestCase].input)}
                </div>
                <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                  <p className="text-sm font-semibold text-gray-800 mb-2">Expected Output</p>
                  {renderReferenceValue(referenceTestCases[selectedTestCase].output)}
                </div>
              </div>
            )}
          </div>
        )}

        {!showReferenceTests && (
          <>
            {/* Loading State */}
            {(loading?.sampleRun || loading?.submit) && (
              <div className="py-16 text-center">
                <FaSpinner className="animate-spin text-4xl text-orange-600 mx-auto mb-4" />
                <p className="text-sm text-gray-600">
                  {loading.submit ? "Submitting Solution..." : "Running Test Cases..."}
                </p>
                <p className="text-xs text-gray-500 mt-1">Evaluating your code...</p>
              </div>
            )}

            {(loading?.sampleRun || loading?.submit) && !hasValidResults ? null : (
              <Fragment>
                {/* System notice (run returned but status/message indicates issue) */}
                {sampleRunResult && !sampleRunResult.status && sampleRunResult.message && (
                  <div className="bg-yellow-50 border-l-4 border-yellow-500 rounded-r-lg p-3 sm:p-4 mb-4">
                    <div className="flex items-start gap-3">
                      <div className="shrink-0">
                        <svg className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-semibold text-yellow-800 mb-1">System Notice</h3>
                        <p className="text-xs sm:text-sm text-yellow-700 whitespace-pre-wrap break-words">
                          {errorToDisplayString(sampleRunResult.message)}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={onClearSampleRun}
                        className="shrink-0 text-yellow-500 hover:text-yellow-700 transition-colors p-1 touch-manipulation"
                        aria-label="Clear"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>
                )}

                {/* Execution / API error (run or submit failed) */}
                {error && (
                  <div className="bg-red-50 border-l-4 border-red-500 rounded-r-lg p-3 sm:p-4 mb-4">
                    <div className="flex items-start gap-3">
                      <div className="shrink-0">
                        <svg className="w-5 h-5 sm:w-6 sm:h-6 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-semibold text-red-800 mb-1">Execution Error</h3>
                        <p className="text-xs sm:text-sm text-red-700 whitespace-pre-wrap break-words">
                          {formatErrorMessage(error)}
                        </p>
                      </div>
                      {onClearSampleRun && (
                        <button
                          type="button"
                          onClick={onClearSampleRun}
                          className="shrink-0 text-red-400 hover:text-red-600 transition-colors p-1 touch-manipulation"
                          aria-label="Clear"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Submission results — compact test-center style: stats, WHAT FAILED, ERROR / LOGS */}
                {isSubmission && submissionData && (() => {
                  const verdict = submissionData.verdict ?? executionResult.verdict;
                  const accepted = verdictIsAccepted(verdict);
                  const label = accepted
                    ? 'Accepted'
                    : verdict === 'WA'
                      ? 'Wrong Answer'
                      : verdict === 'TLE'
                        ? 'Time Limit Exceeded'
                        : verdict === 'MLE'
                          ? 'Memory Limit Exceeded'
                          : verdict === 'RE'
                            ? 'Runtime Error'
                            : verdict === 'CE'
                              ? 'Compilation Error'
                              : 'Rejected';

                  const subPassed = Number(passedCount) || 0;
                  const subFailed = Number(failedCount) || 0;
                  const subPending = Number(remainingCount) || 0;
                  const subTotal = Number(totalTests) || 0;

                  const logFromApi =
                    submissionData.error_message ||
                    submissionData.compile_output ||
                    submissionData.stderr ||
                    executionResult.error_message ||
                    executionResult.stderr ||
                    executionResult.stdout;
                  let logText = logFromApi != null ? errorToDisplayString(logFromApi).trim() : '';
                  if (
                    !logText &&
                    verdict === 'WA' &&
                    Array.isArray(submissionResult?.failed_cases) &&
                    submissionResult.failed_cases.length > 0
                  ) {
                    const fc = submissionResult.failed_cases[0];
                    const yo = formatSubmissionValue(fc.actual_preview ?? fc.actual_output);
                    logText = `Wrong Answer: Your output doesn't match the expected result.\nYour output: ${yo}`;
                  }

                  const hasFailedCases =
                    Array.isArray(submissionResult?.failed_cases) && submissionResult.failed_cases.length > 0;
                  // RE/CE/TLE/MLE: traceback / compile text is already shown inside "What failed" cards — avoid duplicating in Error / Logs.
                  const showGlobalErrorLogs =
                    Boolean(logText) && !(hasFailedCases && verdict !== 'WA');

                  const shellClass = accepted
                    ? 'space-y-4 rounded-xl border border-green-200 bg-green-50/90 p-3 sm:p-4'
                    : 'space-y-4 rounded-xl border border-red-200 bg-rose-50/90 p-3 sm:p-4';

                  return (
                    <div className={shellClass}>
                      <div
                        className={`flex flex-wrap items-stretch justify-between gap-3 border-b pb-3 text-left ${
                          accepted ? 'border-green-200' : 'border-red-200/80'
                        }`}
                      >
                        <div className="flex min-w-0 items-start gap-3">
                          {accepted ? (
                            <svg className="h-8 w-8 shrink-0 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                              <path
                                fillRule="evenodd"
                                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                clipRule="evenodd"
                              />
                            </svg>
                          ) : (
                            <svg className="h-8 w-8 shrink-0 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                              <path
                                fillRule="evenodd"
                                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                                clipRule="evenodd"
                              />
                            </svg>
                          )}
                          <div className="min-w-0">
                            <p className={`text-base font-bold sm:text-lg ${accepted ? 'text-green-900' : 'text-red-900'}`}>
                              {label}
                            </p>
                            <p className={`mt-0.5 text-xs sm:text-sm ${accepted ? 'text-green-800' : 'text-red-800/90'}`}>
                              {accepted
                                ? 'All hidden test cases passed — this problem is complete.'
                                : 'Review the failed case(s) and logs below.'}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
                        <div className="rounded-lg border border-gray-200 bg-white p-2.5 shadow-sm sm:p-3">
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500 sm:text-xs">Passed</p>
                          <p className="text-lg font-bold text-green-700 sm:text-xl">{subPassed}</p>
                        </div>
                        <div className="rounded-lg border border-gray-200 bg-white p-2.5 shadow-sm sm:p-3">
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500 sm:text-xs">Pending</p>
                          <p className="text-lg font-bold text-gray-900 sm:text-xl">{subPending}</p>
                        </div>
                        <div className="rounded-lg border border-gray-200 bg-white p-2.5 shadow-sm sm:p-3">
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500 sm:text-xs">Failed</p>
                          <p className="text-lg font-bold text-red-600 sm:text-xl">{subFailed}</p>
                        </div>
                        <div className="rounded-lg border border-gray-200 bg-white p-2.5 shadow-sm sm:p-3">
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500 sm:text-xs">Total</p>
                          <p className="text-lg font-bold text-gray-900 sm:text-xl">{subTotal}</p>
                        </div>
                      </div>

                      {submissionData.points_earned != null && submissionData.points_earned !== '' ? (
                        <div className="rounded-lg border border-gray-200 bg-white/95 px-3 py-2 text-center text-sm text-gray-800">
                          <span className="font-semibold text-gray-900">Points earned:</span> {submissionData.points_earned}
                        </div>
                      ) : null}

                      {!accepted && <SubmissionFailedCasesList failedCases={submissionResult?.failed_cases} />}

                      {showGlobalErrorLogs ? (
                        <div className="text-left">
                          <div className="overflow-hidden rounded-lg border-2 border-red-300 bg-red-50 shadow-sm">
                            <div className="flex items-center gap-2 border-b-2 border-red-300 bg-red-100 px-3 py-2">
                              <svg className="h-4 w-4 shrink-0 text-red-700" fill="currentColor" viewBox="0 0 20 20">
                                <path
                                  fillRule="evenodd"
                                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                                  clipRule="evenodd"
                                />
                              </svg>
                              <span className="text-xs font-bold uppercase tracking-wide text-red-900">Error / Logs</span>
                            </div>
                            <div className="max-h-52 overflow-y-auto bg-red-50/90 p-3 sm:max-h-64">
                              <pre className="break-words font-mono text-xs whitespace-pre-wrap text-red-900">
                                {formatErrorMessage(logText)}
                              </pre>
                            </div>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  );
                })()}

                {/* Sample Run Results / Test Case Details (Only if NOT a submission or if needed for debugging) */}
                {hasValidResults && !isSubmission && !loading?.sampleRun && tests[selectedTestCase] && (() => {
                  const selectedTest = tests[selectedTestCase];
                  const isErrorTest = selectedTest.status !== 'WA' && selectedTest.status !== 'AC';
                  return (
                  <div className="space-y-4">
                    {/* Test Case Tabs - scroll on mobile, touch-friendly */}
                    {tests.length > 0 && (
                      <div className="flex gap-1.5 sm:gap-2 overflow-x-auto pb-1 scrollbar-hide -mx-1 px-1">
                        {tests.map((test, index) => (
                          <button
                            key={index}
                            onClick={() => setSelectedTestCase(index)}
                            className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-2 rounded-lg transition-all shrink-0 text-xs sm:text-sm min-h-[40px] touch-manipulation ${selectedTestCase === index
                              ? test.status === 'AC'
                                ? 'bg-green-600 text-white shadow-md'
                                : 'bg-red-600 text-white shadow-md'
                              : test.status === 'AC'
                                ? 'bg-green-50 text-green-700 border border-green-200 hover:bg-green-100'
                                : 'bg-red-50 text-red-700 border border-red-200 hover:bg-red-100'
                              }`}
                          >
                            {test.status === 'AC' ? (
                              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                              </svg>
                            ) : (
                              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                              </svg>
                            )}
                            <span className="font-medium">Test {test.seq_no || (index + 1)}</span>
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Selected Test Case Details: for error tests show only the error block; for WA/AC show input + output */}
                    {(() => {
                      const test = tests[selectedTestCase];
                      if (!test) return null;
                      const isErr = test.status !== 'WA' && test.status !== 'AC';
                      if (isErr) {
                        /* Error only: no summary, no input, no tabs — just the error message */
                        return (
                          <div className="bg-red-50 border border-red-300 rounded-lg p-3 sm:p-4">
                            <div className="flex items-start gap-3">
                              <div className="shrink-0">
                                {test.status === 'TLE' ? (
                                  <svg className="w-5 h-5 sm:w-6 sm:h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                ) : test.status === 'MLE' ? (
                                  <svg className="w-5 h-5 sm:w-6 sm:h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                                  </svg>
                                ) : test.status === 'CE' ? (
                                  <svg className="w-5 h-5 sm:w-6 sm:h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                                  </svg>
                                ) : (
                                  <svg className="w-5 h-5 sm:w-6 sm:h-6 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                  </svg>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="text-xs sm:text-sm font-semibold text-red-800 mb-1.5 sm:mb-2">
                                  {test.status === 'RE' ? 'Runtime Error' :
                                    test.status === 'TLE' ? 'Time Limit Exceeded' :
                                      test.status === 'MLE' ? 'Memory Limit Exceeded' :
                                        test.status === 'CE' ? 'Compilation Error' : 'Error'}
                                </div>
                                {(test.error_message && errorToDisplayString(test.error_message).trim()) ? (
                                  <pre className="text-xs text-red-700 whitespace-pre-wrap font-mono bg-red-100/50 p-2 rounded border border-red-200 overflow-x-auto">
                                    {formatErrorMessage(test.error_message)}
                                  </pre>
                                ) : (
                                  <p className="text-xs text-red-600">No additional details.</p>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      }
                      return (
                        <div className="space-y-3">
                          {/* Input - only for WA/AC */}
                          <div className="bg-gray-50 border border-gray-200 rounded-lg overflow-hidden">
                            <div className="bg-gray-100 px-3 py-2 border-b border-gray-200 flex items-center gap-2">
                              <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                              <span className="text-xs font-semibold text-gray-700 uppercase">Input</span>
                            </div>
                            <div className="p-3">
                              {test.inputs_json && typeof test.inputs_json === 'object' && !Array.isArray(test.inputs_json) ? (
                                <div className="space-y-1">
                                  {Object.entries(test.inputs_json).map(([key, value]) => (
                                    <div key={key} className="flex items-start gap-2">
                                      <span className="font-mono text-xs font-semibold text-gray-700">{key} =</span>
                                      <pre className="font-mono text-xs text-gray-900 flex-1">
                                        {typeof value === 'object' ? formatJSON(JSON.stringify(value)) : String(value)}
                                      </pre>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <pre className="font-mono text-xs text-gray-900 whitespace-pre-wrap">
                                  {test.inputs_json ? formatJSON(JSON.stringify(test.inputs_json)) : test.input_text || 'No input'}
                                </pre>
                              )}
                            </div>
                          </div>

                          {/* Console Output */}
                          {test.user_logs && test.user_logs.trim() && (
                            <div className="bg-blue-50 border border-blue-200 rounded-lg overflow-hidden">
                              <div className="bg-blue-100 px-3 py-2 border-b border-blue-200 flex items-center gap-2">
                                <svg className="w-4 h-4 text-blue-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                                </svg>
                                <span className="text-xs font-semibold text-blue-900 uppercase">Console Output</span>
                              </div>
                              <div className="p-3">
                                <pre className="font-mono text-xs text-blue-900 whitespace-pre-wrap">
                                  {test.user_logs.trim()}
                                </pre>
                              </div>
                            </div>
                          )}

                          {/* Output Comparison - for WA/AC */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div className={`border rounded-lg overflow-hidden ${test.status === 'AC' ? 'border-green-300 bg-green-50' : 'border-gray-300 bg-white'
                                }`}>
                                <div className={`px-3 py-2 border-b flex items-center gap-2 ${test.status === 'AC' ? 'bg-green-100 border-green-300' : 'bg-gray-50 border-gray-200'
                                  }`}>
                                  <svg className={`w-4 h-4 ${test.status === 'AC' ? 'text-green-700' : 'text-gray-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                  </svg>
                                  <span className={`text-xs font-semibold uppercase ${test.status === 'AC' ? 'text-green-900' : 'text-gray-700'
                                    }`}>
                                    Your Output
                                  </span>
                                </div>
                                <div className="p-3">
                                  <pre className={`font-mono text-xs whitespace-pre-wrap ${test.status === 'AC' ? 'text-green-900' : 'text-gray-900'
                                    }`}>
                                    {formatJSON(test.actual_preview || test.actual_output || 'undefined')}
                                  </pre>
                                </div>
                              </div>

                              <div className="bg-white border border-gray-300 rounded-lg overflow-hidden">
                                <div className="bg-gray-50 px-3 py-2 border-b border-gray-200 flex items-center gap-2">
                                  <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                  <span className="text-xs font-semibold text-gray-700 uppercase">Expected</span>
                                </div>
                                <div className="p-3">
                                  <pre className="font-mono text-xs text-gray-900 whitespace-pre-wrap">
                                    {formatJSON(test.expected_preview || 'No expected output')}
                                  </pre>
                                </div>
                              </div>
                            </div>
                        </div>
                      );
                    })()}
                  </div>
                  );
                })()}

                {/* Empty State */}
                {!sampleRunResult && !loading?.sampleRun && !error && !isSubmission && (
                  <div className="text-center text-gray-500 py-12">
                    <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                      <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <p className="text-sm font-medium text-gray-600 mb-1">No Results Yet</p>
                    <p className="text-xs text-gray-500">Run sample tests to see results here</p>
                  </div>
                )}
              </Fragment>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default TestResults;
