import React, { useEffect, useRef } from 'react';
import Prism from 'prismjs';
import 'prismjs/themes/prism-tomorrow.css';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-java';
import 'prismjs/components/prism-cpp';
import 'prismjs/components/prism-csharp';
import 'prismjs/components/prism-go';
import 'prismjs/components/prism-rust';
import './CodeSnippetPreview.css';

interface CodeSnippetPreviewProps {
  code: string;
  language: string;
  fileName: string;
  maxLines?: number;
  showLineNumbers?: boolean;
  highlightLines?: number[];
  className?: string;
}

const CodeSnippetPreview: React.FC<CodeSnippetPreviewProps> = ({
  code,
  language,
  fileName,
  maxLines = 50,
  showLineNumbers = true,
  highlightLines = [],
  className = '',
}) => {
  const codeRef = useRef<HTMLElement>(null);
  const [isExpanded, setIsExpanded] = React.useState(false);
  const [copySuccess, setCopySuccess] = React.useState(false);

  // Apply syntax highlighting when code or language changes
  useEffect(() => {
    if (codeRef.current) {
      Prism.highlightElement(codeRef.current);
    }
  }, [code, language]);

  // Get the appropriate Prism language class
  const getPrismLanguage = (lang: string): string => {
    const languageMap: Record<string, string> = {
      typescript: 'typescript',
      javascript: 'javascript',
      python: 'python',
      java: 'java',
      cpp: 'cpp',
      c: 'c',
      csharp: 'csharp',
      go: 'go',
      rust: 'rust',
      text: 'text',
    };
    return languageMap[lang] || 'text';
  };

  // Split code into lines for processing
  const codeLines = code.split('\n');
  const shouldTruncate = codeLines.length > maxLines && !isExpanded;
  const displayedCode = shouldTruncate 
    ? codeLines.slice(0, maxLines).join('\n') + '\n...'
    : code;

  // Handle copy to clipboard
  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error('Failed to copy code:', err);
    }
  };

  // Generate line numbers
  const generateLineNumbers = () => {
    const totalLines = shouldTruncate ? maxLines : codeLines.length;
    return Array.from({ length: totalLines }, (_, i) => i + 1);
  };

  return (
    <div className={`code-snippet-preview ${className}`}>
      <div className="code-header">
        <div className="file-info">
          <span className="file-name">{fileName}</span>
          <span className="language-badge">{language}</span>
        </div>
        <div className="code-actions">
          <button
            className="action-button"
            onClick={handleCopyCode}
            title="Copy code"
            disabled={copySuccess}
          >
            {copySuccess ? '✓' : '📋'}
          </button>
          {codeLines.length > maxLines && (
            <button
              className="action-button"
              onClick={() => setIsExpanded(!isExpanded)}
              title={isExpanded ? 'Collapse' : 'Expand'}
            >
              {isExpanded ? '▲' : '▼'}
            </button>
          )}
        </div>
      </div>

      <div className="code-container">
        {showLineNumbers && (
          <div className="line-numbers">
            {generateLineNumbers().map((lineNum) => (
              <div
                key={lineNum}
                className={`line-number ${
                  highlightLines.includes(lineNum) ? 'highlighted' : ''
                }`}
              >
                {lineNum}
              </div>
            ))}
          </div>
        )}

        <div className="code-content">
          <pre className={`language-${getPrismLanguage(language)}`}>
            <code
              ref={codeRef}
              className={`language-${getPrismLanguage(language)}`}
            >
              {displayedCode}
            </code>
          </pre>
        </div>
      </div>

      {shouldTruncate && (
        <div className="truncation-notice">
          <span>
            Showing {maxLines} of {codeLines.length} lines
          </span>
          <button
            className="expand-button"
            onClick={() => setIsExpanded(true)}
          >
            Show all lines
          </button>
        </div>
      )}

      {copySuccess && (
        <div className="copy-notification">
          Code copied to clipboard!
        </div>
      )}
    </div>
  );
};

export default CodeSnippetPreview;
export { CodeSnippetPreview };