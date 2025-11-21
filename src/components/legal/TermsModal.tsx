import React from 'react';
import { X } from 'lucide-react';
import { Button } from '../ui/button';
import { TERMS_AND_CONDITIONS_PT, PRIVACY_POLICY_PT } from '../../constants/terms';

interface TermsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAccept?: () => void;
  showAcceptButton?: boolean;
}

export function TermsModal({ isOpen, onClose, onAccept, showAcceptButton = false }: TermsModalProps) {
  if (!isOpen) return null;

  const handleAccept = () => {
    onAccept?.();
    onClose();
  };

  const formatTermsText = (text: string) => {
    return text.split('\n').map((line, index) => {
      if (line.startsWith('# ')) {
        return (
          <h1 key={index} className="text-2xl font-bold text-gray-900 mt-6 mb-4">
            {line.replace('# ', '')}
          </h1>
        );
      }
      if (line.startsWith('## ')) {
        return (
          <h2 key={index} className="text-xl font-semibold text-gray-900 mt-5 mb-3">
            {line.replace('## ', '')}
          </h2>
        );
      }
      if (line.startsWith('### ')) {
        return (
          <h3 key={index} className="text-lg font-semibold text-gray-800 mt-4 mb-2">
            {line.replace('### ', '')}
          </h3>
        );
      }
      if (line.startsWith('**') && line.endsWith('**')) {
        return (
          <p key={index} className="font-semibold text-gray-900 mt-3 mb-2">
            {line.replace(/\*\*/g, '')}
          </p>
        );
      }
      if (line.startsWith('- ')) {
        return (
          <li key={index} className="ml-6 text-gray-700 leading-relaxed">
            {line.replace('- ', '')}
          </li>
        );
      }
      if (line.startsWith('a) ') || line.startsWith('b) ') || line.startsWith('c) ') || line.startsWith('d) ') || line.startsWith('e) ') || line.startsWith('f) ')) {
        return (
          <p key={index} className="ml-6 text-gray-700 leading-relaxed mb-2">
            {line}
          </p>
        );
      }
      if (line.trim() === '') {
        return <div key={index} className="h-2" />;
      }
      if (line.startsWith('---')) {
        return <hr key={index} className="my-6 border-gray-300" />;
      }
      return (
        <p key={index} className="text-gray-700 leading-relaxed mb-2">
          {line}
        </p>
      );
    });
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 sticky top-0 bg-white rounded-t-lg">
          <h2 className="text-2xl font-bold text-gray-900">Termos e Condições de Uso</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Fechar"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="prose prose-sm max-w-none">
            {formatTermsText(TERMS_AND_CONDITIONS_PT)}
          </div>

          <div className="mt-12 pt-8 border-t-4 border-gray-300">
            <div className="prose prose-sm max-w-none">
              {formatTermsText(PRIVACY_POLICY_PT)}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50 rounded-b-lg sticky bottom-0">
          <Button
            variant="outline"
            onClick={onClose}
          >
            Fechar
          </Button>
          {showAcceptButton && (
            <Button
              onClick={handleAccept}
            >
              Aceitar e Continuar
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
