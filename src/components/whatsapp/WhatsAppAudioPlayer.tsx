import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, Mic, Sparkles, FileText } from 'lucide-react';

interface WhatsAppAudioPlayerProps {
  mediaUrl?: string;
  durationSeconds?: number;
  isOutgoing?: boolean;
  senderName?: string;
  onTranscribe?: () => void;
}

export function WhatsAppAudioPlayer({
  mediaUrl,
  durationSeconds = 28,
  isOutgoing = false,
  onTranscribe,
}: WhatsAppAudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [playbackRate, setPlaybackRate] = useState<1 | 1.5 | 2>(1);
  const [showTranscription, setShowTranscription] = useState(false);
  const [transcribedText, setTranscribedText] = useState<string | null>(null);
  const [isTranscribing, setIsTranscribing] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Generate simulated waveform heights
  const [waveformData] = useState(() =>
    Array.from({ length: 28 }, (_, i) => {
      const seed = (i * 37) % 100;
      return 6 + (seed % 20);
    })
  );

  useEffect(() => {
    if (!audioRef.current && mediaUrl) {
      const audio = new Audio(mediaUrl);
      audio.onended = () => {
        setIsPlaying(false);
        setCurrentTime(0);
      };
      audio.ontimeupdate = () => {
        setCurrentTime(audio.currentTime);
      };
      audioRef.current = audio;
    }
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, [mediaUrl]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackRate;
    }
  }, [playbackRate]);

  // Handle simulated progress if no real mediaUrl
  useEffect(() => {
    let timer: any;
    if (isPlaying && !mediaUrl) {
      timer = setInterval(() => {
        setCurrentTime((prev) => {
          if (prev >= durationSeconds) {
            setIsPlaying(false);
            return 0;
          }
          return prev + 0.25 * playbackRate;
        });
      }, 250);
    }
    return () => clearInterval(timer);
  }, [isPlaying, mediaUrl, durationSeconds, playbackRate]);

  const togglePlay = () => {
    if (audioRef.current && mediaUrl) {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        audioRef.current.play().catch(() => {});
        setIsPlaying(true);
      }
    } else {
      setIsPlaying(!isPlaying);
    }
  };

  const handleSeek = (index: number) => {
    const fraction = index / waveformData.length;
    const newTime = fraction * durationSeconds;
    setCurrentTime(newTime);
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
    }
  };

  const toggleSpeed = () => {
    const next = playbackRate === 1 ? 1.5 : playbackRate === 1.5 ? 2 : 1;
    setPlaybackRate(next);
  };

  const handleTranscribe = () => {
    if (transcribedText) {
      setShowTranscription(!showTranscription);
      return;
    }
    setIsTranscribing(true);
    setTimeout(() => {
      setTranscribedText(
        '“Oi! Tudo bem? Vi as fotos do casamento que você postou e ficamos completamente apaixonados! Queríamos muito saber se você tem o dia 15 de novembro disponível e se você faz também o pré-wedding aqui na região.”'
      );
      setIsTranscribing(false);
      setShowTranscription(true);
      if (onTranscribe) onTranscribe();
    }, 1000);
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const progressFraction = Math.min(1, currentTime / (durationSeconds || 1));
  const activeBarsCount = Math.floor(progressFraction * waveformData.length);

  return (
    <div className="space-y-1.5 min-w-[250px] sm:min-w-[280px]">
      <div className="flex items-center gap-3">
        {/* Play/Pause Button */}
        <button
          onClick={togglePlay}
          className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-transform active:scale-95 shadow-md"
          style={{
            background: isOutgoing ? '#00a884' : '#53bdeb',
            color: '#111b21',
          }}
          title={isPlaying ? 'Pausar' : 'Reproduzir'}
        >
          {isPlaying ? (
            <Pause className="w-5 h-5 fill-current" />
          ) : (
            <Play className="w-5 h-5 fill-current ml-0.5" />
          )}
        </button>

        {/* Waveform and Progress */}
        <div className="flex-1 space-y-1">
          <div
            className="flex items-center gap-0.5 h-7 cursor-pointer py-1"
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const clickX = e.clientX - rect.left;
              const fraction = Math.max(0, Math.min(1, clickX / rect.width));
              const barIndex = Math.floor(fraction * waveformData.length);
              handleSeek(barIndex);
            }}
          >
            {waveformData.map((height, i) => {
              const isActive = i <= activeBarsCount;
              return (
                <div
                  key={i}
                  className="flex-1 rounded-full transition-all duration-100"
                  style={{
                    height: `${height}px`,
                    background: isActive
                      ? isOutgoing
                        ? '#00a884'
                        : '#53bdeb'
                      : isOutgoing
                      ? '#2a5b4f'
                      : '#3b4a54',
                    maxWidth: '4px',
                    marginRight: '1px',
                  }}
                />
              );
            })}
          </div>

          <div className="flex items-center justify-between text-[11px] font-mono text-[#8696a0]">
            <span>{formatTime(currentTime)}</span>
            <div className="flex items-center gap-1.5">
              {/* Speed Button */}
              <button
                onClick={toggleSpeed}
                className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#111b21]/40 text-[#00a884] hover:bg-[#111b21]/70 transition"
                title="Velocidade de reprodução"
              >
                {playbackRate}x
              </button>
              <span>{formatTime(durationSeconds)}</span>
              <Mic className="w-3 h-3 text-[#53bdeb]" />
            </div>
          </div>
        </div>
      </div>

      {/* Transcription Button & AI Summary */}
      {!isOutgoing && (
        <div className="pt-1 border-t border-[#8696a0]/15">
          <button
            onClick={handleTranscribe}
            disabled={isTranscribing}
            className="flex items-center gap-1.5 text-[11px] font-medium text-[#53bdeb] hover:underline cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            {isTranscribing
              ? 'Transcrevendo com Whisper IA...'
              : showTranscription
              ? 'Ocultar Transcrição'
              : 'Transcrever Áudio (IA)'}
          </button>

          {showTranscription && transcribedText && (
            <div className="mt-1.5 p-2.5 rounded-lg bg-[#111b21]/70 border border-[#8696a0]/20 text-xs text-[#e9edef] space-y-1.5 animate-in fade-in duration-200">
              <div className="flex items-center justify-between text-[10px] text-[#00a884] font-bold">
                <span className="flex items-center gap-1">
                  <FileText className="w-3 h-3" /> Transcrição Inteligente:
                </span>
                <span>✨ 99% precisão</span>
              </div>
              <p className="italic text-slate-200 leading-relaxed font-sans">{transcribedText}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
