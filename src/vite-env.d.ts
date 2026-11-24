/// <reference types="vite/client" />

interface Window {
  Tawk_API?: {
    onLoad?: () => void;
    setVisitor?: (visitor: { name?: string; email?: string }) => void;
    maximize?: () => void;
    minimize?: () => void;
    toggle?: () => void;
    showWidget?: () => void;
    hideWidget?: () => void;
  };
  Tawk_LoadStart?: Date;
}
