import { useState, useEffect } from 'react';
import { Clock, Gift } from 'lucide-react';

interface BrindesCountdownProps {
  brindesExpira?: boolean;
  brindesExpiraTipo?: 'dias' | 'data';
  brindesExpiraDias?: number | null;
  brindesExpiraData?: string | null;
  leadCreatedAt?: string | null;
}

export function BrindesCountdown({
  brindesExpira,
  brindesExpiraTipo = 'dias',
  brindesExpiraDias = 7,
  brindesExpiraData,
  leadCreatedAt,
}: BrindesCountdownProps) {
  const [timeLeft, setTimeLeft] = useState<string | null>(null);
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    if (!brindesExpira) return;

    // Calcular a data alvo
    let targetTime = 0;
    if (brindesExpiraTipo === 'data' && brindesExpiraData) {
      targetTime = new Date(brindesExpiraData).getTime();
    } else {
      // Se for em dias, calcula a partir do leadCreatedAt ou da data atual se for novo prospect
      const baseDate = leadCreatedAt ? new Date(leadCreatedAt) : new Date();
      const dias = brindesExpiraDias || 7;
      targetTime = baseDate.getTime() + dias * 24 * 60 * 60 * 1000;
    }

    const calculateTime = () => {
      const now = new Date().getTime();
      const difference = targetTime - now;

      if (difference <= 0) {
        setTimeLeft('Contagem encerrada - Consulte disponibilidade de brindes');
        setIsExpired(true);
        return false;
      }

      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((difference % (1000 * 60)) / 1000);

      const parts = [];
      if (days > 0) parts.push(`${String(days).padStart(2, '0')}d`);
      parts.push(`${String(hours).padStart(2, '0')}h`);
      parts.push(`${String(minutes).padStart(2, '0')}m`);
      parts.push(`${String(seconds).padStart(2, '0')}s`);

      setTimeLeft(parts.join(' '));
      setIsExpired(false);
      return true;
    };

    calculateTime();
    const interval = setInterval(calculateTime, 1000);

    return () => clearInterval(interval);
  }, [brindesExpira, brindesExpiraTipo, brindesExpiraDias, brindesExpiraData, leadCreatedAt]);

  if (!brindesExpira || !timeLeft) return null;

  return (
    <div
      className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold shadow-sm transition-all duration-300 border ${
        isExpired
          ? 'bg-amber-50/50 border-amber-200 dark:border-amber-900/30 text-amber-700 dark:text-amber-400'
          : 'bg-emerald-50/70 border-emerald-200 dark:border-emerald-950/20 text-emerald-800 dark:text-emerald-400 animate-pulse'
      }`}
    >
      {isExpired ? (
        <Clock className="w-3.5 h-3.5 shrink-0 text-amber-500" />
      ) : (
        <Gift className="w-3.5 h-3.5 shrink-0 text-emerald-500" />
      )}
      <span className="leading-tight">
        {isExpired ? (
          timeLeft
        ) : (
          <>
            Brindes garantidos se fechar em: <span className="font-bold font-mono">{timeLeft}</span>
          </>
        )}
      </span>
    </div>
  );
}
