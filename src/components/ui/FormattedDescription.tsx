import React from 'react';

interface FormattedDescriptionProps {
  text: string | null | undefined;
  className?: string;
}

export function FormattedDescription({ text, className = '' }: FormattedDescriptionProps) {
  if (!text) return null;

  // Split lines by newline character
  const lines = text.split('\n');

  return (
    <div className={`space-y-1.5 text-sm leading-relaxed text-gray-650 dark:text-gray-300 ${className}`}>
      {lines.map((line, index) => {
        let trimmed = line.trim();
        
        // Empty lines represented as spacing
        if (!trimmed) {
          return <div key={index} className="h-1.5" />;
        }

        // 1. Detect divider/separator lines (e.g. starting with ---, ———, or containing just dashes/underscores)
        if (/^(?:-{3,}|—{3,}|_{3,})$/.test(trimmed)) {
          return (
            <div key={index} className="my-3 border-t border-dashed border-gray-200 dark:border-white/10" />
          );
        }

        // 2. Detect divider with text (e.g. "--- CORTESIA EXCLUSIVA:")
        let isItem = false;
        let icon = '';
        if (trimmed.startsWith('---') || trimmed.startsWith('——') || trimmed.startsWith('—')) {
          trimmed = trimmed.replace(/^[-—_]+/, '').trim();
          isItem = true;
          icon = '✨';
        } else if (trimmed.startsWith('-') || trimmed.startsWith('*') || trimmed.startsWith('•')) {
          trimmed = trimmed.replace(/^[-*•]+/, '').trim();
          isItem = true;
          icon = '✓';
        }

        // 3. Highlight labels in bold before colons if they are uppercase (e.g., "O DIA DO CASAMENTO:")
        const colonIndex = trimmed.indexOf(':');
        if (colonIndex > 0) {
          const label = trimmed.substring(0, colonIndex).trim();
          const rest = trimmed.substring(colonIndex + 1).trim();
          
          // Check if label is mostly uppercase (to match section headers)
          const isUppercaseLabel = label.length > 2 && label.toUpperCase() === label && !/^[0-9\s:]+$/.test(label);
          
          if (isUppercaseLabel) {
            return (
              <div
                key={index}
                className={`flex items-start gap-2 ${isItem ? 'pl-2 text-emerald-700 dark:text-emerald-400 font-medium' : ''}`}
              >
                {isItem && <span className="text-emerald-500 mt-0.5">{icon}</span>}
                <span>
                  <strong className="text-gray-900 dark:text-white font-bold">{label}:</strong>
                  {rest ? ` ${rest}` : ''}
                </span>
              </div>
            );
          }
        }

        // 4. Regular line rendering
        return (
          <div key={index} className={`flex items-start gap-2 ${isItem ? 'pl-2' : ''}`}>
            {isItem && <span className="text-blue-500 mt-0.5 font-bold">{icon}</span>}
            <span>{trimmed}</span>
          </div>
        );
      })}
    </div>
  );
}
