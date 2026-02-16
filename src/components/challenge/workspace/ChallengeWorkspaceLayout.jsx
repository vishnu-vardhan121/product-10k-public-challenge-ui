'use client';

import React, { useMemo, useCallback, useState, useEffect, useRef } from 'react';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { FiArrowLeft } from 'react-icons/fi';
import { getStoredLayout, storeLayout } from '@/utils/panelLayoutStorage';
import { debounce } from '@/utils/debounce';

const formatUnit = (value) => String(Math.max(0, Number.isFinite(value) ? value : 0)).padStart(2, '0');

// On mobile: track keyboard open and visual viewport height so we can constrain layout and scroll editor into view.
function useMobileViewport() {
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const [viewportHeight, setViewportHeight] = useState(typeof window !== 'undefined' ? window.innerHeight : 0);
  useEffect(() => {
    if (typeof window === 'undefined' || !window.visualViewport) return;
    const check = () => {
      const vv = window.visualViewport;
      setViewportHeight(vv.height);
      const threshold = window.innerHeight * 0.65;
      setKeyboardOpen(vv.height < threshold);
    };
    check();
    window.visualViewport.addEventListener('resize', check);
    window.visualViewport.addEventListener('scroll', check);
    return () => {
      window.visualViewport.removeEventListener('resize', check);
      window.visualViewport.removeEventListener('scroll', check);
    };
  }, []);
  return { keyboardOpen, viewportHeight };
}

const ChallengeWorkspaceLayout = ({
  timeLeft = { hours: 0, minutes: 0, seconds: 0 },
  onBack,
  backLabel = 'Back',
  leftPanelContent,
  rightPanelContent,
  resultsPanelContent,
  onHorizontalDrag,
  onVerticalDrag,
  extraContent = null,
  summaryContent = null,
  challengeId,
}) => {
  const showTimer = timeLeft && (timeLeft.hours > 0 || timeLeft.minutes > 0 || timeLeft.seconds > 0);

  // Mobile: collapsible results section
  const [mobileResultsOpen, setMobileResultsOpen] = useState(false);
  // Mobile: keyboard state and viewport height for layout + scroll-into-view
  const { keyboardOpen: mobileKeyboardOpen } = useMobileViewport();
  const editorSectionRef = useRef(null);

  // When keyboard opens on mobile, scroll the editor section into view so code stays visible and can scroll
  useEffect(() => {
    if (!mobileKeyboardOpen || !editorSectionRef.current) return;
    const el = editorSectionRef.current;
    requestAnimationFrame(() => {
      el.scrollIntoView({ behavior: 'smooth', block: 'end', inline: 'nearest' });
    });
  }, [mobileKeyboardOpen]);

  // Load and save layouts
  const [horizontalLayout, setHorizontalLayout] = React.useState(null);
  const [verticalLayout, setVerticalLayout] = React.useState(null);

  React.useEffect(() => {
    if (challengeId) {
      const storedHorizontal = getStoredLayout(`workspace-horizontal-${challengeId}`);
      const storedVertical = getStoredLayout(`workspace-vertical-${challengeId}`);
      if (storedHorizontal) setHorizontalLayout(storedHorizontal);
      if (storedVertical) setVerticalLayout(storedVertical);
    }
  }, [challengeId]);

  const debouncedSaveHorizontal = useMemo(
    () => debounce((layout) => {
      if (challengeId) {
        storeLayout(`workspace-horizontal-${challengeId}`, layout);
      }
    }, 500),
    [challengeId]
  );

  const debouncedSaveVertical = useMemo(
    () => debounce((layout) => {
      if (challengeId) {
        storeLayout(`workspace-vertical-${challengeId}`, layout);
      }
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

  const horizontalPanelGroupProps = {
    direction: "horizontal",
    className: "h-full",
    onLayout: handleHorizontalLayoutChange
  };

  const verticalPanelGroupProps = {
    direction: "vertical",
    onLayout: handleVerticalLayoutChange
  };

  /* Mobile/tablet: vertical stack. Use visual viewport height when keyboard open so layout fits; editor scrolls. */
  return (
    <div className="h-full flex flex-col bg-gray-50 overflow-hidden">
      {/* Mobile layout: when keyboard open, collapse top panel and scroll editor into view; editor area scrolls so code stays visible. */}
      <div className="h-full flex flex-col lg:hidden overflow-hidden">
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
          <div className={`flex flex-col border-b border-gray-200 overflow-hidden transition-[max-height] duration-200 ease-out shrink-0 ${mobileKeyboardOpen ? 'max-h-0 min-h-0' : 'min-h-[180px] max-h-[50vh]'}`}>
            {leftPanelContent}
          </div>
          <div
            ref={editorSectionRef}
            className={`overflow-hidden flex flex-col bg-gray-900 transition-all duration-200 min-h-0 flex-1 ${mobileKeyboardOpen ? 'min-h-[200px]' : 'min-h-[280px]'}`}
          >
            {rightPanelContent}
          </div>
          <div className={`border-t border-gray-200 bg-white flex flex-col shrink-0 ${mobileResultsOpen ? 'flex-1 min-h-0' : 'max-h-0 overflow-hidden'}`}>
            <button
              type="button"
              onClick={() => setMobileResultsOpen(!mobileResultsOpen)}
              className="w-full flex items-center justify-between px-4 py-3 bg-gray-100 hover:bg-gray-200 text-sm font-semibold text-gray-700 lg:hidden shrink-0"
            >
              <span>Test results & Submit output</span>
              <svg className={`w-5 h-5 transition-transform shrink-0 ${mobileResultsOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {mobileResultsOpen && (
              <div
                className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-3 overscroll-contain"
                style={{ WebkitOverflowScrolling: 'touch' }}
              >
                {resultsPanelContent}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Desktop layout: resizable panels (lg and up) */}
      <div className="hidden lg:block h-full overflow-hidden">
        <PanelGroup {...horizontalPanelGroupProps}>
          <Panel defaultSize={50} minSize={25} maxSize={75} className="min-w-0">
            <div className="h-full flex flex-col bg-white border-r border-gray-200">
              <div className="flex-1 overflow-hidden min-w-0">
                {leftPanelContent}
              </div>
            </div>
          </Panel>

          <PanelResizeHandle
            className="w-1 bg-gray-300 hover:bg-gray-400 transition-colors relative group shrink-0"
            onDragging={(isDragging) => onHorizontalDrag?.(isDragging)}
          >
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
              <div className="w-1 h-8 bg-gray-400 group-hover:bg-gray-500 rounded-full"></div>
            </div>
          </PanelResizeHandle>

          <Panel defaultSize={50} minSize={25} className="min-w-0">
            <PanelGroup {...verticalPanelGroupProps}>
              <Panel defaultSize={50} minSize={30}>
                {rightPanelContent}
              </Panel>

              <PanelResizeHandle
                className="h-1 bg-gray-600 hover:bg-gray-500 transition-colors relative group shrink-0"
                onDragging={(isDragging) => onVerticalDrag?.(isDragging)}
              >
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                  <div className="w-8 h-1 bg-gray-500 group-hover:bg-gray-400 rounded-full"></div>
                </div>
              </PanelResizeHandle>

              <Panel defaultSize={50} minSize={10} maxSize={70} className="min-h-0 overflow-hidden flex flex-col">
                <div className="h-full min-h-0 overflow-y-auto overflow-x-hidden flex flex-col">
                  {resultsPanelContent}
                </div>
              </Panel>
            </PanelGroup>
          </Panel>
        </PanelGroup>
      </div>

      {extraContent}
    </div>
  );
};

export default ChallengeWorkspaceLayout;

