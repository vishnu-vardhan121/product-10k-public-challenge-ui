'use client';
import React, { useState, useEffect } from 'react';
import { FaSpinner } from 'react-icons/fa';

// Helper function to format JSON with compact arrays
const formatJSON = (jsonString) => {
  try {
    const obj = typeof jsonString === 'string' ? JSON.parse(jsonString) : jsonString;
    let formatted = JSON.stringify(obj, null, 2);
    formatted = formatted.replace(/\[\s*\n\s*(.*?)\n\s*\]/gs, (match) => {
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

// Format input as key = value pairs (e.g., "n = 2")
const formatInputValue = (value) => {
  if (value === null || value === undefined || value === '') {
    return 'No data';
  }

  let parsed;
  if (typeof value === 'string') {
    try {
      parsed = JSON.parse(value);
    } catch {
      // If not valid JSON, return as-is
      return value;
    }
  } else {
    parsed = value;
  }

  // If it's an object, format as key = value pairs
  if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
    const entries = Object.entries(parsed);
    return entries.map(([key, val]) => {
      if (typeof val === 'string') {
        return `${key} = "${val}"`;
      }
      return `${key} = ${val}`;
    }).join('\n');
  }

  // For arrays or other types, return formatted JSON
  try {
    return formatJSON(JSON.stringify(parsed));
  } catch {
    return String(parsed);
  }
};

const formatReferenceValue = (value) => {
  if (value === null || value === undefined || value === '') {
    return 'No data';
  }

  // For inputs, use the simple key=value format
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
        const entries = Object.entries(parsed);
        return entries.map(([key, val]) => {
          if (typeof val === 'string') {
            return `${key} = "${val}"`;
          }
          return `${key} = ${val}`;
        }).join('\n');
      }
      return formatJSON(JSON.stringify(parsed));
    } catch {
      return value;
    }
  }

  if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
    const entries = Object.entries(value);
    return entries.map(([key, val]) => {
      if (typeof val === 'string') {
        return `${key} = "${val}"`;
      }
      return `${key} = ${val}`;
    }).join('\n');
  }

  try {
    return formatJSON(JSON.stringify(value));
  } catch {
    return String(value);
  }
};

const TestResults = ({
  sampleRunResult,
  loading,
  error,
  onClearSampleRun,
  selectedTestCase,
  setSelectedTestCase,
  referenceTestCases = []
}) => {
  const tests = sampleRunResult?.data?.tests || [];
  const summary = sampleRunResult?.data?.summary || {};
  const hasValidResults = sampleRunResult?.status && tests.length > 0;
  const testsLength = tests.length;

  const totalAvailable = summary.total_tests_available || summary.total_tests || 0;
  const testsExecuted = summary.tests_executed || tests.length || 0;
  const allPassed = summary.passed === testsExecuted;
  const hasReferenceTests = Array.isArray(referenceTestCases) && referenceTestCases.length > 0;
  const hasRunAttempt = Boolean(sampleRunResult) || Boolean(error) || Boolean(loading?.sampleRun);
  const showReferenceTests = hasReferenceTests && !hasRunAttempt;

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
  }, [showReferenceTests, referenceTestCases.length, hasValidResults, testsLength, selectedTestCase, setSelectedTestCase]);

  return (
    <div className="h-full bg-white border-t border-gray-200 overflow-y-auto">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="text-sm font-medium text-gray-900">Sample Run Results</h3>
          </div>
          {showReferenceTests && (
            <p className="text-xs text-gray-500 italic">See reference test cases below for expected format</p>
          )}
          {sampleRunResult && onClearSampleRun && (
            <button
              onClick={onClearSampleRun}
              className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Clear
            </button>
          )}
        </div>
      </div>

      <div className="p-4">
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
                  <pre className="font-mono text-xs text-gray-900 whitespace-pre-wrap bg-gray-50 p-3 rounded border border-gray-200">
                    {formatReferenceValue(referenceTestCases[selectedTestCase].input)}
                  </pre>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                  <p className="text-sm font-semibold text-gray-800 mb-2">Expected Output</p>
                  <pre className="font-mono text-xs text-gray-900 whitespace-pre-wrap bg-gray-50 p-3 rounded border border-gray-200">
                    {formatReferenceValue(referenceTestCases[selectedTestCase].output)}
                  </pre>
                </div>
              </div>
            )}
          </div>
        )}

        {!showReferenceTests && (
          <>
            {/* Loading State */}
            {loading?.sampleRun && (
              <div className="py-16 text-center">
                <FaSpinner className="animate-spin text-4xl text-orange-600 mx-auto mb-4" />
                <p className="text-sm text-gray-600">Running Test Cases...</p>
                <p className="text-xs text-gray-500 mt-1">Evaluating your code...</p>
              </div>
            )}

            {/* Error Display */}
            {error && !loading?.sampleRun && (
              <div className="bg-red-50 border-l-4 border-red-500 rounded-r-lg p-4">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0">
                    <svg className="w-6 h-6 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-sm font-semibold text-red-800 mb-1">Execution Error</h3>
                    <p className="text-sm text-red-700">
                      {typeof error === 'string' ? error : (error?.message || 'An error occurred')}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Test Results Display */}
            {hasValidResults && !loading?.sampleRun && (
              <div className="space-y-4">
                {/* Summary */}
                {summary && (
                  <div className={`rounded-lg p-4 ${allPassed ? 'bg-green-50 border border-green-200' : 'bg-yellow-50 border border-yellow-200'
                    }`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-gray-900">
                          {allPassed ? 'All tests passed!' : `${summary.passed || 0} / ${testsExecuted} tests passed`}
                        </p>
                        {summary.time_ms_total && (
                          <p className="text-xs text-gray-600 mt-1">
                            Time: {(summary.time_ms_total / 1000).toFixed(2)}s
                          </p>
                        )}
                      </div>
                      {allPassed ? (
                        <svg className="w-8 h-8 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      ) : (
                        <svg className="w-8 h-8 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                  </div>
                )}

                {/* Test Case Tabs */}
                {tests.length > 0 && (
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {tests.map((test, index) => (
                      <button
                        key={index}
                        onClick={() => setSelectedTestCase(index)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all flex-shrink-0 text-sm ${selectedTestCase === index
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

                {/* Selected Test Case Details */}
                {tests[selectedTestCase] && (() => {
                  const test = tests[selectedTestCase];
                  return (
                    <div className="space-y-3">
                      {/* Input */}
                      <div className="bg-gray-50 border border-gray-200 rounded-lg overflow-hidden">
                        <div className="bg-gray-100 px-3 py-2 border-b border-gray-200 flex items-center gap-2">
                          <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                          <span className="text-xs font-semibold text-gray-700 uppercase">Input</span>
                        </div>
                        <div className="p-3">
                          <pre className="font-mono text-xs text-gray-900 whitespace-pre-wrap">
                            {(() => {
                              if (test.inputs_json) {
                                return formatInputValue(test.inputs_json);
                              }
                              if (test.input_text) {
                                return formatInputValue(test.input_text);
                              }
                              return 'No input';
                            })()}
                          </pre>
                        </div>
                      </div>

                      {/* Output Comparison */}
                      {test.status === 'AC' || test.status === 'WA' ? (
                        <div className="grid grid-cols-2 gap-3">
                          <div className="bg-green-50 border border-green-200 rounded-lg overflow-hidden">
                            <div className="bg-green-100 px-3 py-2 border-b border-green-200 flex items-center gap-2">
                              <svg className="w-4 h-4 text-green-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              <span className="text-xs font-semibold text-green-900 uppercase">Your Output</span>
                            </div>
                            <div className="p-3">
                              <pre className="font-mono text-xs text-green-900 whitespace-pre-wrap">
                                {test.output_text || test.output || 'No output'}
                              </pre>
                            </div>
                          </div>
                          <div className="bg-blue-50 border border-blue-200 rounded-lg overflow-hidden">
                            <div className="bg-blue-100 px-3 py-2 border-b border-blue-200 flex items-center gap-2">
                              <svg className="w-4 h-4 text-blue-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                              </svg>
                              <span className="text-xs font-semibold text-blue-900 uppercase">Expected</span>
                            </div>
                            <div className="p-3">
                              <pre className="font-mono text-xs text-blue-900 whitespace-pre-wrap">
                                {test.expected_output || 'No expected output'}
                              </pre>
                            </div>
                          </div>
                        </div>
                      ) : test.error_message && (
                        <div className="bg-red-50 border border-red-300 rounded-lg p-4">
                          <div className="flex items-start gap-3">
                            <div className="flex-shrink-0">
                              <svg className="w-6 h-6 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                              </svg>
                            </div>
                            <div className="flex-1">
                              <div className="text-sm font-semibold text-red-800 mb-2">
                                {test.status === 'RE' ? 'Runtime Error' :
                                  test.status === 'TLE' ? 'Time Limit Exceeded' :
                                    test.status === 'MLE' ? 'Memory Limit Exceeded' :
                                      test.status === 'CE' ? 'Compilation Error' : 'Error'}
                              </div>
                              <pre className="text-xs text-red-700 whitespace-pre-wrap font-mono bg-red-100/50 p-2 rounded border border-red-200">
                                {test.error_message}
                              </pre>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default TestResults;

