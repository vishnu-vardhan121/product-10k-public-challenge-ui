'use client';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css'; // Import KaTeX CSS

const MarkdownRenderer = ({ content, className = "" }) => {
  if (!content) {
    return (
      <div className={`text-gray-500 italic ${className}`}>
        No content available
      </div>
    );
  }

  return (
    <div className={`markdown-content ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
          // Headings with better hierarchy
          h1: ({ children }) => (
            <h1 className="text-3xl font-bold text-gray-900 mb-3 mt-6 border-b-2 border-gray-200 pb-2 first:mt-0">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-2xl font-bold text-gray-900 mb-2 mt-5">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-xl font-semibold text-gray-900 mb-2 mt-4">
              {children}
            </h3>
          ),
          h4: ({ children }) => (
            <h4 className="text-lg font-semibold text-gray-800 mb-2 mt-3">
              {children}
            </h4>
          ),
          
          // Paragraphs with compact spacing
          p: ({ children }) => (
            <p className="text-gray-700 text-base mb-3 leading-6">
              {children}
            </p>
          ),
          
          // Lists with compact spacing
          ul: ({ children }) => (
            <ul className="list-disc pl-5 mb-3 space-y-1 text-gray-700">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal pl-5 mb-3 space-y-1 text-gray-700">
              {children}
            </ol>
          ),
          li: ({ children }) => (
            <li className="text-gray-700 leading-6 pl-1">{children}</li>
          ),
          
          // Enhanced blockquotes
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-blue-500 bg-blue-50 pl-4 pr-3 py-2 my-3 rounded-r-lg">
              <div className="text-gray-700 italic">
                {children}
              </div>
            </blockquote>
          ),
          
          // Better code styling
          code: ({ children, className, inline }) => {
            const isInline = inline || !className;
            
            if (isInline) {
              return (
                <code className="bg-gray-100 text-red-600 px-1.5 py-0.5 rounded text-sm font-mono border border-gray-200">
                  {children}
                </code>
              );
            }
            
            // Extract language from className (format: language-*)
            const language = className ? className.replace('language-', '') : '';
            
            return (
              <div className="my-3">
                {language && (
                  <div className="bg-gray-700 text-gray-300 text-xs px-3 py-1 rounded-t-lg font-mono">
                    {language}
                  </div>
                )}
                <code className={`block bg-gray-900 text-gray-100 px-3 py-2 ${language ? 'rounded-b-lg' : 'rounded-lg'} overflow-x-auto text-sm font-mono leading-5 whitespace-pre`}>
                  {children}
                </code>
              </div>
            );
          },
          
          pre: ({ children }) => (
            <div className="mb-3 whitespace-pre">
              {children}
            </div>
          ),
          
          // Professional tables
          table: ({ children }) => (
            <div className="overflow-x-auto my-4 border border-gray-200 rounded-lg shadow-sm">
              <table className="min-w-full divide-y divide-gray-200">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-gray-100">
              {children}
            </thead>
          ),
          tbody: ({ children }) => (
            <tbody className="bg-white divide-y divide-gray-200">
              {children}
            </tbody>
          ),
          tr: ({ children }) => (
            <tr className="hover:bg-gray-50 transition-colors">
              {children}
            </tr>
          ),
          th: ({ children }) => (
            <th className="px-4 py-2 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="px-4 py-2 text-sm text-gray-700 whitespace-nowrap">
              {children}
            </td>
          ),
          
          // Typography enhancements
          strong: ({ children }) => (
            <strong className="font-bold text-gray-900">{children}</strong>
          ),
          em: ({ children }) => (
            <em className="italic text-gray-800">{children}</em>
          ),
          
          // Links with better styling
          a: ({ children, href }) => (
            <a 
              href={href} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 underline decoration-2 underline-offset-2 transition-colors font-medium"
            >
              {children}
            </a>
          ),
          
          // Horizontal rule
          hr: () => (
            <hr className="border-t-2 border-gray-200 my-5" />
          ),
          
          // Delete (strikethrough)
          del: ({ children }) => (
            <del className="line-through text-gray-500">{children}</del>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};

export default MarkdownRenderer;

