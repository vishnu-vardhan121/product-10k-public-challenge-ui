import React from 'react';
import { FaCode } from 'react-icons/fa';

const ProblemsTab = ({
  problems,
  currentProblemId,
  onSelectProblem,
}) => {
  if (!problems || problems.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center text-sm text-gray-500 p-8">
        <FaCode className="text-4xl text-gray-300 mb-3" />
        <p>No problems available</p>
      </div>
    );
  }

  const getDifficultyColor = (difficulty) => {
    const lower = difficulty?.toLowerCase() || '';
    if (lower.includes('easy')) return 'text-green-600';
    if (lower.includes('medium')) return 'text-yellow-600';
    if (lower.includes('hard')) return 'text-red-600';
    return 'text-gray-600';
  };

  return (
    <div className="space-y-2">
      {problems.map((item, index) => {
        const key = item.id || `problem-${index}`;
        const isCurrent = item.id === currentProblemId;
        const problemNumber = item.order || index + 1;

        return (
          <button
            type="button"
            key={key}
            onClick={() => onSelectProblem(item)}
            className={`group w-full rounded-lg border transition-all duration-150 text-left ${
              isCurrent
                ? 'border-orange-500 bg-orange-50 shadow-sm'
                : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
            }`}
          >
            <div className="p-3">
              <div className="flex items-center gap-3">
                {/* Problem Number */}
                <div
                  className={`flex-shrink-0 flex h-8 w-8 items-center justify-center rounded-md text-sm font-semibold ${
                    isCurrent
                      ? 'bg-orange-500 text-white'
                      : 'bg-gray-100 text-gray-600 group-hover:bg-gray-200'
                  }`}
                >
                  {problemNumber}
                </div>

                {/* Problem Content */}
                <div className="flex-1 min-w-0">
                  <h3
                    className={`text-sm font-medium leading-tight mb-1 ${
                      isCurrent ? 'text-gray-900' : 'text-gray-700 group-hover:text-gray-900'
                    }`}
                  >
                    {item.title || `Problem ${problemNumber}`}
                  </h3>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    {item.difficulty && (
                      <span className={getDifficultyColor(item.difficulty)}>
                        {item.difficulty}
                      </span>
                    )}
                    {item.points && (
                      <span className="text-gray-500">
                        • {item.points} pts
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
};

export default ProblemsTab;

