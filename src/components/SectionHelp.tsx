import { useState } from 'react';
import { HelpCircle } from 'lucide-react';

interface SectionHelpProps {
  /** Short title shown in the tooltip/modal header */
  title: string;
  /** Full explanatory text */
  content: string;
}

export const SectionHelp: React.FC<SectionHelpProps> = ({ title, content }) => {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="p-1 rounded-full hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
        aria-label={`Ajuda sobre ${title}`}
      >
        <HelpCircle className="w-5 h-5 text-gray-500" />
      </button>

      {open && (
        <div className="absolute z-10 w-64 p-4 bg-white rounded-lg shadow-lg border border-gray-200 top-full left-1/2 transform -translate-x-1/2 mt-2">
          <div className="flex justify-between items-start mb-2">
            <h3 className="text-sm font-medium text-gray-900">{title}</h3>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="p-0.5 text-gray-400 hover:text-gray-600 focus:outline-none"
            >
              ✕
            </button>
          </div>
          <p className="text-xs text-gray-700 whitespace-pre-line">{content}</p>
        </div>
      )}
    </div>
  );
};
