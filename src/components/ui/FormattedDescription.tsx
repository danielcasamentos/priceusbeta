
interface FormattedDescriptionProps {
  text: string | null | undefined;
  className?: string;
}

export function FormattedDescription({ text, className = '' }: FormattedDescriptionProps) {
  if (!text) return null;

  // Renderiza inline formatting (negrito, itálico, destaques)
  const renderInline = (content: string) => {
    // Regex para negrito (**texto**), itálico (*texto* ou _texto_)
    const parts = content.split(/(\*\*.*?\*\*|\*.*?\*|_.*?_|==.*?==)/g);

    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**') && part.length >= 4) {
        return <strong key={i} className="font-extrabold text-inherit opacity-100">{part.slice(2, -2)}</strong>;
      }
      if ((part.startsWith('*') && part.endsWith('*') && part.length >= 2) || (part.startsWith('_') && part.endsWith('_') && part.length >= 2)) {
        return <em key={i} className="italic text-inherit opacity-95">{part.slice(1, -1)}</em>;
      }
      if (part.startsWith('==') && part.endsWith('==') && part.length >= 4) {
        return <mark key={i} className="bg-amber-400/25 text-inherit border border-amber-400/40 px-1 py-0.5 rounded font-semibold">{part.slice(2, -2)}</mark>;
      }
      return part;
    });
  };

  // Split lines by newline character
  const lines = text.split('\n');

  return (
    <div className={`space-y-2 text-sm leading-relaxed ${className}`}>
      {lines.map((line, index) => {
        let trimmed = line.trim();
        
        // Linhas vazias representadas como espaçamento sutil
        if (!trimmed) {
          return <div key={index} className="h-1.5" />;
        }

        // 1. Títulos H1 (# Título)
        if (trimmed.startsWith('# ')) {
          const title = trimmed.replace(/^#\s+/, '');
          return (
            <div key={index} className="pt-2 pb-1 border-b border-current/20 mb-1.5">
              <h4 className="text-xs sm:text-sm font-black uppercase tracking-wider text-inherit flex items-center gap-1.5">
                {renderInline(title)}
              </h4>
            </div>
          );
        }

        // 2. Títulos H2 (## Subtítulo)
        if (trimmed.startsWith('## ')) {
          const title = trimmed.replace(/^##\s+/, '');
          return (
            <div key={index} className="pt-1.5 pb-0.5">
              <h5 className="text-xs font-bold uppercase tracking-wide text-emerald-400 flex items-center gap-1.5">
                {renderInline(title)}
              </h5>
            </div>
          );
        }

        // 3. Divisores (--- ou ___ ou ———)
        if (/^(?:-{3,}|—{3,}|_{3,})$/.test(trimmed)) {
          return (
            <div key={index} className="my-2.5 border-t border-dashed border-current/25" />
          );
        }

        // 4. Caixas de Destaque / Dicas / Callouts (💡 ou ⭐ ou 📌)
        if (trimmed.startsWith('💡') || trimmed.startsWith('⭐') || trimmed.startsWith('📌')) {
          const icon = trimmed.slice(0, 2);
          const rest = trimmed.slice(2).trim();
          return (
            <div key={index} className="my-2 p-2.5 rounded-xl bg-amber-500/15 border border-amber-400/35 flex items-start gap-2 text-xs font-medium text-amber-300 shadow-xs">
              <span className="shrink-0 mt-0.5 text-base leading-none">{icon}</span>
              <div className="flex-1 text-inherit">{renderInline(rest)}</div>
            </div>
          );
        }

        // 5. Checklist de Itens Inclusos (✓ ou [x] ou [X])
        if (trimmed.startsWith('✓') || trimmed.startsWith('[x]') || trimmed.startsWith('[X]')) {
          const itemText = trimmed.replace(/^(?:✓|\[[xX]\])\s*/, '');
          return (
            <div key={index} className="flex items-start gap-2 pl-0.5 text-xs sm:text-sm">
              <span className="text-emerald-400 font-black mt-0.5 shrink-0">✓</span>
              <span className="text-inherit">{renderInline(itemText)}</span>
            </div>
          );
        }

        // 6. Lista de Tópicos (- ou * ou •)
        if (trimmed.startsWith('-') || trimmed.startsWith('*') || trimmed.startsWith('•')) {
          const itemText = trimmed.replace(/^[-*•]\s*/, '');
          return (
            <div key={index} className="flex items-start gap-2 pl-1.5 text-xs sm:text-sm">
              <span className="text-indigo-400 font-bold mt-0.5 shrink-0">•</span>
              <span className="text-inherit">{renderInline(itemText)}</span>
            </div>
          );
        }

        // 7. Lista Numerada (1., 2., 3.)
        const numMatch = trimmed.match(/^(\d+)\.\s+(.*)$/);
        if (numMatch) {
          const num = numMatch[1];
          const itemText = numMatch[2];
          return (
            <div key={index} className="flex items-start gap-2 pl-1 text-xs sm:text-sm">
              <span className="w-4 h-4 rounded-full bg-indigo-500/25 text-indigo-300 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5 border border-indigo-500/40">
                {num}
              </span>
              <span className="text-inherit">{renderInline(itemText)}</span>
            </div>
          );
        }

        // 8. Rótulos em maiúsculas antes de dois pontos (ex: "LOCAL DO EVENTO: Espaço...")
        const colonIndex = trimmed.indexOf(':');
        if (colonIndex > 0) {
          const label = trimmed.substring(0, colonIndex).trim();
          const rest = trimmed.substring(colonIndex + 1).trim();
          const isUppercaseLabel = label.length > 2 && label.toUpperCase() === label && !/^[0-9\s:]+$/.test(label);
          
          if (isUppercaseLabel) {
            return (
              <div key={index} className="flex items-start gap-1.5 text-xs sm:text-sm">
                <span>
                  <strong className="font-black text-inherit tracking-tight">{label}:</strong>
                  {rest ? ` ${renderInline(rest)}` : ''}
                </span>
              </div>
            );
          }
        }

        // 9. Parágrafo comum
        return (
          <div key={index} className="text-xs sm:text-sm text-inherit">
            {renderInline(trimmed)}
          </div>
        );
      })}
    </div>
  );
}
