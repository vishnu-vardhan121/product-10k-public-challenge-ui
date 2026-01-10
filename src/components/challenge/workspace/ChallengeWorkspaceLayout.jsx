'use client';

import React, { useMemo, useCallback } from 'react';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { FiArrowLeft } from 'react-icons/fi';
import { getStoredLayout, storeLayout } from '@/utils/panelLayoutStorage';
import { debounce } from '@/utils/debounce';

const formatUnit = (value) => String(Math.max(0, Number.isFinite(value) ? value : 0)).padStart(2, '0');

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

  // Build props for PanelGroup, only include defaultLayout if it's defined
  const horizontalPanelGroupProps = {
    direction: "horizontal",
    className: "h-full",
    onLayout: handleHorizontalLayoutChange
  };

  const verticalPanelGroupProps = {
    direction: "vertical",
    onLayout: handleVerticalLayoutChange
  };

  return (
    <div className="h-full flex flex-col bg-gray-50 overflow-hidden">
      <PanelGroup {...horizontalPanelGroupProps}>
        <Panel defaultSize={50} minSize={25} maxSize={75} className="min-w-[550px]">
          <div className="h-full flex flex-col bg-white border-r border-gray-200">
            <div className="flex-1 overflow-hidden">
              {leftPanelContent}
            </div>
          </div>
        </Panel>

        <PanelResizeHandle
          className="w-1 bg-gray-300 hover:bg-gray-400 transition-colors relative group"
          onDragging={(isDragging) => onHorizontalDrag?.(isDragging)}
        >
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
            <div className="w-1 h-8 bg-gray-400 group-hover:bg-gray-500 rounded-full"></div>
          </div>
        </PanelResizeHandle>

        <Panel defaultSize={50} minSize={25}>
          <PanelGroup {...verticalPanelGroupProps}>
            <Panel defaultSize={50} minSize={30}>
              {rightPanelContent}
            </Panel>

            <PanelResizeHandle
              className="h-1 bg-gray-600 hover:bg-gray-500 transition-colors relative group"
              onDragging={(isDragging) => onVerticalDrag?.(isDragging)}
            >
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                <div className="w-8 h-1 bg-gray-500 group-hover:bg-gray-400 rounded-full"></div>
              </div>
            </PanelResizeHandle>

            <Panel defaultSize={50} minSize={10} maxSize={70} className="overflow-hidden">
              {resultsPanelContent}
            </Panel>
          </PanelGroup>
        </Panel>
      </PanelGroup>

      {extraContent}
    </div>
  );
};

export default ChallengeWorkspaceLayout;

