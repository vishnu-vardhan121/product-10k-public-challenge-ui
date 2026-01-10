import React from 'react';
import MarkdownRenderer from '@/components/shared/MarkdownRenderer';

const StatChip = ({ label, value, className }) => (
  <div className={`inline-flex items-center gap-1 rounded-lg px-3 py-1 text-xs font-semibold uppercase tracking-wide ${className}`}>
    {label && <span>{label}</span>}
    <span className="text-sm font-bold">{value}</span>
  </div>
);

const CodeBlock = ({ title, value }) => (
  <div className="space-y-2">
    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{title}</p>
    <pre className="whitespace-pre-wrap rounded-md bg-slate-900 px-3 py-2 font-mono text-xs text-slate-100">
      {value}
    </pre>
  </div>
);

const renderSignature = (interfaceSpec) => {
  if (!interfaceSpec) return null;
  const { function_name: name, parameters = [], return_type: returnType } = interfaceSpec;
  const params = parameters
    .map(({ name: paramName, type }) => `${type || 'any'} ${paramName || ''}`.trim())
    .join(', ');
  const signature = `${returnType || 'void'} ${name || 'solve'}(${params})`;
  return (
    <CodeBlock title="Function Signature" value={signature} />
  );
};

const ProblemDescription = ({ problem = null, loading = false, onBack }) => {
  if (!problem) {
    return (
      <div className="py-16 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading problem details...</p>
      </div>
    );
  }

  const {
    title,
    difficulty,
    points,
    tags,
    description_md: descriptionMd,
    description,
    interface_spec: interfaceSpec,
    constraints_md: constraintsMd,
  } = problem;

  return (
    <div className="space-y-6">
      {loading && (
        <div className="inline-flex items-center gap-2 rounded-full bg-orange-50 px-3 py-1 text-xs font-medium text-orange-600">
          <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-orange-600"></div>
          Updating problem data…
        </div>
      )}

      <div className="space-y-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <h1 className="text-2xl font-semibold text-gray-900">{title || 'Untitled Problem'}</h1>
          <div className="flex flex-wrap items-center gap-2">
            {difficulty && (
              <StatChip label="" value={difficulty} className="bg-orange-100 text-orange-700" />
            )}
            {typeof points === 'number' && (
              <span className="px-2 py-1 rounded-full bg-orange-100 text-orange-700 text-xs font-semibold">
                {points} pts
              </span>
            )}
          </div>
        </div>
        {Array.isArray(tags) && tags.length > 0 && (
          <div className="flex flex-wrap gap-2 text-xs text-gray-500">
            {tags.map((tag) => (
              <span key={tag} className="rounded-full bg-gray-100 px-2.5 py-0.5 font-medium text-gray-600">
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="prose max-w-none">
        <MarkdownRenderer content={descriptionMd || description || 'No description available.'} />
      </div>

      {renderSignature(interfaceSpec)}

      {constraintsMd && (
        <div className="space-y-2">
          <p className="text-sm font-semibold text-gray-800">Constraints</p>
          <div className="prose max-w-none">
            <MarkdownRenderer content={constraintsMd} />
          </div>
        </div>
      )}
    </div>
  );
};

export default ProblemDescription;

